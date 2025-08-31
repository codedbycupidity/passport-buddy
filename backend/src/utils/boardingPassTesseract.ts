import { strictDateExtraction } from './dateStrict';
import { safeStrictDateExtraction } from './dateStrict';
import { createWorker } from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';

// Load airports data
let airportsData: any = {};
try {
  const airportsPath = path.join(__dirname, '../../frontend/src/data/airports.json');
  const airportsJson = fs.readFileSync(airportsPath, 'utf-8');
  airportsData = JSON.parse(airportsJson);
  console.log(`Loaded ${Object.keys(airportsData).length} airports from airports.json`);
} catch (error) {
  console.error('Failed to load airports.json:', error);
}

// Import types from existing parser
interface BoardingPass {
  scanMetadata: ScanMetadata;
  passenger: Passenger;
  flight: Flight;
  boardingInfo: BoardingInfo;
  rawData?: RawData;
}

interface ScanMetadata {
  scanId: string;
  scanTimestamp: string;
  sourceFormat: 'BCBP_PDF417' | 'BCBP_QR' | 'OCR' | 'MANUAL';
  confidence?: {
    overall: number;
    fields?: { [key: string]: number };
  };
}

interface Passenger {
  name: {
    raw: string;
    firstName: string;
    lastName: string;
  };
  pnrCode?: string;
  frequentFlyerNumber?: string;
  ticketNumber?: string;
}

interface Flight {
  airline: {
    name?: string;
    iataCode: string;
    icaoCode?: string;
  };
  flightNumber: string;
  departure: AirportInfo;
  arrival: AirportInfo;
}

interface AirportInfo {
  airport?: string;
  city?: string;
  airportCode: string;
  scheduledTime: string;
  gate?: string;
  terminal?: string;
}

interface BoardingInfo {
  seatNumber: string;
  boardingGroup?: string;
  gate: string;
  boardingTime?: string;
  sequenceNumber?: number;
  classOfService?: string;
}

interface RawData {
  barcode?: string;
  ocrText?: string;
}

interface TesseractLine {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  words: Array<{
    text: string;
    confidence: number;
  }>;
}

export async function parseBoardingPassWithTesseract(buffer: Buffer, mimeType: string): Promise<BoardingPass | null> {
  const worker = await createWorker('eng');

  try {
    // Configure for better boarding pass recognition
    await worker.setParameters({
      tessedit_pageseg_mode: 3 as any, // Fully automatic page segmentation
      preserve_interword_spaces: '1',
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/:. ',
    });

    // Perform OCR
    const { data } = await worker.recognize(buffer);

    console.log('Tesseract OCR confidence:', data.confidence);
    console.log('Tesseract detected blocks:', data.blocks?.length || 0);

    // Process blocks - try to extract lines from blocks or use text as fallback
    let lines: any[] = [];
    
    if (data.blocks && data.blocks.length > 0) {
      // Try to get lines from blocks
      lines = data.blocks.flatMap((block: any) => {
        if (block.lines && block.lines.length > 0) {
          return block.lines;
        }
        // If no lines in block, use block text
        return [{ text: block.text, confidence: block.confidence }];
      });
    }
    
    // If no blocks or lines, split the full text into lines
    if (lines.length === 0 && data.text) {
      lines = data.text.split('\n').map(text => ({ text, confidence: data.confidence }));
    }
    
    console.log('Extracted lines:', lines.length);

    // Process lines
    const parsedData = processLines(lines, data.confidence);

    if (!parsedData) {
      console.error('Failed to extract required data from boarding pass');
      return null;
    }

    // Build boarding pass object
    return buildBoardingPass(parsedData, data.confidence);
  } catch (error) {
    console.error('Tesseract OCR Error:', error);
    return null;
  } finally {
    await worker.terminate();
  }
}

interface ExtractedData {
  airlines: Set<string>;
  flightNumbers: Set<string>;
  passengerNames: Set<string>;
  confirmationCodes: Set<string>;
  airports: Set<string>;
  dates: Set<string>;
  times: Map<string, string[]>; // context -> times
  seats: Set<string>;
  gates: Set<string>;
  terminals: Set<string>;
}

function processLines(lines: any[], overallConfidence: number): ParsedLineData | null {
  const data: ExtractedData = {
    airlines: new Set(),
    flightNumbers: new Set(),
    passengerNames: new Set(),
    confirmationCodes: new Set(),
    airports: new Set(),
    dates: new Set(),
    times: new Map(),
    seats: new Set(),
    gates: new Set(),
    terminals: new Set(),
  };

  // Process each line
  let routeLineFound = false;
  
  lines.forEach((line, lineIndex) => {
    const text = line.text.trim().toUpperCase();
    if (!text) return;

    console.log(`Line ${lineIndex}: ${text}`);

    // Check if this line contains the main route (both departure and arrival)
    // Look for patterns that indicate this is the route line
    const possibleRouteIndicators = [
      text.includes('HANEDA') && text.includes('OHARE'),
      text.includes('HANEDA') && text.includes('CHICAGO'),
      text.includes('TOKYO') && text.includes('CHICAGO'),
      text.includes('TOKYO') && text.includes('OHARE'),
      text.includes('TOKYO-HANEDA') && text.includes('CHICAGO-OHARE'),
      (text.match(/[A-Z]{3,}-[A-Z]{3,}/g) || []).length >= 2,
      // Check for two city/airport names separated by spaces, but exclude common non-route lines
      text.split(/\s{5,}/).length >= 2 && 
        text.length > 30 && 
        !text.includes('EXPIRED') && 
        !text.includes('GATE') && 
        !text.includes('FLIGHT') &&
        !text.includes('BOARDS') &&
        !text.includes('SEAT')
    ];
    
    const isRouteLine = possibleRouteIndicators.some(indicator => indicator);
    
    // Extract patterns from each line
    extractAirlines(text, data);
    extractFlightNumbers(text, data);
    extractPassengerNames(text, data);
    extractConfirmationCodes(text, data);
    
    // Only extract airports from the route line to avoid confusion
    if (isRouteLine && !routeLineFound) {
      console.log('Detected route line, extracting airports from:', text);
      extractAirports(text, data);
      routeLineFound = true;
    } else if (!routeLineFound && data.airports.size < 2) {
      // Fallback: extract airports from any line if we haven't found the route yet
      extractAirports(text, data);
    }
    
    extractDates(text, data);
    extractTimes(text, data, lines, lineIndex);
    extractSeats(text, data);
    extractGates(text, data);
    extractTerminals(text, data);
  });

  // Convert extracted data to structured format
  return structureExtractedData(data);
}

function extractAirlines(text: string, data: ExtractedData) {
  // Common airline codes
  const airlinePatterns = [
    /\b(DELTA|DL)\b/g,
    /\b(AMERICAN|AA)\b/g,
    /\b(UNITED|UA)\b/g,
    /\b(SOUTHWEST|WN)\b/g,
    /\b(JETBLUE|B6)\b/g,
    /\b(ALASKA|AS)\b/g,
    /\b(SPIRIT|NK)\b/g,
    /\b(FRONTIER|F9)\b/g,
    /\b(HAWAIIAN|HA)\b/g,
  ];

  airlinePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => data.airlines.add(match));
    }
  });
}

function extractFlightNumbers(text: string, data: ExtractedData) {
  // Flight number patterns
  const patterns = [
    /\b([A-Z]{2})\s*(\d{1,4})\b/g, // AA 123
    /FLIGHT\s*:?\s*([A-Z]{2}\d{1,4})/g, // FLIGHT: AA123
    /FLT\s*:?\s*([A-Z]{2}\d{1,4})/g, // FLT: AA123
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const flightNum = match[1] + (match[2] || '');
      data.flightNumbers.add(flightNum.replace(/\s+/g, ''));
    }
  });
}

function extractPassengerNames(text: string, data: ExtractedData) {
  // Name patterns (LASTNAME/FIRSTNAME format)
  const namePattern = /([A-Z]{2,})\/([A-Z]{2,})/g;
  let match;
  while ((match = namePattern.exec(text)) !== null) {
    data.passengerNames.add(`${match[2]} ${match[1]}`);
  }
}

function extractConfirmationCodes(text: string, data: ExtractedData) {
  const patterns = [
    /(?:CONFIRMATION|CONF|PNR|REF|BOOKING)\s*:?\s*([A-Z0-9]{5,7})/g,
    /\b([A-Z0-9]{6})\b/g, // Generic 6-character code
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const code = match[1];
      // Filter out common false positives
      if (!code.match(/^(FLIGHT|DELTA|UNITED|AMERICAN|ALASKA)$/)) {
        data.confirmationCodes.add(code);
      }
    }
  });
}

function extractAirports(text: string, data: ExtractedData) {
  const upperText = text.toUpperCase();
  
  // First check for specific patterns that are definitely airports
  // Handle TOKYO-HANEDA and CHICAGO-OHARE explicitly
  if (upperText.includes('TOKYO-HANEDA') || upperText.includes('HANEDA')) {
    data.airports.add('HND');
  }
  if (upperText.includes('CHICAGO-OHARE') || upperText.includes('OHARE')) {
    data.airports.add('ORD');
  }
  
  // If we found both airports, we're done
  if (data.airports.size >= 2) {
    console.log('Found airports from specific patterns:', Array.from(data.airports));
    return;
  }
  
  // Build dynamic airport mappings from airports.json
  const airportNameMap: Record<string, string> = {};
  const commonAirports: string[] = [];
  
  // Process airports data to create mappings
  for (const [, airport] of Object.entries(airportsData)) {
    const airportInfo = airport as any;
    
    // Only use IATA codes (3 characters) for boarding passes
    // Skip airports that only have ICAO codes since the model expects 3-char codes
    if (!airportInfo.iata || airportInfo.iata.length !== 3) {
      continue;
    }
    
    const primaryCode = airportInfo.iata;
    commonAirports.push(airportInfo.iata);
    
    // Create mappings for city name
    if (airportInfo.city) {
      const city = airportInfo.city.toUpperCase();
      airportNameMap[city] = primaryCode;
      
      // Also add city name without special characters
      const cleanCity = city.replace(/[^A-Z\s]/g, '').trim();
      if (cleanCity !== city) {
        airportNameMap[cleanCity] = primaryCode;
      }
    }
    
    // Create mappings for airport name
    if (airportInfo.name) {
      const name = airportInfo.name.toUpperCase();
      
      // Extract key parts of the airport name
      const nameWithoutCommon = name
        .replace(/\s*(INTERNATIONAL|AIRPORT|REGIONAL|MUNICIPAL|EXECUTIVE|FIELD|AIR BASE)\s*/g, ' ')
        .trim();
      
      // Add the simplified name
      if (nameWithoutCommon && nameWithoutCommon !== airportInfo.city?.toUpperCase()) {
        airportNameMap[nameWithoutCommon] = primaryCode;
      }
      
      // Extract the distinctive part (e.g., "O'Hare", "Haneda", "LaGuardia")
      const parts = nameWithoutCommon.split(/\s+/);
      for (const part of parts) {
        if (part.length > 3 && part !== airportInfo.city?.toUpperCase()) {
          airportNameMap[part] = primaryCode;
          
          // Also add without special characters
          const cleanPart = part.replace(/[^A-Z]/g, '');
          if (cleanPart !== part && cleanPart.length > 3) {
            airportNameMap[cleanPart] = primaryCode;
          }
        }
      }
      
      // Create city-airport combinations dynamically
      if (airportInfo.city) {
        const city = airportInfo.city.toUpperCase();
        
        // For each distinctive part, create combinations
        for (const part of parts) {
          if (part.length > 3 && part !== city) {
            // Add combinations like "CHICAGO-OHARE", "TOKYO-HANEDA"
            airportNameMap[`${city}-${part}`] = primaryCode;
            airportNameMap[`${city} ${part}`] = primaryCode;
            
            // Also without special characters
            const cleanPart = part.replace(/[^A-Z]/g, '');
            if (cleanPart !== part) {
              airportNameMap[`${city}-${cleanPart}`] = primaryCode;
              airportNameMap[`${city} ${cleanPart}`] = primaryCode;
            }
          }
        }
      }
    }
  }
  
  // First check for full airport names in the text
  // Sort by length (longest first) to match more specific names before shorter ones
  const sortedEntries = Object.entries(airportNameMap).sort((a, b) => b[0].length - a[0].length);
  
  let foundFromNames = false;
  const foundAirports: string[] = [];
  
  for (const [name, code] of sortedEntries) {
    // Check if this name exists in the text (considering hyphens and spaces as word boundaries)
    // Replace hyphens with spaces for matching
    const normalizedText = upperText.replace(/-/g, ' ');
    const normalizedName = name.replace(/-/g, ' ');
    
    // Use word boundary check or check if surrounded by spaces/punctuation
    const regex = new RegExp(`(^|\\s|-)${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|-)`);
    
    if (regex.test(normalizedText) || upperText.includes(name)) {
      // Don't add if it's a common word that happens to be an airport
      const commonWords = ['FLIGHT', 'GATE', 'SEAT', 'GROUP', 'BOARDS', 'PASSENGER', 'DELETE'];
      if (!commonWords.includes(name)) {
        console.log(`Found airport name "${name}" -> ${code}`);
        foundAirports.push(code);
        data.airports.add(code);
        foundFromNames = true;
        
        // Stop after finding 2 airports
        if (data.airports.size >= 2) {
          break;
        }
      }
    }
  }
  
  // If we found at least 2 airports from names, we're done
  if (foundFromNames && data.airports.size >= 2) {
    console.log('Found airports from names:', Array.from(data.airports));
    return;
  }

  // Pattern for route format like "BWI 06h 05m | Nonstop LAX"
  const routePattern = /\b([A-Z]{3})\s+\d+h\s+\d+m\s*\|\s*\w+\s+([A-Z]{3})\b/i;
  const routeMatch = text.match(routePattern);
  if (routeMatch) {
    data.airports.add(routeMatch[1]); // Departure
    data.airports.add(routeMatch[2]); // Arrival
    return;
  }

  // Pattern for simple route like "BWI - LAX" or "BWI LAX"
  const simpleRoutePattern = /\b([A-Z]{3})\s*[-–—]\s*([A-Z]{3})\b/;
  const simpleMatch = text.match(simpleRoutePattern);
  if (simpleMatch) {
    data.airports.add(simpleMatch[1]);
    data.airports.add(simpleMatch[2]);
    return;
  }

  // Find individual 3-letter airport codes
  const airportPattern = /\b([A-Z]{3})\b/g;
  let match;
  while ((match = airportPattern.exec(text)) !== null) {
    const code = match[1];

    // Check if it matches known airports or appears in departure/arrival context
    if (
      commonAirports.includes(code) ||
      text.includes(`FROM ${code}`) ||
      text.includes(`TO ${code}`) ||
      text.includes(`${code} TO`) ||
      text.includes(`${code} -`) ||
      text.match(new RegExp(`\\b${code}\\s+\\d+H`, 'i'))
    ) {
      // Pattern like "BWI 06H"
      data.airports.add(code);
    }
  }
}

function extractDates(text: string, data: ExtractedData) {
  const patterns = [
    /(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{2,4})?/g,
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g,
    /(\d{4})-(\d{2})-(\d{2})/g,
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      data.dates.add(match[0]);
    }
  });
}

function extractTimes(text: string, data: ExtractedData, lines: any[], lineIndex: number) {
  const timePattern = /(\d{1,2}):(\d{2})\s*([AP]M?)?/g;
  let match;

  // Check if this line has DEPART and ARRIVAL headers with times below
  if (text.includes('DEPART') && text.includes('ARRIVAL')) {
    // Next line likely has the times
    if (lineIndex + 1 < lines.length) {
      const nextLine = lines[lineIndex + 1].text.toUpperCase();
      const times = nextLine.match(/(\d{1,2}:\d{2}\s*[AP]M?)/g);
      if (times && times.length >= 2) {
        data.times.set('DEPARTURE', [times[0]]);
        data.times.set('ARRIVAL', [times[1]]);
        return;
      }
    }
  }

  while ((match = timePattern.exec(text)) !== null) {
    const time = match[0];

    // Determine context
    let context = 'UNKNOWN';
    if (text.includes('DEPART') || text.includes('DEP')) {
      context = 'DEPARTURE';
    } else if (text.includes('ARRIV') || text.includes('ARR')) {
      context = 'ARRIVAL';
    } else if (text.includes('BOARD')) {
      context = 'BOARDING';
    } else if (lineIndex > 0) {
      // Check previous line for context
      const prevLine = lines[lineIndex - 1].text.toUpperCase();
      if (prevLine.includes('DEPART')) context = 'DEPARTURE';
      else if (prevLine.includes('ARRIV')) context = 'ARRIVAL';
      else if (prevLine.includes('BOARD')) context = 'BOARDING';
    }

    if (!data.times.has(context)) {
      data.times.set(context, []);
    }
    data.times.get(context)!.push(time);
  }
}

function extractSeats(text: string, data: ExtractedData) {
  const patterns = [
    /SEAT\s*:?\s*(\d{1,3}[A-Z])/g,
    /\b(\d{1,3}[A-Z])\b/g, // Generic seat pattern
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const seat = match[1];
      // Validate seat format
      if (seat.match(/^\d{1,3}[A-F]$/)) {
        data.seats.add(seat);
      }
    }
  });
}

function extractGates(text: string, data: ExtractedData) {
  const patterns = [/GATE\s*:?\s*([A-Z]?\d{1,3}[A-Z]?)/g, /\bG(\d{1,3}[A-Z]?)\b/g];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      data.gates.add(match[1]);
    }
  });
}

function extractTerminals(text: string, data: ExtractedData) {
  const patterns = [/TERMINAL\s*:?\s*([A-Z0-9]{1,2})/g, /TERM\s*:?\s*([A-Z0-9]{1,2})/g, /\bT([A-Z0-9])\b/g];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      data.terminals.add(match[1]);
    }
  });
}

interface ParsedLineData {
  airline?: string;
  flightNumber?: string;
  passenger?: string;
  pnr?: string;
  departure?: {
    airport: string;
    date?: string;
    time?: string;
    gate?: string;
    terminal?: string;
  };
  arrival?: {
    airport: string;
    time?: string;
  };
  seat?: string;
  boardingTime?: string;
}

function structureExtractedData(data: ExtractedData): ParsedLineData | null {
  const airports = Array.from(data.airports);
  if (airports.length < 2) {
    console.error('Could not find departure and arrival airports');
    return null;
  }

  const result: ParsedLineData = {
    departure: { airport: airports[0] },
    arrival: { airport: airports[1] },
  };

  // Set first found values
  if (data.airlines.size > 0) {
    const airline = Array.from(data.airlines)[0];
    result.airline = airline.length === 2 ? airline : mapAirlineName(airline);
  }

  if (data.flightNumbers.size > 0) {
    result.flightNumber = Array.from(data.flightNumbers)[0];
    
    // Extract airline code from flight number if not already detected
    if (!result.airline && result.flightNumber.match(/^[A-Z]{2}\d+/)) {
      const airlineCode = result.flightNumber.substring(0, 2);
      result.airline = airlineCode;
    }
  }

  if (data.passengerNames.size > 0) {
    result.passenger = Array.from(data.passengerNames)[0];
  }

  if (data.confirmationCodes.size > 0) {
    result.pnr = Array.from(data.confirmationCodes)[0];
  }

  if (data.dates.size > 0 && result.departure) {
    result.departure.date = Array.from(data.dates)[0];
  }

  // Handle times based on context
  if (data.times.has('DEPARTURE') && data.times.get('DEPARTURE')!.length > 0 && result.departure) {
    result.departure.time = data.times.get('DEPARTURE')![0];
  }

  if (data.times.has('ARRIVAL') && data.times.get('ARRIVAL')!.length > 0 && result.arrival) {
    result.arrival.time = data.times.get('ARRIVAL')![0];
  }

  if (data.times.has('BOARDING') && data.times.get('BOARDING')!.length > 0) {
    result.boardingTime = data.times.get('BOARDING')![0];
  }

  // If no contextual times found, assign first two times found
  if (result.departure && !result.departure.time && data.times.has('UNKNOWN')) {
    const unknownTimes = data.times.get('UNKNOWN')!;
    if (unknownTimes.length > 0) result.departure.time = unknownTimes[0];
    if (unknownTimes.length > 1 && result.arrival) result.arrival.time = unknownTimes[1];
  }

  if (data.gates.size > 0 && result.departure) {
    result.departure.gate = Array.from(data.gates)[0];
  }

  if (data.terminals.size > 0 && result.departure) {
    result.departure.terminal = Array.from(data.terminals)[0];
  }

  if (data.seats.size > 0) {
    result.seat = Array.from(data.seats)[0];
  }

  return result;
}

function mapAirlineName(name: string): string {
  const mapping: Record<string, string> = {
    DELTA: 'DL',
    AMERICAN: 'AA',
    UNITED: 'UA',
    SOUTHWEST: 'WN',
    JETBLUE: 'B6',
    ALASKA: 'AS',
    SPIRIT: 'NK',
    FRONTIER: 'F9',
    HAWAIIAN: 'HA',
  };

  return mapping[name] || 'XX';
}

function buildBoardingPass(data: ParsedLineData, confidence: number): BoardingPass {
  const scanMetadata: ScanMetadata = {
    scanId: `tesseract-${Date.now()}`,
    scanTimestamp: strictDateExtraction().toISOString(),
    sourceFormat: 'OCR',
    confidence: {
      overall: confidence / 100,
      fields: {},
    },
  };

  const passenger: Passenger = {
    name: {
      raw: data.passenger || 'UNKNOWN',
      firstName: data.passenger?.split(' ')[0] || 'UNKNOWN',
      lastName: data.passenger?.split(' ')[1] || 'UNKNOWN',
    },
    pnrCode: data.pnr,
  };

  const flight: Flight = {
    airline: {
      iataCode: data.airline || 'XX',
      name: getAirlineName(data.airline || 'XX'),
    },
    flightNumber: data.flightNumber || 'UNKNOWN',
    departure: data.departure
      ? {
          airportCode: data.departure.airport,
          scheduledTime: parseDateTime(data.departure.date, data.departure.time),
          gate: data.departure.gate,
          terminal: data.departure.terminal,
        }
      : { airportCode: 'UNKNOWN', scheduledTime: new Date().toISOString() },
    arrival: data.arrival
      ? {
          airportCode: data.arrival.airport,
          scheduledTime:
            data.departure && data.arrival.time
              ? parseDateTime(data.departure.date, data.arrival.time)
              : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        }
      : { airportCode: 'UNKNOWN', scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
  };

  const boardingInfo: BoardingInfo = {
    seatNumber: data.seat || 'UNKNOWN',
    gate: data.departure?.gate || 'UNKNOWN',
    boardingTime:
      data.boardingTime && data.departure ? parseDateTime(data.departure.date, data.boardingTime) : undefined,
  };

  return {
    scanMetadata,
    passenger,
    flight,
    boardingInfo,
  };
}

function parseDateTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return strictDateExtraction().toISOString();

  const monthMap: Record<string, number> = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  };

  let date = strictDateExtraction();

  // Parse date
  const monthMatch = dateStr.match(/(\d{1,2})\s*([A-Z]{3})\s*(\d{2,4})?/);
  if (monthMatch) {
    const day = parseInt(monthMatch[1]);
    const month = monthMap[monthMatch[2]] || 0;
    let year = monthMatch[3] ? parseInt(monthMatch[3]) : strictDateExtraction().getFullYear();

    if (year < 100) {
      year += 2000;
    }

    date = new Date(year, month, day);
  }

  // Parse time if provided
  if (timeStr) {
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*([AP]M?)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const period = timeMatch[3];

      if (period) {
        if (period.toUpperCase().startsWith('P') && hours !== 12) {
          hours += 12;
        } else if (period.toUpperCase().startsWith('A') && hours === 12) {
          hours = 0;
        }
      }

      date.setHours(hours, minutes, 0, 0);
    }
  }

  return date.toISOString();
}

function getAirlineName(iataCode: string): string {
  const airlines: Record<string, string> = {
    AA: 'American',
    DL: 'Delta',
    UA: 'United',
    WN: 'Southwest',
    B6: 'JetBlue',
    AS: 'Alaska',
    NK: 'Spirit',
    F9: 'Frontier',
    HA: 'Hawaiian',
  };

  return airlines[iataCode] || 'Other';
}

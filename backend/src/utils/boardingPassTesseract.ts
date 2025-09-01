import { strictDateExtraction } from './dateStrict';
import { safeStrictDateExtraction } from './dateStrict';
import { createWorker } from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';

// Load airports data
let airportsData: any = {};
try {
  const airportsPath = path.join(__dirname, '../data/airports.json');
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
    
    // Log the full extracted text for debugging
    console.log('\n========================================');
    console.log('=== TESSERACT OCR - EXTRACTED TEXT ===');
    console.log('========================================');
    console.log(data.text);
    console.log('========================================');
    console.log('=== END OF TESSERACT EXTRACTED TEXT ===');
    console.log('========================================\n');

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
    // Dynamic route detection - check if text contains airport/city patterns from airports.json
    let hasAirportPatterns = false;
    let cityCount = 0;
    let airportCodeCount = 0;
    
    // Count IATA codes in the line
    const iataMatches = (text.match(/\b[A-Z]{3}\b/g) || []);
    for (const code of iataMatches) {
      // Check if it's a valid airport code
      for (const [, airport] of Object.entries(airportsData)) {
        const airportInfo = airport as any;
        if (airportInfo.iata === code) {
          airportCodeCount++;
          break;
        }
      }
    }
    
    // Count city names and airport name patterns
    for (const [, airport] of Object.entries(airportsData)) {
      const airportInfo = airport as any;
      if (!airportInfo.city || !airportInfo.name) continue;
      
      const city = airportInfo.city.toUpperCase();
      const airportName = airportInfo.name.toUpperCase();
      
      // Check for city names (including multi-word cities)
      if (text.includes(city)) {
        cityCount++;
      }
      
      // Check for airport name patterns (INTERNATIONAL, INTL, etc.)
      const airportWords = airportName.split(' ');
      for (const word of airportWords) {
        if (word.length > 4 && text.includes(word) && 
            !['AIRPORT', 'FIELD', 'REGIONAL', 'MUNICIPAL', 'COUNTY'].includes(word)) {
          hasAirportPatterns = true;
          break;
        }
      }
      
      if (hasAirportPatterns && cityCount > 0) break;
    }
    
    // First, exclude lines that are clearly NOT route lines
    const excludePatterns = [
      // Airline names with flight numbers
      /^[A-Z]*DELTA|^DELTA|^ADELTA|^UNITED|^AMERICAN|^SOUTHWEST/,
      // Lines with only flight info (no route)
      /^(DL|UA|AA|WN|B6|AS|F9|NK)\d+/,
      // Lines that contain mostly non-route elements
      /\b(EXPIRED|GATE|FLIGHT|BOARDS|SEAT|TERMINAL|BAGGAGE|CHECK|TIME|DATE|AM|PM|ALL|CARRY|BAGS|CHECKED|BOARDING|CLOSES|DEPART|ARRIVAL|APPLE|WALLET|HOME)\b/
    ];
    
    // If line matches any exclude pattern, it's not a route line
    const isExcluded = excludePatterns.some(pattern => pattern.test(text));
    
    const possibleRouteIndicators = [
      // Flight duration patterns with airport codes (BWI 06H 05M NONSTOP LAX)
      /\b[A-Z]{3}\s+\d{2}H\s+\d{2}M.*\b[A-Z]{3}\b/g.test(text),
      // Airport code patterns with "NONSTOP" (BWI NONSTOP LAX)
      /\b[A-Z]{3}\s.*NONSTOP.*\b[A-Z]{3}\b/g.test(text),
      // Direct airport-to-airport patterns (JFK - SFO, BWI LAX, etc.)
      /\b[A-Z]{3}\s*[-–→]\s*[A-Z]{3}\b/g.test(text),
      /\b[A-Z]{3}\s+[A-Z]{3}\b/g.test(text) && text.length < 50 && !/\b(ZONE|SEAT|GATE|TERMINAL)\b/.test(text),
      // Multiple airport codes in one line
      airportCodeCount >= 2,
      // Multiple cities in one line  
      cityCount >= 2,
      // Airport name patterns with city names
      hasAirportPatterns && cityCount >= 1,
      // Check for airport/city name patterns with INTL, INTERNATIONAL, etc.
      /\b[A-Z]{4,}\s+(INTL?|INTERNATIONAL)\b/g.test(text) && cityCount >= 1,
      // Special pattern for "CITY INTL" followed by spaces and another city
      /\b[A-Z]{3,}\s+INTL?\s+.*\s+[A-Z]{3,}/g.test(text) && !text.includes('FLIGHT'),
      // Pattern for lines with cities separated by spaces (ORLANDO INTL ... LOS ANGELES)
      cityCount >= 2 && text.split(/\s{2,}/).length >= 2 && text.length > 25
    ];
    
    const isRouteLine = !isExcluded && possibleRouteIndicators.some(indicator => indicator);
    
    // Extract patterns from each line
    extractAirlines(text, data);
    extractFlightNumbers(text, data);
    extractPassengerNames(text, data);
    extractConfirmationCodes(text, data);
    
    // Only extract airports from the route line to avoid confusion
    if (isRouteLine && !routeLineFound) {
      console.log('=== Route Line Detection ===');
      console.log('Line:', text);
      console.log('Airport code count:', airportCodeCount);
      console.log('City count:', cityCount);
      console.log('Has airport patterns:', hasAirportPatterns);
      console.log('Is excluded:', isExcluded);
      console.log('Extracting airports from this line');
      console.log('===========================');
      extractAirports(text, data);
      routeLineFound = true;
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
  
  console.log(`Debug: Looking for airports in text: "${upperText}"`);
  
  // PRIORITY 1: Look for valid 3-letter IATA codes first (context-aware)
  const iataPattern = /\b([A-Z]{3})\b/g;
  const potentialCodes = [...upperText.matchAll(iataPattern)].map(m => ({ code: m[1], index: m.index! }));
  
  // First, identify multi-word city patterns to exclude their parts from IATA detection
  const multiWordCityPatterns = [];
  for (const [, airport] of Object.entries(airportsData)) {
    const airportInfo = airport as any;
    if (!airportInfo.iata || !airportInfo.city) continue;
    
    const city = airportInfo.city.toUpperCase();
    if (city.includes(' ') && upperText.includes(city)) {
      const cityStart = upperText.indexOf(city);
      const cityEnd = cityStart + city.length;
      multiWordCityPatterns.push({ start: cityStart, end: cityEnd, city, iata: airportInfo.iata });
    }
  }
  
  // Validate each potential IATA code against airports.json, but skip if it's part of a multi-word city
  for (const { code, index } of potentialCodes) {
    // Skip codes that are clearly not airports (expanded list)
    if (['THE', 'AND', 'FOR', 'ARE', 'NOT', 'ALL', 'CAN', 'HAS', 'HAD', 'WAS', 'BUT', 'OUR', 'OUT', 'DAY', 'YOU', 'YES', 'NEW', 'OLD', 'BIG', 'BAD', 'TOP', 'END', 'GET', 'SET', 'PUT', 'RUN', 'SEE', 'WIN', 'USE'].includes(code)) {
      continue;
    }
    
    // Skip if this IATA code is part of a multi-word city (e.g., "LOS" in "LOS ANGELES")
    const isPartOfMultiWordCity = multiWordCityPatterns.some(pattern => 
      index >= pattern.start && index + code.length <= pattern.end
    );
    
    if (isPartOfMultiWordCity) {
      console.log(`Skipping IATA code "${code}" as it's part of a multi-word city name`);
      continue;
    }
    
    // Check if this code exists in our airports data
    for (const [, airport] of Object.entries(airportsData)) {
      const airportInfo = airport as any;
      if (airportInfo.iata === code) {
        data.airports.add(code);
        console.log(`Found valid IATA code: ${code} (${airportInfo.city})`);
        if (data.airports.size >= 2) {
          console.log('Found airports from IATA codes:', Array.from(data.airports));
          return;
        }
        break;
      }
    }
  }
  
  // Return early if we found 2 airports from IATA codes
  if (data.airports.size >= 2) {
    return;
  }
  
  // Special handling for city-airport name combinations dynamically
  for (const [, airport] of Object.entries(airportsData)) {
    const airportInfo = airport as any;
    if (!airportInfo.iata || !airportInfo.name || !airportInfo.city) continue;
    
    const city = airportInfo.city.toUpperCase();
    const airportName = airportInfo.name.toUpperCase();
    
    // Look for patterns like "NYC-KENNEDY", "SAN-FRANCISCO", etc.
    const cityParts = city.split(' ');
    const airportParts = airportName.split(' ');
    
    for (const cityPart of cityParts) {
      for (const airportPart of airportParts) {
        if (cityPart.length > 2 && airportPart.length > 4) {
          const pattern1 = `${cityPart}-${airportPart}`;
          const pattern2 = `${cityPart} ${airportPart}`;
          
          if (upperText.includes(pattern1) || upperText.includes(pattern2)) {
            console.log(`Found dynamic city-airport pattern "${pattern1}" -> ${airportInfo.iata}`);
            data.airports.add(airportInfo.iata);
            if (data.airports.size >= 2) {
              console.log('Found airports from dynamic patterns:', Array.from(data.airports));
              return;
            }
          }
        }
      }
    }
  }
  
  // PRIORITY 2: Add airports from identified multi-word city patterns
  for (const pattern of multiWordCityPatterns) {
    console.log(`Found multi-word city "${pattern.city}" pattern, adding ${pattern.iata}`);
    data.airports.add(pattern.iata);
    if (data.airports.size >= 2) {
      console.log('Found airports from multi-word city names:', Array.from(data.airports));
      return;
    }
  }
  
  // PRIORITY 2.5: Check for single-word parts of cities that weren't caught by multi-word detection
  // But only if they're not already part of a multi-word city we found
  const singleWordCityPatterns = [];
  for (const [, airport] of Object.entries(airportsData)) {
    const airportInfo = airport as any;
    if (!airportInfo.iata || !airportInfo.city) continue;
    
    const city = airportInfo.city.toUpperCase();
    // Check if city has multiple words and if the first word appears in text
    if (city.includes(' ')) {
      const firstWord = city.split(' ')[0];
      // Only match if it's a whole word, not part of another word
      // Use word boundary check to avoid matching "EL" in "ADELTA"
      const wordPattern = new RegExp(`\\b${firstWord}\\b`);
      if (wordPattern.test(upperText) && !upperText.includes(city)) {
        // Only add if it's not already covered by multi-word detection
        // And only if the first word is substantial (not just "EL", "LA", etc.)
        const alreadyCovered = multiWordCityPatterns.some(pattern => pattern.city === city);
        if (!alreadyCovered && firstWord.length > 2) {
          singleWordCityPatterns.push({ word: firstWord, iata: airportInfo.iata, city });
        }
      }
    }
  }
  
  // Add airports from single-word city patterns (like "ORLANDO" for "Orlando International")
  for (const pattern of singleWordCityPatterns) {
    console.log(`Found single-word city "${pattern.word}" from "${pattern.city}", adding ${pattern.iata}`);
    data.airports.add(pattern.iata);
    if (data.airports.size >= 2) {
      console.log('Found airports from single-word city names:', Array.from(data.airports));
      return;
    }
  }
  
  // PRIORITY 3: Build city-to-airport mapping and check single-word cities
  const cityToAirports: Map<string, Array<{code: string, priority: number}>> = new Map();
  
  for (const [, airport] of Object.entries(airportsData)) {
    const airportInfo = airport as any;
    if (!airportInfo.iata || !airportInfo.city) continue;
    
    const city = airportInfo.city.toUpperCase();
    if (!cityToAirports.has(city)) {
      cityToAirports.set(city, []);
    }
    
    // Prioritize international airports and major hubs
    let priority = 0;
    const name = (airportInfo.name || '').toUpperCase();
    if (name.includes('INTERNATIONAL')) priority += 10;
    if (name.includes('REGIONAL') || name.includes('MUNICIPAL')) priority -= 5;
    
    cityToAirports.get(city)?.push({
      code: airportInfo.iata,
      priority
    });
  }
  
  // Sort airports by priority for each city
  for (const airports of cityToAirports.values()) {
    airports.sort((a, b) => b.priority - a.priority);
  }
  
  // Look for single-word city names
  const words = upperText.split(/\s+/);
  console.log('Looking for single-word cities in words:', words);
  for (const word of words) {
    // Skip INTL as it's not a city, it's part of airport names
    if (word === 'INTL' || word === 'INTERNATIONAL') continue;
    
    if (cityToAirports.has(word)) {
      const airports = cityToAirports.get(word);
      if (airports && airports.length > 0) {
        const bestAirport = airports[0].code;
        data.airports.add(bestAirport);
        console.log(`Found city "${word}" -> ${bestAirport} (priority: ${airports[0].priority})`);
        if (data.airports.size >= 2) {
          console.log('Found airports from city names:', Array.from(data.airports));
          return;
        }
      }
    }
  }
  
  for (const [, airport] of Object.entries(airportsData)) {
    const airportInfo = airport as any;
    if (!airportInfo.iata || !airportInfo.name) continue;
    
    const airportName = airportInfo.name.toUpperCase();
    const city = (airportInfo.city || '').toUpperCase();
    
    // Look for patterns like "NYC-KENNEDY", "KENNEDY", etc.
    if (airportName.includes('KENNEDY') && (upperText.includes('KENNEDY') || upperText.includes('NYC-KENNEDY'))) {
      // Prioritize JFK when NYC-KENNEDY is mentioned, or when it's in a major metropolitan context
      if (airportInfo.iata === 'JFK' && (upperText.includes('NYC-KENNEDY') || upperText.includes('NEW YORK'))) {
        data.airports.add(airportInfo.iata);
        console.log(`Found NYC Kennedy pattern in "${airportName}" -> ${airportInfo.iata} (prioritized)`);
        if (data.airports.size >= 2) {
          console.log('Found airports from name patterns:', Array.from(data.airports));
          return;
        }
      } else if (!upperText.includes('NYC-KENNEDY') && !upperText.includes('NEW YORK')) {
        // Only consider other Kennedy airports if NYC context is not present
        data.airports.add(airportInfo.iata);
        console.log(`Found Kennedy pattern in "${airportName}" -> ${airportInfo.iata}`);
        if (data.airports.size >= 2) {
          console.log('Found airports from name patterns:', Array.from(data.airports));
          return;
        }
      }
    }
    
    // Look for city + abbreviated airport type patterns (ORLANDO INTL, ORLANDO INTERNATIONAL, etc.)
    if (city && (airportName.includes('INTERNATIONAL') || airportName.includes('INTL'))) {
      const cityIntlPattern = `${city} INT`;
      const cityIntlPattern2 = `${city} INTL`;
      const cityIntlPattern3 = `${city} INTERNATIONAL`;
      
      // Check if any pattern matches
      if (upperText.includes(cityIntlPattern) || upperText.includes(cityIntlPattern2) || upperText.includes(cityIntlPattern3)) {
        // Prioritize major international airports (MCO for Orlando, LAX for Los Angeles, etc.)
        if (airportName.includes('ORLANDO INTERNATIONAL') && airportInfo.iata === 'MCO') {
          data.airports.add(airportInfo.iata);
          console.log(`Found ${city} International pattern -> ${airportInfo.iata} (Orlando International)`);
          if (data.airports.size >= 2) {
            console.log('Found airports from name patterns:', Array.from(data.airports));
            return;
          }
        } else if (!airportName.includes('EXECUTIVE') && !airportName.includes('NORTH')) {
          // Add other international airports but skip executive/small airports
          data.airports.add(airportInfo.iata);
          console.log(`Found ${city} International pattern -> ${airportInfo.iata}`);
          if (data.airports.size >= 2) {
            console.log('Found airports from name patterns:', Array.from(data.airports));
            return;
          }
        }
      }
    }
    
  }
  
  console.log(`Debug: After all pattern matching, found ${data.airports.size} airports:`, Array.from(data.airports));
  
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
  
  // Known airline names to exclude from airport matching
  const airlineNames = [
    'SPIRIT', 'UNITED', 'AMERICAN', 'DELTA', 'SOUTHWEST', 'JETBLUE', 'ALASKA',
    'FRONTIER', 'HAWAIIAN', 'ALLEGIANT', 'SUN COUNTRY', 'BREEZE', 'AVELO',
    'AIR CANADA', 'WESTJET', 'BRITISH AIRWAYS', 'LUFTHANSA', 'AIR FRANCE',
    'KLM', 'EMIRATES', 'QATAR', 'SINGAPORE', 'CATHAY', 'ANA', 'JAL',
    'VIRGIN', 'RYANAIR', 'EASYJET', 'VUELING', 'IBERIA', 'TAP', 'TURKISH'
  ];
  
  for (const [name, code] of sortedEntries) {
    // Skip if this is an airline name
    if (airlineNames.some(airline => name.includes(airline))) {
      continue;
    }
    
    // Skip single word matches that are too generic
    if (name.length <= 6 && !name.includes('-') && !name.includes(' ')) {
      // Only accept short names if they're actual IATA codes found in the text
      // Escape special regex characters in the name
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const iataPattern = new RegExp(`\\b${escapedName}\\b`);
      if (!iataPattern.test(upperText)) {
        continue;
      }
    }
    
    // Check if this name exists in the text (considering hyphens and spaces as word boundaries)
    // Replace hyphens with spaces for matching
    const normalizedText = upperText.replace(/-/g, ' ');
    const normalizedName = name.replace(/-/g, ' ');
    
    // Use word boundary check or check if surrounded by spaces/punctuation
    const regex = new RegExp(`(^|\\s|-)${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|-)`);
    
    if (regex.test(normalizedText)) {
      // Don't add if it's a common word that happens to be an airport
      const commonWords = ['FLIGHT', 'GATE', 'SEAT', 'GROUP', 'BOARDS', 'PASSENGER', 'DELETE', 'AIRLINES', 'AIRWAYS'];
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

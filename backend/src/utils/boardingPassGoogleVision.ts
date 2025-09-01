import * as vision from '@google-cloud/vision';
import * as fs from 'fs';
import * as path from 'path';

// Load airlines data dynamically and index by IATA code
let airlinesData: any[] = [];
const airlinesByIATA: any = {};
const airlinesByICAO: any = {};

// Load airports data dynamically and index by IATA code
let airportsData: any = {};
const airportsByIATA: any = {};
// Load airlines data
try {
  const airlinesPath = path.join(__dirname, '../data/airlines.json');
  const airlinesJson = fs.readFileSync(airlinesPath, 'utf-8');
  airlinesData = JSON.parse(airlinesJson);
  
  // Create IATA and ICAO indexed lookups for airlines
  for (const airline of airlinesData) {
    if (airline.iata_code) {
      airlinesByIATA[airline.iata_code] = airline;
    }
    if (airline.icao_code) {
      airlinesByICAO[airline.icao_code] = airline;
    }
  }
  
  console.log(`Loaded ${airlinesData.length} airlines, ${Object.keys(airlinesByIATA).length} with IATA codes`);
} catch (error) {
  console.error('Failed to load airlines.json:', error);
}

// Load airports data
try {
  const airportsPath = path.join(__dirname, '../data/airports.json');
  const airportsJson = fs.readFileSync(airportsPath, 'utf-8');
  airportsData = JSON.parse(airportsJson);
  
  // Create IATA-indexed lookup
  for (const [key, airport] of Object.entries(airportsData)) {
    if (airport && typeof airport === 'object' && 'iata' in airport) {
      const iataCode = (airport as any).iata;
      if (iataCode && iataCode.length === 3) {
        airportsByIATA[iataCode] = airport;
      }
    }
  }
  
  console.log(`Loaded ${Object.keys(airportsData).length} airports, ${Object.keys(airportsByIATA).length} with IATA codes`);
} catch (error) {
  console.error('Failed to load airports.json:', error);
}

// Type definition for boarding pass data
interface BoardingPassData {
  airline: string | null;
  flightNumber: string | null;
  origin: {
    airportCode: string | null;
    city: string | null;
    country: string | null;
  };
  destination: {
    airportCode: string | null;
    city: string | null;
    country: string | null;
  };
  departureTime: string | null;
  arrivalTime: string | null;
  confirmationCode: string | null;
  boardingInfo: {
    gate: string | null;
    seat: string | null;
  };
  scheduledDepartureTime: Date | null;
  scheduledArrivalTime: Date | null;
}

// Initialize the Google Cloud Vision client
let visionClient: vision.ImageAnnotatorClient | null = null;

function initializeVisionClient(): vision.ImageAnnotatorClient | null {
  if (!visionClient) {
    const credentialsString = process.env.GOOGLE_CLOUD_VISION_CREDENTIALS;
    
    if (!credentialsString) {
      console.error('Google Cloud Vision credentials not found in environment variables');
      return null;
    }
    
    try {
      // Parse the credentials from the environment variable
      const credentials = JSON.parse(credentialsString);
      
      // Fix the private key newlines (convert \\n to actual newlines)
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }
      
      visionClient = new vision.ImageAnnotatorClient({
        credentials: credentials,
        projectId: credentials.project_id
      });
      
      console.log('Google Cloud Vision client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Cloud Vision client:', error);
      return null;
    }
  }
  
  return visionClient;
}

export async function parseWithGoogleVision(imageBuffer: Buffer): Promise<BoardingPassData | null> {
  console.log('Starting Google Cloud Vision OCR processing...');
  
  const client = initializeVisionClient();
  if (!client) {
    console.error('Google Cloud Vision client not available');
    return null;
  }
  
  try {
    // Perform text detection on the image
    console.log('Sending image to Google Cloud Vision API...');
    const [result] = await client.textDetection({
      image: {
        content: imageBuffer.toString('base64')
      }
    });
    
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      console.log('No text detected by Google Cloud Vision');
      return null;
    }
    
    // The first annotation contains the entire text
    const fullText = detections[0].description || '';
    
    console.log('\n========================================');
    console.log('=== GOOGLE VISION - EXTRACTED TEXT ===');
    console.log('========================================');
    console.log(fullText);
    console.log('========================================');
    console.log('=== END OF GOOGLE VISION TEXT ===');
    console.log('========================================\n');
    
    // Also perform document text detection for better structured text
    const [documentResult] = await client.documentTextDetection({
      image: {
        content: imageBuffer.toString('base64')
      }
    });
    
    const documentText = documentResult.fullTextAnnotation;
    if (documentText && documentText.text) {
      console.log('\n========================================');
      console.log('=== GOOGLE VISION - DOCUMENT TEXT ===');
      console.log('========================================');
      console.log(documentText.text);
      console.log('========================================');
      console.log('=== END OF DOCUMENT TEXT ===');
      console.log('========================================\n');
      
      // Parse the structured document text
      return parseDocumentText(documentText.text);
    }
    
    // Fallback to parsing the regular text detection
    return parseExtractedText(fullText);
    
  } catch (error) {
    console.error('Google Cloud Vision OCR error:', error);
    return null;
  }
}

function parseDocumentText(text: string): BoardingPassData | null {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const upperText = text.toUpperCase();
  
  console.log('Parsing document text with', lines.length, 'lines');
  
  const data: BoardingPassData = {
    airline: null,
    flightNumber: null,
    origin: {
      airportCode: null,
      city: null,
      country: null
    },
    destination: {
      airportCode: null,
      city: null,
      country: null
    },
    departureTime: null,
    arrivalTime: null,
    confirmationCode: null,
    boardingInfo: {
      gate: null,
      seat: null
    },
    scheduledDepartureTime: null,
    scheduledArrivalTime: null
  };
  
  // Don't extract passenger name
  
  // Extract flight number
  const flightPatterns = [
    /\b([A-Z]{2})\s*(\d{1,4})\b/g,  // AA 1234
    /\b([A-Z]{2})(\d{1,4})\b/g,      // AA1234
    /FLIGHT\s+([A-Z]{2}\s*\d{1,4})/i
  ];
  
  for (const pattern of flightPatterns) {
    const matches = upperText.match(pattern);
    if (matches) {
      const flightMatch = matches[0].match(/([A-Z]{2})\s*(\d{1,4})/);
      if (flightMatch) {
        data.airline = getAirlineName(flightMatch[1]);
        data.flightNumber = flightMatch[1] + flightMatch[2];
        console.log('Found flight:', data.flightNumber, 'Airline:', data.airline);
        break;
      }
    }
  }
  
  // Extract airports - look for IATA codes
  const airportCodes: string[] = [];
  const iataPattern = /\b[A-Z]{3}\b/g;
  const iataMatches = upperText.match(iataPattern) || [];
  
  // Find valid airport codes and match them with cities in the text
  const validCodes = [];
  const skipPatterns = ['TSA', 'PRE', 'TM']; // Common false positives
  
  for (const code of iataMatches) {
    if (airportsByIATA[code] && !skipPatterns.includes(code)) {
      const airport = airportsByIATA[code];
      const cityName = airport.city?.toUpperCase();
      
      // Check if the city name appears in the text
      let cityScore = 0;
      if (cityName) {
        if (upperText.includes(cityName)) cityScore += 10;
        // Check for partial city matches (e.g., "LOS ANGELES" contains "ANGELES")
        const cityWords = cityName.split(' ');
        for (const word of cityWords) {
          if (word.length > 3 && upperText.includes(word)) {
            cityScore += 5;
          }
        }
      }
      
      validCodes.push({ code, cityScore, airport });
    }
  }
  
  // Sort by city score (highest first) and position in text (earlier first)
  validCodes.sort((a, b) => {
    if (b.cityScore !== a.cityScore) return b.cityScore - a.cityScore;
    // If same score, prefer the one that appears first in the text
    const aPos = upperText.indexOf(a.code);
    const bPos = upperText.indexOf(b.code);
    return aPos - bPos;
  });
  
  // Take the first two codes in order they appear in text (origin first, destination second)
  const selectedCodes = validCodes.slice(0, 2).map(item => item.code);
  if (selectedCodes.length === 2) {
    const pos1 = upperText.indexOf(selectedCodes[0]);
    const pos2 = upperText.indexOf(selectedCodes[1]);
    // Ensure origin comes first in the text
    if (pos1 < pos2) {
      airportCodes.push(selectedCodes[0], selectedCodes[1]);
    } else {
      airportCodes.push(selectedCodes[1], selectedCodes[0]);
    }
  } else {
    airportCodes.push(...selectedCodes);
  }
  
  // Look for city names if we don't have enough airport codes
  // Search through all airports for city name matches
  if (airportCodes.length < 2) {
    for (const [code, airport] of Object.entries(airportsData)) {
      if (airport && typeof airport === 'object' && 'city' in airport) {
        const cityName = (airport as any).city?.toUpperCase();
        if (cityName && upperText.includes(cityName) && !airportCodes.includes(code)) {
          if (code.length === 3) {
            airportCodes.push(code);
            console.log('Found city', cityName, '-> airport code:', code);
          } else {
            console.log('Skipping invalid airport code from city search:', code, 'for city:', cityName);
          }
          if (airportCodes.length >= 2) break;
        }
      }
    }
  }
  
  // Assign origin and destination
  if (airportCodes.length >= 2) {
    // Validate airport codes are exactly 3 characters
    const validOrigin = airportCodes[0].length === 3 ? airportCodes[0] : null;
    const validDest = airportCodes[1].length === 3 ? airportCodes[1] : null;
    
    console.log('Assigning airport codes - Origin:', validOrigin, 'Destination:', validDest);
    
    data.origin.airportCode = validOrigin;
    data.destination.airportCode = validDest;
    
    // Set city names from dynamic airport data
    const originAirport = data.origin.airportCode ? airportsByIATA[data.origin.airportCode] : null;
    const destAirport = data.destination.airportCode ? airportsByIATA[data.destination.airportCode] : null;
    
    data.origin.city = originAirport?.city || data.origin.airportCode || 'Unknown';
    data.origin.country = originAirport?.country || null;
    data.destination.city = destAirport?.city || data.destination.airportCode || 'Unknown';
    data.destination.country = destAirport?.country || null;
    
    console.log('Route:', data.origin.airportCode, '->', data.destination.airportCode);
  }
  
  // Extract gate
  const gatePattern = /GATE\s+([A-Z]?\d{1,3}[A-Z]?)/i;
  const gateMatch = upperText.match(gatePattern);
  if (gateMatch) {
    data.boardingInfo.gate = gateMatch[1];
    console.log('Found gate:', data.boardingInfo.gate);
  }
  
  // Extract seat
  const seatPattern = /SEAT\s+(\d{1,3}[A-Z])/i;
  const seatMatch = upperText.match(seatPattern);
  if (seatMatch) {
    data.boardingInfo.seat = seatMatch[1];
    console.log('Found seat:', data.boardingInfo.seat);
  } else {
    // Look for standalone seat pattern
    const standaloneSeat = /\b(\d{1,3}[A-Z])\b/g;
    const seatMatches = upperText.match(standaloneSeat);
    if (seatMatches) {
      for (const seat of seatMatches) {
        if (/^\d{1,3}[A-F]$/.test(seat)) {
          data.boardingInfo.seat = seat;
          console.log('Found seat:', data.boardingInfo.seat);
          break;
        }
      }
    }
  }
  
  // Don't extract zone
  
  // Don't extract times - causes issues with date parsing
  
  // Extract confirmation code (6 character alphanumeric)
  const confirmationPattern = /\b[A-Z0-9]{6}\b/g;
  const confirmationMatches = upperText.match(confirmationPattern) || [];
  if (confirmationMatches.length > 0) {
    // Skip common false positives
    const skipPatterns = ['DELTA', 'UNITED', 'AMERICAN', 'FLIGHT', 'DELETE', 'UNHIDE'];
    for (const conf of confirmationMatches) {
      let isValid = true;
      for (const skip of skipPatterns) {
        if (skip.includes(conf) || conf.includes('DELETE')) {
          isValid = false;
          break;
        }
      }
      if (isValid) {
        data.confirmationCode = conf || null;
        break;
      }
    }
  }
  
  return data;
}

function parseExtractedText(text: string): BoardingPassData | null {
  // Fallback to simple text parsing if document parsing fails
  return parseDocumentText(text);
}

function getAirlineName(code: string): string | null {
  // First try IATA code lookup
  const upperCode = code.toUpperCase();
  const airline = airlinesByIATA[upperCode];
  if (airline) {
    return airline.name;
  }
  
  // Try ICAO code as fallback (3-letter codes)
  const icaoAirline = airlinesByICAO[upperCode];
  if (icaoAirline) {
    return icaoAirline.name;
  }
  
  // Return null if no match found (will show as "Unknown" in UI)
  return null;
}
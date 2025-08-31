import * as fs from 'fs';
import * as path from 'path';
import * as airlineCodes from 'airline-codes';

export interface AirportInfo {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  timezone?: string;
}

// Load the airports data
// In Docker, we need to handle different path structures
const airportsPath = process.env.NODE_ENV === 'development' && fs.existsSync('/app/frontend/src/data/airports.json')
  ? '/app/frontend/src/data/airports.json'
  : path.join(__dirname, '../../../frontend/src/data/airports.json');
const airportsDataRaw = JSON.parse(fs.readFileSync(airportsPath, 'utf8'));

// Convert object to array and map by IATA code when available
const airportMap = new Map<string, AirportInfo>();

// Process the raw data - it's an object keyed by ICAO codes
Object.entries(airportsDataRaw).forEach(([icao, data]: [string, any]) => {
  const airportInfo: AirportInfo = {
    code: data.iata || icao, // Use IATA if available, otherwise ICAO
    name: data.name,
    city: data.city,
    country: data.country,
    lat: data.lat,
    lng: data.lon,
    timezone: data.tz
  };
  
  // Add by IATA code if available
  if (data.iata && data.iata.length === 3) {
    airportMap.set(data.iata, airportInfo);
  }
  
  // Also add by ICAO code if it's 3 characters (some are 4)
  if (icao.length === 3) {
    airportMap.set(icao, airportInfo);
  }
});

// Common OCR errors mapping
const OCR_CORRECTIONS: Record<string, string> = {
  // Common misreads
  'JFT': 'JFK',
  'JKF': 'JFK',
  'SF0': 'SFO',  // Zero instead of O
  'SFQ': 'SFO',
  'LAK': 'LAX',
  'LA×': 'LAX',
  'ORO': 'ORD',  // O instead of D
  'OKD': 'ORD',
  'ATI': 'ATL',
  'AT1': 'ATL',  // 1 instead of L
  'DFN': 'DFW',
  'DEN': 'DEN',  // Often confused
  'BOS': 'BOS',
  'B0S': 'BOS',  // Zero instead of O
  'EWK': 'EWR',
  'ENR': 'EWR',
  'LHK': 'LHR',
  'LHP': 'LHR',
  'CDG': 'CDG',
  'CD6': 'CDG',  // 6 instead of G
};

// Airline code corrections
const AIRLINE_CORRECTIONS: Record<string, string> = {
  'DI': 'DL',  // Delta
  'D1': 'DL',
  'OL': 'DL',
  'AA': 'AA',  // American
  'A4': 'AA',
  'UA': 'UA',  // United
  'U4': 'UA',
  'SW': 'WN',  // Southwest
  'SN': 'WN',
  'BA': 'BA',  // British Airways
  'B4': 'BA',
};

export interface ValidationResult {
  isValid: boolean;
  corrected?: string;
  confidence: number;
  suggestion?: string;
  data?: AirportInfo;
}

export interface FlightValidation {
  airline: {
    code: string;
    name: string;
    isValid: boolean;
  };
  origin: ValidationResult;
  destination: ValidationResult;
  flightNumber: {
    raw: string;
    normalized: string;
    isValid: boolean;
  };
}

// Fuzzy match for airport codes
function findClosestAirport(code: string): { airport: AirportInfo | null; distance: number } {
  if (!code || code.length !== 3) return { airport: null, distance: 999 };
  
  const upperCode = code.toUpperCase();
  
  // First check OCR corrections
  if (OCR_CORRECTIONS[upperCode]) {
    const corrected = OCR_CORRECTIONS[upperCode];
    return { 
      airport: airportMap.get(corrected) || null, 
      distance: 1 
    };
  }
  
  // Direct match
  if (airportMap.has(upperCode)) {
    return { airport: airportMap.get(upperCode)!, distance: 0 };
  }
  
  // Levenshtein distance for close matches
  let closestAirport: AirportInfo | null = null;
  let minDistance = 999;
  
  for (const [airportCode, airport] of airportMap) {
    const distance = levenshteinDistance(upperCode, airportCode);
    if (distance < minDistance && distance <= 1) {
      minDistance = distance;
      closestAirport = airport;
    }
  }
  
  return { airport: closestAirport, distance: minDistance };
}

// Simple Levenshtein distance
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

export function validateAirportCode(code: string, ocrConfidence: number = 100): ValidationResult {
  if (!code || code.length !== 3) {
    return {
      isValid: false,
      confidence: 0,
      suggestion: 'Airport code must be 3 letters'
    };
  }
  
  const { airport, distance } = findClosestAirport(code);
  
  if (!airport) {
    return {
      isValid: false,
      confidence: 0,
      suggestion: `Unknown airport code: ${code}`
    };
  }
  
  // Calculate confidence based on OCR confidence and match distance
  const matchConfidence = distance === 0 ? 100 : (distance === 1 ? 85 : 60);
  const finalConfidence = Math.min(ocrConfidence, matchConfidence);
  
  // Smart correction logic based on confidence
  let shouldAutoCorrect = false;
  let correctionMessage = '';
  
  if (distance > 0) {
    if (finalConfidence >= 80 && ocrConfidence >= 70) {
      // High confidence - auto-correct
      shouldAutoCorrect = true;
      correctionMessage = `Auto-corrected ${code} to ${airport.code}`;
    } else if (finalConfidence >= 60) {
      // Medium confidence - suggest correction
      correctionMessage = `Did you mean ${airport.code} (${airport.city})?`;
    } else {
      // Low confidence - manual input needed
      correctionMessage = `${code} not recognized. Please verify the airport code.`;
    }
  }
  
  return {
    isValid: true,
    corrected: shouldAutoCorrect ? airport.code : (distance > 0 ? airport.code : undefined),
    confidence: finalConfidence,
    data: airport,
    suggestion: correctionMessage || undefined
  };
}

export function validateAirlineCode(code: string): { isValid: boolean; airline?: any; corrected?: string } {
  if (!code || code.length !== 2) {
    console.log('Airline validation failed: invalid length', code);
    return { isValid: false };
  }
  
  const upperCode = code.toUpperCase();
  
  // Check corrections first
  const correctedCode = AIRLINE_CORRECTIONS[upperCode] || upperCode;
  
  try {
    const airline = airlineCodes.findWhere({ iata: correctedCode });
    console.log('Airline lookup for', correctedCode, ':', airline ? 'Found' : 'Not found');
    if (airline) {
      return {
        isValid: true,
        airline,
        corrected: correctedCode !== upperCode ? correctedCode : undefined
      };
    }
  } catch (error) {
    console.log('Airline lookup error:', correctedCode, error);
  }
  
  return { isValid: false };
}

// New function to detect airline from text using fuzzy matching
export function detectAirlineFromText(ocrText: string): { code: string; name: string; confidence: number } {
  const upperText = ocrText.toUpperCase();
  
  // Common airline names to IATA mappings
  const airlinePatterns: Array<{ pattern: RegExp; iata: string; name: string }> = [
    { pattern: /\bDELTA\b/, iata: 'DL', name: 'Delta Air Lines' },
    { pattern: /\bUNITED\b/, iata: 'UA', name: 'United Airlines' },
    { pattern: /\bAMERICAN\b/, iata: 'AA', name: 'American Airlines' },
    { pattern: /\bSOUTHWEST\b/, iata: 'WN', name: 'Southwest Airlines' },
    { pattern: /\bJETBLUE\b/, iata: 'B6', name: 'JetBlue Airways' },
    { pattern: /\bALASKA\b/, iata: 'AS', name: 'Alaska Airlines' },
    { pattern: /\bSPIRIT\b/, iata: 'NK', name: 'Spirit Airlines' },
    { pattern: /\bFRONTIER\b/, iata: 'F9', name: 'Frontier Airlines' },
    { pattern: /\bHAWAIIAN\b/, iata: 'HA', name: 'Hawaiian Airlines' },
    { pattern: /\bBRITISH AIRWAYS\b/, iata: 'BA', name: 'British Airways' },
    { pattern: /\bLUFTHANSA\b/, iata: 'LH', name: 'Lufthansa' },
    { pattern: /\bAIR FRANCE\b/, iata: 'AF', name: 'Air France' },
    { pattern: /\bKLM\b/, iata: 'KL', name: 'KLM' },
    { pattern: /\bEMIRATES\b/, iata: 'EK', name: 'Emirates' },
    { pattern: /\bQATAR\b/, iata: 'QR', name: 'Qatar Airways' },
    { pattern: /\bSINGAPORE\b/, iata: 'SQ', name: 'Singapore Airlines' }
  ];
  
  // Check for airline names in text
  for (const { pattern, iata, name } of airlinePatterns) {
    if (pattern.test(upperText)) {
      // Verify it exists in airline-codes database
      try {
        const airline = airlineCodes.findWhere({ iata });
        if (airline) {
          return { code: iata, name: airline.name || name, confidence: 0.9 };
        }
      } catch (e) {
        // Still return if pattern matched but not in DB
        return { code: iata, name, confidence: 0.7 };
      }
    }
  }
  
  // Try to extract from flight number pattern
  const flightMatch = upperText.match(/(?:FLIGHT|FLT|FL)[:\s]*([A-Z]{2})\s*(\d{1,4})/);
  if (flightMatch) {
    const iataCode = flightMatch[1];
    const validation = validateAirlineCode(iataCode);
    if (validation.isValid && validation.airline) {
      return {
        code: iataCode,
        name: validation.airline.name || validation.airline.attributes?.name || 'Unknown',
        confidence: 0.8
      };
    }
  }
  
  return { code: 'XX', name: 'Unknown', confidence: 0.1 };
}

export function validateFlightNumber(flightNumber: string): FlightValidation['flightNumber'] {
  const normalized = flightNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Extract airline code (first 2 letters)
  const airlineCode = normalized.match(/^([A-Z]{2})/)?.[1];
  const flightDigits = normalized.match(/\d+/)?.[0];
  
  if (!airlineCode || !flightDigits) {
    return {
      raw: flightNumber,
      normalized: normalized,
      isValid: false
    };
  }
  
  const { isValid } = validateAirlineCode(airlineCode);
  
  return {
    raw: flightNumber,
    normalized: `${airlineCode}${flightDigits}`,
    isValid: isValid && flightDigits.length >= 1 && flightDigits.length <= 4
  };
}

export function validateFullFlight(data: {
  origin: string;
  destination: string;
  flightNumber: string;
  ocrConfidence?: number;
}): FlightValidation {
  const flightValidation = validateFlightNumber(data.flightNumber);
  const airlineCode = flightValidation.normalized.match(/^([A-Z]{2})/)?.[1] || '';
  const airlineValidation = validateAirlineCode(airlineCode);
  
  return {
    airline: {
      code: airlineCode,
      name: airlineValidation.airline?.name || 'Unknown',
      isValid: airlineValidation.isValid
    },
    origin: validateAirportCode(data.origin, data.ocrConfidence),
    destination: validateAirportCode(data.destination, data.ocrConfidence),
    flightNumber: flightValidation
  };
}

// Calculate distance between airports
export function calculateDistance(origin: string, destination: string): number | null {
  const originAirport = airportMap.get(origin);
  const destAirport = airportMap.get(destination);
  
  if (!originAirport || !destAirport) return null;
  
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = toRad(destAirport.lat - originAirport.lat);
  const dLon = toRad(destAirport.lng - originAirport.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(originAirport.lat)) * Math.cos(toRad(destAirport.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Get timezone for airport (you'll need to add timezone data to airports.json)
export function getAirportTimezone(code: string): string {
  const airport = airportMap.get(code);
  if (!airport) return 'UTC';
  
  // For now, estimate timezone based on longitude
  // This is a simplified approach - ideally use a proper timezone database
  const lng = airport.lng;
  const offsetHours = Math.round(lng / 15);
  return `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
}

export function getAirportInfo(code: string): AirportInfo | null {
  return airportMap.get(code) || null;
}
import { safeStrictDateExtraction } from './dateStrict';
import * as fs from 'fs';
import * as path from 'path';

// Cache for airport data to avoid repeated API calls
const airportCache: Map<string, { lat: number; lng: number; city?: string; state?: string; country?: string }> = new Map();

// Load airports data from JSON file
let airportsData: any = {};
try {
  // Try backend location first (for Docker), then frontend location
  let airportsPath = path.join(__dirname, '../data/airports.json');
  if (!fs.existsSync(airportsPath)) {
    airportsPath = path.join(__dirname, '../../../frontend/src/data/airports.json');
  }
  const airportsJson = fs.readFileSync(airportsPath, 'utf-8');
  airportsData = JSON.parse(airportsJson);
  console.log(`Loaded ${Object.keys(airportsData).length} airports for distance calculation`);
  
  // Pre-populate cache with all airports from the JSON
  for (const [code, airport] of Object.entries(airportsData)) {
    const airportInfo = airport as any;
    if (airportInfo.lat && airportInfo.lon) {
      airportCache.set(airportInfo.iata || code, {
        lat: airportInfo.lat,
        lng: airportInfo.lon,
        city: airportInfo.city,
        state: airportInfo.state,
        country: airportInfo.country
      });
      // Also cache by ICAO code if available
      if (airportInfo.icao && airportInfo.icao !== airportInfo.iata) {
        airportCache.set(airportInfo.icao, {
          lat: airportInfo.lat,
          lng: airportInfo.lon,
          city: airportInfo.city,
          state: airportInfo.state,
          country: airportInfo.country
        });
      }
    }
  }
} catch (error) {
  console.error('Failed to load airports.json for distance calculation:', error);
}

/**
 * Convert DMS (Degrees Minutes Seconds) to decimal degrees
 * Example: "35-26-04.0000N" -> 35.434444
 */
function dmsToDecimal(dms: string): number {
  // Parse format like "35-26-04.0000N" or "082-32-33.8240W"
  const parts = dms.match(/(\d+)-(\d+)-(\d+\.?\d*)(N|S|E|W)/);
  if (!parts) return 0;

  const degrees = parseInt(parts[1]);
  const minutes = parseInt(parts[2]);
  const seconds = parseFloat(parts[3]);
  const direction = parts[4];

  let decimal = degrees + minutes / 60 + seconds / 3600;

  // Make negative for South or West
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

/**
 * Fetch airport data from AviationAPI
 */
async function fetchAirportData(
  airportCode: string
): Promise<{ lat: number; lng: number; city?: string; state?: string; country?: string } | null> {
  try {
    const response = await fetch(`https://api.aviationapi.com/v1/airports?apt=${airportCode}`);
    if (!response.ok) {
      console.error(`Failed to fetch airport data for ${airportCode}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Check if we got an error response
    if (data.status === 'error' || !data.latitude || !data.longitude) {
      return null;
    }

    // Convert DMS to decimal degrees
    const lat = dmsToDecimal(data.latitude);
    const lng = dmsToDecimal(data.longitude);

    return {
      lat,
      lng,
      city: data.city,
      state: data.state_full,
      country: data.country || 'USA'
    };
  } catch (error) {
    console.error(`Error fetching airport data for ${airportCode}:`, error);
    return null;
  }
}

/**
 * Get airport coordinates, using cache first, then API as fallback
 */
async function getAirportCoordinates(airportCode: string): Promise<{ lat: number; lng: number } | null> {
  // Check cache first (which includes all airports from airports.json)
  const cached = airportCache.get(airportCode);
  if (cached) {
    return cached;
  }

  // Try to fetch from API as fallback
  const apiData = await fetchAirportData(airportCode);
  if (apiData) {
    airportCache.set(airportCode, apiData);
    return apiData;
  }

  console.warn(`Could not find coordinates for airport: ${airportCode}`);
  return null;
}

/**
 * Calculate the distance between two airports in miles using the Haversine formula
 */
export async function calculateFlightDistance(originCode: string, destinationCode: string): Promise<number> {
  const [origin, destination] = await Promise.all([
    getAirportCoordinates(originCode),
    getAirportCoordinates(destinationCode),
  ]);

  if (!origin || !destination) {
    // If we still don't have coordinates, use estimate
    return estimateDistance(originCode, destinationCode);
  }

  return calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
}

/**
 * Calculate distance using Haversine formula
 */
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Radius of Earth in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate distance for airports not in our database
 */
function estimateDistance(origin: string, destination: string): number {
  // Common route estimates (in miles)
  const commonRoutes: Record<string, number> = {
    'JFK-LAX': 2475,
    'LAX-JFK': 2475,
    'ORD-LAX': 1744,
    'LAX-ORD': 1744,
    'ATL-LAX': 1946,
    'LAX-ATL': 1946,
    'JFK-MIA': 1089,
    'MIA-JFK': 1089,
    'SFO-JFK': 2586,
    'JFK-SFO': 2586,
    'BOS-LAX': 2611,
    'LAX-BOS': 2611,
    'DFW-LAX': 1235,
    'LAX-DFW': 1235,
    'SEA-LAX': 954,
    'LAX-SEA': 954,
    'DEN-LAX': 862,
    'LAX-DEN': 862,
    'PHX-LAX': 370,
    'LAX-PHX': 370,
    'LAS-LAX': 236,
    'LAX-LAS': 236,
    // Add more common routes
  };

  const routeKey = `${origin}-${destination}`;
  return commonRoutes[routeKey] || 500; // Default to 500 miles if unknown
}

/**
 * Get airport information including city, state, and coordinates
 */
export async function getAirportInfo(
  code: string
): Promise<{ city?: string; state?: string; country?: string; lat?: number; lng?: number } | null> {
  // First check cache (which includes all airports from airports.json)
  const cached = airportCache.get(code);
  if (cached) {
    return cached;
  }

  // Try to fetch from API as fallback
  const apiData = await fetchAirportData(code);
  if (apiData) {
    airportCache.set(code, { ...apiData, country: apiData.country || 'USA' });
    return { ...apiData, country: apiData.country || 'USA' };
  }

  console.warn(`Could not find airport info for: ${code}`);
  return null;
}

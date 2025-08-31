import { Flight } from '../../../shared/src';

export type { Flight };

export interface FlightStats {
  summary?: {
    totalFlights: number;
    totalDistance: number;
    totalPoints: number;
    uniqueAirlines: number;
    uniqueDestinations: number;
    uniqueCountries?: number;
    airlines?: string[];
    destinations?: string[];
  };
  flightsByMonth?: Array<{
    _id: number;
    count: number;
    distance: number;
    points: number;
  }>;
  topRoutes?: Array<{
    _id: {
      origin: string;
      destination: string;
    };
    count: number;
    totalDistance: number;
  }>;
  // Legacy flat structure for backward compatibility
  totalFlights?: number;
  totalDistance?: number;
  totalFlightTime?: number;
  uniqueAirports?: number;
  uniqueCountries?: number;
  uniqueAirlines?: number;
  carbonEmissions?: number;
  averageFlightDistance?: number;
  totalPoints?: number;
  uniqueDestinations?: number;
  longestFlight?: Flight;
  shortestFlight?: Flight;
  mostVisitedAirport?: {
    code: string;
    name: string;
    city: string;
    country: string;
    visits: number;
  };
  favoriteAirline?: {
    code: string;
    name: string;
    flights: number;
  };
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function makeRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('passport_buddy_token');
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export class FlightService {
  async uploadBoardingPass(file: File): Promise<Flight> {
    const formData = new FormData();
    formData.append('boardingPass', file);

    const response = await makeRequest('/api/v1/flights/upload-boarding-pass', {
      method: 'POST',
      body: formData,
      headers: {}, // Let fetch set Content-Type for FormData
    });

    return response.flight;
  }

  async createManualFlight(flightData: any) {
    return makeRequest('/api/v1/flights/manual-entry', {
      method: 'POST',
      body: JSON.stringify(flightData),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getMyFlights() {
    return makeRequest('/api/v1/flights/my-flights');
  }

  async getFlightById(flightId: string) {
    return makeRequest(`/api/v1/flights/${flightId}`);
  }

  async updateFlight(flightId: string, updates: any) {
    return makeRequest(`/api/v1/flights/${flightId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async deleteFlight(flightId: string) {
    return makeRequest(`/api/v1/flights/${flightId}`, { method: 'DELETE' });
  }

  async markFlightCompleted(flightId: string) {
    return makeRequest(`/api/v1/flights/${flightId}/status`, { 
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async markFlightUncompleted(flightId: string) {
    return makeRequest(`/api/v1/flights/${flightId}/status`, { 
      method: 'PATCH',
      body: JSON.stringify({ status: 'upcoming' }),
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getFlightStats(userId?: string, year?: number): Promise<FlightStats> {
    let endpoint = '/api/v1/flights/stats';
    const params = new URLSearchParams();

    if (userId) {
      params.append('userId', userId);
    }
    if (year) {
      params.append('year', year.toString());
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const response = await makeRequest(endpoint);

    // Return the full backend response structure
    return {
      summary: response.summary || {
        totalFlights: 0,
        totalDistance: 0,
        totalPoints: 0,
        uniqueAirlines: 0,
        uniqueDestinations: 0,
        uniqueCountries: 0
      },
      flightsByMonth: response.flightsByMonth || [],
      topRoutes: response.topRoutes || [],
      // Also provide legacy flat structure for backward compatibility
      totalFlights: response.summary?.totalFlights || 0,
      totalDistance: response.summary?.totalDistance || 0,
      totalPoints: response.summary?.totalPoints || 0,
      uniqueDestinations: response.summary?.uniqueDestinations || 0,
      uniqueAirlines: response.summary?.uniqueAirlines || 0,
      totalFlightTime: 0, // Not provided by backend
      uniqueAirports: response.summary?.uniqueDestinations || 0, // Using destinations as proxy
      uniqueCountries: response.summary?.uniqueCountries || 0, // Now properly from backend
      carbonEmissions: 0, // Not provided by backend
      averageFlightDistance: response.summary?.totalFlights > 0 ? Math.round(response.summary.totalDistance / response.summary.totalFlights) : 0,
    };
  }

  getAirlineLogoUrl(airlineCode: string): string {
    return `https://images.kiwi.com/airlines/64x64/${airlineCode.toUpperCase()}.png`;
  }
}

export const flightService = new FlightService();

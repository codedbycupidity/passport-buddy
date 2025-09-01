import { useQuery, gql } from '@apollo/client';
import { FlightStats } from '../services/flight.service';

console.log('📁 useFlightStatsGraphQL module loaded!');

// Simplified query to test basic functionality
const GET_FLIGHT_STATS = gql`
  query GetFlightStats($userId: ID, $year: Int) {
    flightStats(userId: $userId, year: $year) {
      totalFlights
      totalDistance
      uniqueCountries
      totalPoints
      uniqueAirlines
    }
  }
`;

interface UseFlightStatsGraphQLOptions {
  userId?: string;
  year?: number;
}

export function useFlightStatsGraphQL(options: UseFlightStatsGraphQLOptions = {}) {
  console.log('🚀 useFlightStatsGraphQL hook called with options:', options);
  const { userId, year } = options;
  
  // If no userId is provided, the GraphQL resolver will use the authenticated user from context
  console.log('🚀 About to call useQuery with variables:', {
    userId: userId || undefined,
    year
  });

  const { data, loading, error, refetch } = useQuery(GET_FLIGHT_STATS, {
    variables: {
      userId: userId || undefined, // Explicitly pass undefined if no userId
      year,
    },
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network', // Get cached data first, then fetch fresh data
    onError: (error) => {
      console.error('🔥 GraphQL Query Error:', error);
    },
    onCompleted: (data) => {
      console.log('✅ GraphQL Query Completed:', data);
    }
  });

  // Add debugging
  console.log('🔍 useFlightStatsGraphQL Debug:', {
    userId,
    year,
    loading,
    error: error?.message,
    data,
    hasFlightStats: !!data?.flightStats,
    rawFlightStats: data?.flightStats
  });

  // Transform the GraphQL response to match the existing FlightStats interface
  const transformedStats: FlightStats | null = data?.flightStats ? {
    // Basic fields from GraphQL response
    totalFlights: data.flightStats.totalFlights || 0,
    totalDistance: data.flightStats.totalDistance || 0,
    uniqueCountries: data.flightStats.uniqueCountries || 0,
    totalPoints: data.flightStats.totalPoints || 0,
    uniqueAirlines: data.flightStats.uniqueAirlines || 0,
    
    // Set reasonable defaults for other required fields
    totalFlightTime: 0,
    uniqueAirports: data.flightStats.uniqueAirlines || 0, // Use airlines as proxy
    carbonEmissions: 0,
    averageFlightDistance: data.flightStats.totalFlights > 0 ? Math.round(data.flightStats.totalDistance / data.flightStats.totalFlights) : 0,
    uniqueDestinations: 0,
    mostVisitedAirport: null,
    favoriteAirline: null,
  } : null;

  console.log('🔍 transformedStats:', transformedStats);

  return {
    stats: transformedStats,
    loading,
    error: error?.message || null,
    refetch: () => refetch()
  };
}
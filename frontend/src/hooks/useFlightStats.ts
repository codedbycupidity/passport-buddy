import { useEffect, useState } from 'react';
import { FlightStats, flightService } from '../services/flight.service';

export function useFlightStats(userId?: string) {
  const [stats, setStats] = useState<FlightStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    // For now, always fetch stats for authenticated user (don't pass userId)
    // The backend has issues with userId parameter
    try {
      setLoading(true);
      const data = await flightService.getFlightStats();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching flight stats:', err);
      setError('Failed to load travel statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Listen for flight-related events to refresh stats
    const handleFlightUpdate = () => {
      fetchStats();
    };

    window.addEventListener('flight-created', handleFlightUpdate);
    window.addEventListener('flight-updated', handleFlightUpdate);
    window.addEventListener('flight-deleted', handleFlightUpdate);

    return () => {
      window.removeEventListener('flight-created', handleFlightUpdate);
      window.removeEventListener('flight-updated', handleFlightUpdate);
      window.removeEventListener('flight-deleted', handleFlightUpdate);
    };
  }, [userId]);

  return { stats, loading, error, refetch: fetchStats };
}

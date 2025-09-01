import React, { useEffect, useRef, useState } from 'react';
import { Flight, FlightStats, flightService } from '../services/flight.service';
import { useToast } from '../contexts/ToastContext';
import { FlightEditModal } from '../components/flights/FlightEditModal';
import { FlightManualEntry } from '../components/flights/FlightManualEntry';
import { CameraIcon, CheckIcon, EditIcon, PlusIcon, TrashIcon, UndoIcon, UploadIcon } from '../components/ui/Icons';
import '../assets/styles/Flights.css';

export const Flights: React.FC = () => {
  const { showToast } = useToast();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [stats, setStats] = useState<FlightStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPass, setUploadingPass] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [completingFlights, setCompletingFlights] = useState<Set<string>>(new Set());
  const [uncompletingFlights, setUncompletingFlights] = useState<Set<string>>(new Set());
  const [confirmingComplete, setConfirmingComplete] = useState<Set<string>>(new Set());
  const [confirmingUncomplete, setConfirmingUncomplete] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFlights();
    loadStats();
  }, []);

  const loadFlights = async () => {
    try {
      const response = await flightService.getMyFlights();
      setFlights(response.flights);
    } catch (error) {
      console.error('Error loading flights:', error);
      showToast('Failed to load flights', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Temporarily remove year filter as it's causing issues
      const statsData = await flightService.getFlightStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPass(true);
    try {
      // Import and apply image orientation correction for boarding pass images
      const { correctImageOrientation } = await import('../utils/imageOrientation');
      const correctedResult = await correctImageOrientation(file);
      const flight = await flightService.uploadBoardingPass(correctedResult.file);
      setFlights([flight, ...flights]);
      showToast('Boarding pass uploaded successfully!', 'success');
      loadStats(); // Reload stats to update points

      // Emit event for other components to refresh
      window.dispatchEvent(new CustomEvent('flight-created'));
    } catch (error) {
      console.error('Error uploading boarding pass:', error);
      showToast('Failed to upload boarding pass', 'error');
    } finally {
      setUploadingPass(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  const handleUpdateFlight = async (flightId: string, updates: Partial<Flight>) => {
    try {
      const updatedFlight = await flightService.updateFlight(flightId, updates);
      setFlights(flights.map(f => (f._id === flightId ? updatedFlight : f)));
      showToast('Flight updated successfully', 'success');
      loadStats();

      // Emit event for other components to refresh
      window.dispatchEvent(new CustomEvent('flight-updated'));
    } catch (error) {
      console.error('Error updating flight:', error);
      showToast('Failed to update flight', 'error');
    }
  };

  const handleDeleteFlight = async (flightId: string) => {
    if (!window.confirm('Are you sure you want to delete this flight?')) return;

    try {
      await flightService.deleteFlight(flightId);
      setFlights(flights.filter(f => f._id !== flightId));
      showToast('Flight deleted successfully', 'success');
      loadStats();

      // Emit event for other components to refresh
      window.dispatchEvent(new CustomEvent('flight-deleted'));
    } catch (error) {
      console.error('Error deleting flight:', error);
      showToast('Failed to delete flight', 'error');
    }
  };

  const handleMarkCompleted = async (flightId: string) => {
    if (confirmingComplete.has(flightId)) {
      // Second click - execute the action
      setConfirmingComplete(prev => {
        const newSet = new Set(prev);
        newSet.delete(flightId);
        return newSet;
      });
      
      setCompletingFlights(prev => new Set(prev).add(flightId));

      try {
        await flightService.markFlightCompleted(flightId);
        
        // Update the flight in the local state
        setFlights(flights.map(f => f._id === flightId ? { ...f, status: 'completed' } : f));
        loadStats();
      } catch (error) {
        console.error('Error marking flight as completed:', error);
        showToast('Failed to mark flight as completed', 'error');
      } finally {
        setCompletingFlights(prev => {
          const newSet = new Set(prev);
          newSet.delete(flightId);
          return newSet;
        });
      }
    } else {
      // First click - show confirmation state
      setConfirmingComplete(prev => new Set(prev).add(flightId));
      
      // Auto-reset after 3 seconds
      setTimeout(() => {
        setConfirmingComplete(prev => {
          const newSet = new Set(prev);
          newSet.delete(flightId);
          return newSet;
        });
      }, 3000);
    }
  };

  const handleMarkUncompleted = async (flightId: string) => {
    if (confirmingUncomplete.has(flightId)) {
      // Second click - execute the action
      setConfirmingUncomplete(prev => {
        const newSet = new Set(prev);
        newSet.delete(flightId);
        return newSet;
      });
      
      setUncompletingFlights(prev => new Set(prev).add(flightId));

      try {
        await flightService.markFlightUncompleted(flightId);
        
        // Update the flight in the local state
        setFlights(flights.map(f => f._id === flightId ? { ...f, status: 'upcoming' } : f));
        loadStats();
      } catch (error) {
        console.error('Error marking flight as upcoming:', error);
        showToast('Failed to mark flight as upcoming', 'error');
      } finally {
        setUncompletingFlights(prev => {
          const newSet = new Set(prev);
          newSet.delete(flightId);
          return newSet;
        });
      }
    } else {
      // First click - show confirmation state
      setConfirmingUncomplete(prev => new Set(prev).add(flightId));
      
      // Auto-reset after 2 seconds
      setTimeout(() => {
        setConfirmingUncomplete(prev => {
          const newSet = new Set(prev);
          newSet.delete(flightId);
          return newSet;
        });
      }, 2000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };


  const upcomingFlights = flights.filter(f => f.status === 'upcoming');
  const completedFlights = flights.filter(f => f.status === 'completed');

  return (
    <div className='flights-container'>
      <div className='flights-header'>
        <h1>My Flights</h1>
        <div className='flights-actions'>
          <button className='camera-btn' onClick={() => cameraInputRef.current?.click()} disabled={uploadingPass}>
            <CameraIcon className='icon' />
          </button>
          <button className='upload-pass-btn' onClick={() => fileInputRef.current?.click()} disabled={uploadingPass}>
            <UploadIcon className='icon' />
            {uploadingPass ? 'Uploading...' : 'Upload'}
          </button>
          <button className='manual-entry-btn' onClick={() => setShowManualEntry(!showManualEntry)}>
            <PlusIcon className='icon' />
            Manual Entry
          </button>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*,.pdf'
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <input
            ref={cameraInputRef}
            type='file'
            accept='image/*'
            capture='environment'
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {stats && (
        <div className='flight-stats'>
          <div className='stat-card'>
            <div className='stat-value'>{stats.summary?.totalFlights || 0}</div>
            <div className='stat-label'>Total Flights</div>
          </div>
          <div className='stat-card'>
            <div className='stat-value'>{(stats.summary?.totalDistance || 0).toLocaleString()}</div>
            <div className='stat-label'>Miles Traveled</div>
          </div>
          <div className='stat-card'>
            <div className='stat-value'>{(stats.summary?.totalPoints || 0).toLocaleString()}</div>
            <div className='stat-label'>Points Earned</div>
          </div>
          <div className='stat-card'>
            <div className='stat-value'>{stats.summary?.uniqueDestinations || 0}</div>
            <div className='stat-label'>Cities Visited</div>
          </div>
        </div>
      )}

      <div className='flights-tabs'>
        <button
          className={`tab ${selectedTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setSelectedTab('upcoming')}
        >
          Upcoming ({upcomingFlights.length})
        </button>
        <button
          className={`tab ${selectedTab === 'completed' ? 'active' : ''}`}
          onClick={() => setSelectedTab('completed')}
        >
          Completed ({completedFlights.length})
        </button>
      </div>

      <div className='flights-list'>
        {loading ? (
          <div className='loading'>Loading flights...</div>
        ) : (
          <>
            {selectedTab === 'upcoming' &&
              upcomingFlights.map(flight => (
                <FlightCard
                  key={flight._id}
                  flight={flight}
                  onEdit={() => setEditingFlight(flight)}
                  onDelete={() => handleDeleteFlight(flight._id)}
                  onMarkCompleted={() => handleMarkCompleted(flight._id)}
                  isCompleting={completingFlights.has(flight._id)}
                  isConfirmingComplete={confirmingComplete.has(flight._id)}
                />
              ))}
            {selectedTab === 'completed' &&
              completedFlights.map(flight => (
                <FlightCard
                  key={flight._id}
                  flight={flight}
                  onEdit={() => setEditingFlight(flight)}
                  onDelete={() => handleDeleteFlight(flight._id)}
                  onMarkUncompleted={() => handleMarkUncompleted(flight._id)}
                  isUncompleting={uncompletingFlights.has(flight._id)}
                  isConfirmingUncomplete={confirmingUncomplete.has(flight._id)}
                />
              ))}
            {((selectedTab === 'upcoming' && upcomingFlights.length === 0) ||
              (selectedTab === 'completed' && completedFlights.length === 0)) && (
              <div className='no-flights'>No {selectedTab} flights found. Upload a boarding pass to get started!</div>
            )}
          </>
        )}
      </div>

      {editingFlight && (
        <FlightEditModal
          flight={editingFlight}
          isOpen={!!editingFlight}
          onClose={() => setEditingFlight(null)}
          onSave={async updates => {
            await handleUpdateFlight(editingFlight._id, updates);
            setEditingFlight(null);
          }}
        />
      )}

      {showManualEntry && (
        <FlightManualEntry
          isOpen={showManualEntry}
          onClose={() => setShowManualEntry(false)}
          onSave={flight => {
            setFlights([flight, ...flights]);
            setShowManualEntry(false);
            loadStats();

            // Emit event for other components to refresh
            window.dispatchEvent(new CustomEvent('flight-created'));
          }}
        />
      )}
    </div>
  );
};

interface FlightCardProps {
  flight: Flight;
  onEdit: () => void;
  onDelete: () => void;
  onMarkCompleted?: () => void;
  isCompleting?: boolean;
  isConfirmingComplete?: boolean;
  onMarkUncompleted?: () => void;
  isUncompleting?: boolean;
  isConfirmingUncomplete?: boolean;
}

const FlightCard: React.FC<FlightCardProps> = ({ flight, onEdit, onDelete, onMarkCompleted, isCompleting, isConfirmingComplete, onMarkUncompleted, isUncompleting, isConfirmingUncomplete }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };


  return (
    <div className='flight-card'>
      <div className='flight-header'>
        <div className='airline-info'>
          <span className='airline'>{flight.airline}</span>
          <span className='flight-number'>{flight.flightNumber}</span>
        </div>
        <div className='flight-date'>{formatDate(flight.scheduledDepartureTime)}</div>
      </div>

      <div className='flight-route'>
        <div className='airport'>
          <div className='airport-code'>{flight.origin.airportCode}</div>
          <div className='airport-city'>{flight.origin.city}</div>
        </div>

        <div className='flight-path'>
          <div className='path-line'></div>
          <svg className='plane-icon' width='20' height='20' viewBox='0 0 20 20' fill='none'>
            <path
              d='M10.5 4.5L16 10M16 10L10.5 15.5M16 10H4'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </div>

        <div className='airport'>
          <div className='airport-code'>{flight.destination.airportCode}</div>
          <div className='airport-city'>{flight.destination.city}</div>
        </div>
      </div>

      <div className='flight-details'>
        <div className='detail'>
          <span className='label'>Gate:</span>
          <span className='value'>{flight.origin.gate || 'TBD'}</span>
        </div>
        <div className='detail'>
          <span className='label'>Seat:</span>
          <span className='value'>{flight.seatNumber || 'N/A'}</span>
        </div>
        {flight.points && (
          <div className='detail'>
            <span className='label'>Points:</span>
            <span className='value'>{flight.points.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className='flight-actions'>
        {onMarkCompleted && (
          <div className="button-tooltip-container">
            <button 
              className={`complete-btn ${isConfirmingComplete ? 'confirming' : ''}`}
              onClick={onMarkCompleted}
              disabled={isCompleting}
            >
              {isCompleting ? '...' : isConfirmingComplete ? '?' : <CheckIcon className='icon' />}
            </button>
            <div className="button-tooltip">
              {isConfirmingComplete ? "Click again to confirm" : "Mark as completed"}
            </div>
          </div>
        )}
        {onMarkUncompleted && (
          <div className="button-tooltip-container">
            <button 
              className={`uncomplete-btn ${isConfirmingUncomplete ? 'confirming' : ''}`}
              onClick={onMarkUncompleted}
              disabled={isUncompleting}
            >
              {isUncompleting ? '...' : isConfirmingUncomplete ? '?' : <UndoIcon className='icon' />}
            </button>
            <div className="button-tooltip">
              {isConfirmingUncomplete ? "Click again to confirm" : "Mark as upcoming"}
            </div>
          </div>
        )}
        <div className="button-tooltip-container">
          <button className='edit-btn' onClick={onEdit}>
            <EditIcon className='icon' />
          </button>
          <div className="button-tooltip">
            Edit flight
          </div>
        </div>
        <div className="button-tooltip-container">
          <button className='delete-btn' onClick={onDelete}>
            <TrashIcon className='icon' />
          </button>
          <div className="button-tooltip">
            Delete flight
          </div>
        </div>
      </div>
    </div>
  );
};

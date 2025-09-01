import React, { useEffect, useRef, useState } from 'react';
import airlinesDataRaw from '../../data/airlines.json';

interface Airline {
  name: string;
  iata_code: string | null;
  icao_code: string | null;
}

// Use the airlines data directly
const airlinesData: Airline[] = airlinesDataRaw as Airline[];

interface AirlineAutocompleteProps {
  label?: string;
  value: string;
  onChange: (airline: string) => void;
  placeholder?: string;
  required?: boolean;
}

const AirlineAutocomplete: React.FC<AirlineAutocompleteProps> = ({
  label = 'Airline',
  value,
  onChange,
  placeholder = 'Type to search airlines',
  required = false,
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Airline[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [originalValue, setOriginalValue] = useState('');
  const [hasFocused, setHasFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
    setOriginalValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAirlines = (searchQuery: string): Airline[] => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase();

    // Search by name, IATA code, or ICAO code
    const results = airlinesData.filter(airline => {
      const nameMatch = airline.name.toLowerCase().includes(query);
      const iataMatch = airline.iata_code && airline.iata_code.toLowerCase().includes(query);
      const icaoMatch = airline.icao_code && airline.icao_code.toLowerCase().includes(query);
      return nameMatch || iataMatch || icaoMatch;
    });

    // Sort by relevance (code matches first, then name starts with query, then other matches)
    return results
      .sort((a, b) => {
        // Exact IATA code match first
        const aExactIATA = a.iata_code && a.iata_code.toLowerCase() === query;
        const bExactIATA = b.iata_code && b.iata_code.toLowerCase() === query;
        if (aExactIATA && !bExactIATA) return -1;
        if (!aExactIATA && bExactIATA) return 1;

        // IATA code starts with query
        const aIATAStarts = a.iata_code && a.iata_code.toLowerCase().startsWith(query);
        const bIATAStarts = b.iata_code && b.iata_code.toLowerCase().startsWith(query);
        if (aIATAStarts && !bIATAStarts) return -1;
        if (!aIATAStarts && bIATAStarts) return 1;

        // Name starts with query
        const aNameStarts = a.name.toLowerCase().startsWith(query);
        const bNameStarts = b.name.toLowerCase().startsWith(query);
        if (aNameStarts && !bNameStarts) return -1;
        if (!aNameStarts && bNameStarts) return 1;

        // Popular airlines first (those with IATA codes are typically more common)
        if (a.iata_code && !b.iata_code) return -1;
        if (!a.iata_code && b.iata_code) return 1;

        return a.name.localeCompare(b.name);
      })
      .slice(0, 5); // Show only 5 results to keep dropdown compact
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length >= 2) {
      const searchResults = searchAirlines(value);
      setResults(searchResults);
      setActiveIndex(0);
      setShowSuggestions(searchResults.length > 0);
    } else {
      setResults([]);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[activeIndex]) {
          selectAirline(results[activeIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const selectAirline = (airline: Airline) => {
    setQuery(airline.name);
    setOriginalValue(airline.name);
    setHasFocused(false);
    onChange(airline.name);
    setShowSuggestions(false);
    setResults([]);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => (regex.test(part) ? <strong key={index}>{part}</strong> : part));
  };

  return (
    <div className='form-group' style={{ position: 'relative' }}>
      {label && (
        <label>
          {label} {required && <span className='text-red-500'>*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type='text'
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          // Clear the field when focused if it has the original value
          if (query === originalValue && originalValue !== '') {
            setQuery('');
            setHasFocused(true);
          }
          setShowSuggestions(results.length > 0);
        }}
        onBlur={() => {
          // Restore original value if user didn't type anything
          setTimeout(() => {
            if (query === '' && originalValue !== '' && hasFocused) {
              setQuery(originalValue);
              setHasFocused(false);
            }
          }, 200); // Small delay to allow click on suggestions
        }}
        placeholder={placeholder}
        required={required}
      />

      {showSuggestions && results.length > 0 && (
        <div
          ref={suggestionsRef}
          className='airline-suggestions'
          style={{
            position: 'absolute',
            zIndex: 10,
            width: '100%',
            maxHeight: '160px',
            overflow: 'auto',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            marginTop: '4px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            top: '100%',
          }}
        >
          {results.map((airline, index) => (
            <div
              key={`${airline.name}-${airline.iata_code}`}
              className={`airline-suggestion-item ${index === activeIndex ? 'active' : ''}`}
              style={{
                padding: '6px 10px',
                cursor: 'pointer',
                backgroundColor: index === activeIndex ? '#f3f4f6' : 'white',
                borderBottom: index < results.length - 1 ? '1px solid #e5e7eb' : 'none',
                fontSize: '14px',
              }}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectAirline(airline)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: '600', color: '#7c3aed' }}>{highlightMatch(airline.name, query)}</span>
                  {airline.iata_code && (
                    <span style={{ marginLeft: '6px', color: '#6b7280', fontSize: '13px' }}>
                      ({highlightMatch(airline.iata_code, query)})
                    </span>
                  )}
                </div>
                {airline.icao_code && (
                  <span style={{ color: '#9ca3af', fontSize: '11px', marginLeft: '8px', flexShrink: 0 }}>
                    {airline.icao_code}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AirlineAutocomplete;
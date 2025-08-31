// Demo flights data
export const demoFlights = [
  {
    _id: 'f1',
    user: '1',
    airline: 'United Airlines',
    flightNumber: 'UA 838',
    origin: {
      airportCode: 'SFO',
      city: 'San Francisco',
      terminal: '3',
      gate: 'G8',
      lat: 37.621311,
      lng: -122.378968
    },
    destination: {
      airportCode: 'NRT',
      city: 'Tokyo',
      terminal: '1',
      gate: 'A5',
      lat: 35.764702,
      lng: 140.386347
    },
    departureTime: new Date(Date.now() - 86400000).toISOString(),
    arrivalTime: new Date(Date.now() - 43200000).toISOString(),
    status: 'completed',
    seatNumber: '24A',
    bookingReference: 'DEMO123',
    class: 'Economy',
    aircraft: 'Boeing 787-9'
  },
  {
    _id: 'f2',
    user: '1',
    airline: 'Emirates',
    flightNumber: 'EK 215',
    origin: {
      airportCode: 'LAX',
      city: 'Los Angeles',
      terminal: 'B',
      gate: '45',
      lat: 33.942791,
      lng: -118.410042
    },
    destination: {
      airportCode: 'DXB',
      city: 'Dubai',
      terminal: '3',
      gate: 'C22',
      lat: 25.252778,
      lng: 55.364444
    },
    departureTime: new Date(Date.now() + 172800000).toISOString(),
    arrivalTime: new Date(Date.now() + 226800000).toISOString(),
    status: 'scheduled',
    seatNumber: '14K',
    bookingReference: 'DEMO456',
    class: 'Business',
    aircraft: 'Airbus A380'
  },
  {
    _id: 'f3',
    user: '3',
    airline: 'United Airlines',
    flightNumber: 'UA 929',
    origin: {
      airportCode: 'ORD',
      city: 'Chicago',
      terminal: '1',
      gate: 'C16',
      lat: 41.978603,
      lng: -87.904842
    },
    destination: {
      airportCode: 'LHR',
      city: 'London',
      terminal: '2',
      gate: 'A10',
      lat: 51.470022,
      lng: -0.454295
    },
    departureTime: new Date(Date.now() - 7200000).toISOString(),
    arrivalTime: new Date(Date.now() + 18000000).toISOString(),
    status: 'in-flight',
    seatNumber: '1A',
    bookingReference: 'PILOT01',
    class: 'First',
    aircraft: 'Boeing 777-300ER'
  },
  {
    _id: 'f4',
    user: '8',
    airline: 'Emirates',
    flightNumber: 'EK 001',
    origin: {
      airportCode: 'DXB',
      city: 'Dubai',
      terminal: '3',
      gate: 'A1',
      lat: 25.252778,
      lng: 55.364444
    },
    destination: {
      airportCode: 'JFK',
      city: 'New York',
      terminal: '4',
      gate: 'A8',
      lat: 40.639751,
      lng: -73.778925
    },
    departureTime: new Date(Date.now() + 3600000).toISOString(),
    arrivalTime: new Date(Date.now() + 54000000).toISOString(),
    status: 'scheduled',
    seatNumber: 'COCKPIT',
    bookingReference: 'CAPT01',
    class: 'Crew',
    aircraft: 'Airbus A380'
  },
  {
    _id: 'f5',
    user: '5',
    airline: 'Thai Airways',
    flightNumber: 'TG 681',
    origin: {
      airportCode: 'BKK',
      city: 'Bangkok',
      terminal: '1',
      gate: 'D7',
      lat: 13.681108,
      lng: 100.747283
    },
    destination: {
      airportCode: 'ICN',
      city: 'Seoul',
      terminal: '1',
      gate: 'G12',
      lat: 37.469075,
      lng: 126.450517
    },
    departureTime: new Date(Date.now() + 86400000).toISOString(),
    arrivalTime: new Date(Date.now() + 104400000).toISOString(),
    status: 'scheduled',
    seatNumber: '32K',
    bookingReference: 'FOOD01',
    class: 'Economy',
    aircraft: 'Boeing 777-200'
  },
  {
    _id: 'f6',
    user: '10',
    airline: 'Hawaiian Airlines',
    flightNumber: 'HA 89',
    origin: {
      airportCode: 'HNL',
      city: 'Honolulu',
      terminal: '2',
      gate: 'G6',
      lat: 21.318681,
      lng: -157.922428
    },
    destination: {
      airportCode: 'NAN',
      city: 'Nadi',
      terminal: '1',
      gate: 'A2',
      lat: -17.755392,
      lng: 177.443378
    },
    departureTime: new Date(Date.now() - 172800000).toISOString(),
    arrivalTime: new Date(Date.now() - 151200000).toISOString(),
    status: 'completed',
    seatNumber: '2A',
    bookingReference: 'ISLAND01',
    class: 'First',
    aircraft: 'Airbus A330'
  }
];
declare module 'airline-codes' {
  interface Airline {
    iata: string;
    icao: string;
    name: string;
    country: string;
  }

  function findWhere(query: { iata?: string; icao?: string; name?: string }): Airline | undefined;
  
  const airlines: Airline[];
  
  export { findWhere, airlines, Airline };
}
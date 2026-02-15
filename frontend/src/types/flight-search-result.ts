export interface FlightSegment {
  origin: string;
  destination: string;
  start_time: string;
  end_time: string;
}

export interface FlightSearchResult {
  /** Represents a single flight route that can consist of multiple segments */
  airline: string;
  price: number;
  segments: FlightSegment[];
  duration_minutes: number;
}

export interface FlightSearchResultByCombination {
  /** 
   * Contains all flight results for a specific (date, origin, destination) combination 
   */
  date: string;
  origin: string;
  destination: string;
  flights: FlightSearchResult[];
}
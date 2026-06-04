export interface FlightSegment {
  origin: string;
  destination: string;
  start_time: string;
  end_time: string;
}

export interface BookingRequest {
  method: 'GET' | 'POST';
  url: string;
  post_data?: string | null;
}

export interface Flight {
  /** Represents a single flight route that can consist of multiple segments */
  airline: string;
  airline_logo_url?: string | null;
  price: number;
  segments: FlightSegment[];
  duration_minutes: number;
  booking_url?: string | null;
  booking_request?: BookingRequest | null;
}

export interface FlightSearchResult {
  /** 
   * Contains all flight results for a specific (date, origin, destination) combination 
   */
  date: string;
  origin: string;
  destination: string;
  flights: Flight[];
}

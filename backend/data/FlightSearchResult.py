from datetime import date, datetime
from typing import List, Literal

from pydantic import BaseModel

class FlightSegment(BaseModel):
    origin: str
    destination: str
    start_time: datetime
    end_time: datetime


class BookingRequest(BaseModel):
    method: Literal["GET", "POST"]
    url: str
    post_data: str | None = None


class Flight(BaseModel):
    """Represents a single flight route that can consist of multiple segments"""
    airline: str
    airline_logo_url: str | None = None
    price: float
    segments: List[FlightSegment]
    duration_minutes: int
    booking_url: str | None = None
    booking_request: BookingRequest | None = None


class FlightSearchResult(BaseModel):
    """Contains all flight results for a specific (date, origin, destination) combination"""
    date: date
    origin: str
    destination: str
    flights: List[Flight]

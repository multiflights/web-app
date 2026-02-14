from pydantic import BaseModel
from datetime import date, datetime
from typing import List

class FlightSegment(BaseModel):
    origin: str
    destination: str
    start_time: datetime
    end_time: datetime


class FlightSearchResult(BaseModel):
    """Represents a single flight route that can consist of multiple segments"""
    airline: str
    price: float
    segments: List[FlightSegment]
    duration_minutes : int 


class FlightSearchResultByCombination(BaseModel):
    """Contains all flight results for a specific (date, origin, destination) combination"""
    date: date
    origin: str
    destination: str
    flights: List[FlightSearchResult]


from dataclasses import dataclass
from datetime import date
from typing import Optional

@dataclass(frozen=True)
class FlightRoute:
    """Represents one origin, destination, outbound date and optional return date."""
    origin: str
    destination: str
    date: date
    return_date: Optional[date] = None

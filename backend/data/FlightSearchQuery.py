from typing import List, Optional
from datetime import date

from pydantic import BaseModel, Field


class FlightSearchQuery(BaseModel):
    origins: List[str] = Field(
        ...,
        min_length=1,
        description="List of origin airport codes"
    )

    destinations: List[str] = Field(
        ...,
        min_length=1,
        description="List of destination airport codes"
    )

    departure_dates: List[date] = Field(
        ...,
        min_length=1,
        description="List of dates of departure (YYYY-MM-DD)"
    )

    return_dates: Optional[List[date]] = Field(
        default=None,
        min_length=1,
        description="Optional list of dates of return (YYYY-MM-DD)"
    )

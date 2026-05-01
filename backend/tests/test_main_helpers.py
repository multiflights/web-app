import os
from datetime import date, datetime, timezone

import pytest

os.environ.setdefault("AMADEUS_CLIENT_ID", "test-client-id")
os.environ.setdefault("AMADEUS_CLIENT_SECRET", "test-client-secret")

from data.FlightRoute import FlightRoute
from data.FlightSearchQuery import FlightSearchQuery
from main import (
    convert_string_to_date,
    convert_string_to_datetime,
    iso_duration_to_minutes,
    parse_amadeus_results,
    parse_query,
    required_environment_value,
)


def test_iso_duration_to_minutes_parses_hours_and_minutes():
    assert iso_duration_to_minutes("PT6H10M") == 370
    assert iso_duration_to_minutes("PT45M") == 45
    assert iso_duration_to_minutes("PT7H") == 420


@pytest.mark.parametrize("duration", ["", "6H10M", "P1D"])
def test_iso_duration_to_minutes_rejects_invalid_values(duration):
    with pytest.raises(ValueError, match="Bad duration"):
        iso_duration_to_minutes(duration)


def test_parse_query_expands_and_normalizes_combinations():
    query = FlightSearchQuery(
        origins=[" jfk ", "bos"],
        destinations=[" lax "],
        departure_dates=[date(2026, 6, 12), date(2026, 6, 13)],
    )

    assert list(parse_query(query)) == [
        ("JFK", "LAX", date(2026, 6, 12)),
        ("JFK", "LAX", date(2026, 6, 13)),
        ("BOS", "LAX", date(2026, 6, 12)),
        ("BOS", "LAX", date(2026, 6, 13)),
    ]


def test_datetime_helpers_parse_iso_strings_with_z_suffix():
    parsed_datetime = convert_string_to_datetime("2026-06-12T08:30:00Z")

    assert parsed_datetime == datetime(2026, 6, 12, 8, 30, tzinfo=timezone.utc)
    assert convert_string_to_date("2026-06-12T08:30:00Z") == date(2026, 6, 12)


def test_required_environment_value_returns_existing_value(monkeypatch):
    monkeypatch.setenv("SOME_REQUIRED_VALUE", "configured")

    assert required_environment_value("SOME_REQUIRED_VALUE") == "configured"


def test_required_environment_value_raises_clear_error(monkeypatch):
    monkeypatch.delenv("MISSING_REQUIRED_VALUE", raising=False)

    with pytest.raises(RuntimeError, match="backend/environment.env"):
        required_environment_value("MISSING_REQUIRED_VALUE")


def test_parse_amadeus_results_sorts_by_price_and_maps_segments():
    route = FlightRoute("JFK", "LAX", date(2026, 6, 12))
    offers = [
        {
            "itineraries": [
                {
                    "duration": "PT6H30M",
                    "segments": [
                        {
                            "departure": {"iataCode": "JFK", "at": "2026-06-12T08:00:00"},
                            "arrival": {"iataCode": "LAX", "at": "2026-06-12T11:30:00"},
                            "carrierCode": "AA",
                        }
                    ],
                }
            ],
            "validatingAirlineCodes": ["AA"],
            "price": {"total": "350.25"},
        },
        {
            "itineraries": [
                {
                    "duration": "PT7H",
                    "segments": [
                        {
                            "departure": {"iataCode": "JFK", "at": "2026-06-12T09:00:00"},
                            "arrival": {"iataCode": "LAX", "at": "2026-06-12T12:00:00"},
                            "carrierCode": "DL",
                        }
                    ],
                }
            ],
            "price": {"total": "240.00"},
        },
        {
            "itineraries": [
                {
                    "segments": [
                        {
                            "departure": {"iataCode": "JFK", "at": "2026-06-12T10:00:00"},
                            "arrival": {"iataCode": "LAX", "at": "2026-06-12T13:00:00"},
                            "carrierCode": "UA",
                        }
                    ],
                }
            ],
            "price": {"total": "100.00"},
        },
    ]

    result = parse_amadeus_results(offers, route)

    assert result is not None
    assert result.origin == "JFK"
    assert result.destination == "LAX"
    assert result.date == date(2026, 6, 12)
    assert [flight.price for flight in result.flights] == [240.0, 350.25]
    assert result.flights[0].airline == "DL"
    assert result.flights[0].duration_minutes == 420
    assert result.flights[0].segments[0].origin == "JFK"
    assert result.flights[0].segments[0].destination == "LAX"


def test_parse_amadeus_results_returns_none_when_no_valid_offers():
    route = FlightRoute("JFK", "LAX", date(2026, 6, 12))

    assert parse_amadeus_results([], route) is None
    assert parse_amadeus_results([{"itineraries": [{"segments": []}]}], route) is None

import os
from datetime import date, datetime, timezone

import pytest

os.environ.setdefault("SERPAPI_KEY", "test-serpapi-key")

from data.FlightRoute import FlightRoute
from data.FlightSearchQuery import FlightSearchQuery
from data.FlightSearchResult import BookingRequest
from main import (
    convert_string_to_date,
    convert_string_to_datetime,
    find_booking_request,
    iso_duration_to_minutes,
    parse_query,
    parse_serpapi_results,
    redact_sensitive_params,
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
        ("JFK", "LAX", date(2026, 6, 12), None),
        ("JFK", "LAX", date(2026, 6, 13), None),
        ("BOS", "LAX", date(2026, 6, 12), None),
        ("BOS", "LAX", date(2026, 6, 13), None),
    ]


def test_parse_query_expands_valid_round_trip_date_pairs():
    query = FlightSearchQuery(
        origins=["JFK"],
        destinations=["LAX"],
        departure_dates=[date(2026, 6, 12), date(2026, 6, 15)],
        return_dates=[date(2026, 6, 14), date(2026, 6, 18)],
    )

    assert list(parse_query(query)) == [
        ("JFK", "LAX", date(2026, 6, 12), date(2026, 6, 14)),
        ("JFK", "LAX", date(2026, 6, 12), date(2026, 6, 18)),
        ("JFK", "LAX", date(2026, 6, 15), date(2026, 6, 18)),
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


def test_redact_sensitive_params_hides_secrets():
    assert redact_sensitive_params({"client_secret": "secret", "airport": "BER"}) == {
        "client_secret": "[redacted]",
        "airport": "BER",
    }


def test_find_booking_request_searches_nested_booking_options():
    booking_options = [
        {
            "together": {
                "book_with": "Example OTA",
                "booking_request": {
                    "url": "https://partner.example/checkout",
                    "post_data": "token=abc123",
                },
            }
        }
    ]

    assert find_booking_request(booking_options) == {
        "url": "https://partner.example/checkout",
        "post_data": "token=abc123",
    }


def test_parse_serpapi_results_maps_booking_get_and_post_actions():
    route = FlightRoute("LAX", "JFK", date(2026, 6, 12))
    serpapi_payload = {
        "best_flights": [
            {
                "flights": [
                    {
                        "departure_airport": {"id": "LAX", "time": "2026-06-12 08:00"},
                        "arrival_airport": {"id": "JFK", "time": "2026-06-12 16:10"},
                        "airline": "JetBlue",
                        "airline_logo": "https://cdn.example.com/b6.png",
                    }
                ],
                "total_duration": 370,
                "price": 249,
                "airline_logo": "https://cdn.example.com/b6-itinerary.png",
                "booking_token": "token-get",
            },
            {
                "flights": [
                    {
                        "departure_airport": {"id": "LAX", "time": "2026-06-12 09:30"},
                        "arrival_airport": {"id": "JFK", "time": "2026-06-12 18:20"},
                        "airline": "Delta",
                    }
                ],
                "total_duration": 410,
                "price": 275,
                "booking_token": "token-post",
            },
        ]
    }
    booking_requests = {
        "token-get": BookingRequest(method="GET", url="https://partner.example/direct"),
        "token-post": BookingRequest(method="POST", url="https://www.google.com/travel/clk/f", post_data="x=1"),
    }

    result = parse_serpapi_results(serpapi_payload, route, booking_requests)

    assert result is not None
    assert result.origin == "LAX"
    assert result.destination == "JFK"
    assert len(result.flights) == 2
    assert result.flights[0].airline == "JetBlue"
    assert result.flights[0].airline_logo_url == "https://cdn.example.com/b6-itinerary.png"
    assert result.flights[0].booking_url == "https://partner.example/direct"
    assert result.flights[0].booking_request is not None
    assert result.flights[0].booking_request.method == "GET"
    assert result.flights[1].booking_request is not None
    assert result.flights[1].booking_request.method == "POST"
    assert result.flights[1].booking_url is None

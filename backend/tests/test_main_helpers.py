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
    format_amadeus_error,
    format_amadeus_request,
    iso_duration_to_minutes,
    parse_amadeus_results,
    parse_query,
    redact_sensitive_params,
    required_environment_value,
)


class FakeAmadeusError(Exception):
    def __init__(self, response, message="[---]", code="NetworkError"):
        super().__init__(message)
        self.response = response
        self.code = code


class FakeAmadeusResponse:
    def __init__(self, status_code, result, request=None, http_response=None, body=None):
        self.status_code = status_code
        self.result = result
        self.request = request
        self.http_response = http_response
        self.body = body


class FakeAmadeusRequest:
    verb = "GET"
    path = "/v2/shopping/flight-offers"
    params = {
        "originLocationCode": "BER",
        "destinationLocationCode": "FRA",
        "client_secret": "do-not-log",
    }


class FakeNetworkErrorResponse:
    reason = "[Errno 8] nodename nor servname provided, or not known"


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


def test_redact_sensitive_params_hides_secrets():
    assert redact_sensitive_params({"client_secret": "secret", "airport": "BER"}) == {
        "client_secret": "[redacted]",
        "airport": "BER",
    }


def test_format_amadeus_request_includes_method_path_and_redacted_params():
    assert format_amadeus_request(FakeAmadeusRequest()) == (
        "GET /v2/shopping/flight-offers; "
        "params={'originLocationCode': 'BER', 'destinationLocationCode': 'FRA', 'client_secret': '[redacted]'}"
    )


def test_format_amadeus_error_extracts_structured_error_details():
    error = FakeAmadeusError(
        FakeAmadeusResponse(
            400,
            {
                "errors": [
                    {
                        "code": 4926,
                        "title": "INVALID DATA RECEIVED",
                        "detail": "Airport code is not supported",
                        "source": {"parameter": "destinationLocationCode"},
                    }
                ]
            },
        )
    )

    message = format_amadeus_error(error)

    assert "status=400" in message
    assert "sdk_error=NetworkError" in message
    assert "code=4926" in message
    assert "title=INVALID DATA RECEIVED" in message
    assert "detail=Airport code is not supported" in message
    assert "source={'parameter': 'destinationLocationCode'}" in message


def test_format_amadeus_error_falls_back_to_payload_body_or_message():
    assert format_amadeus_error(FakeAmadeusError(FakeAmadeusResponse(500, {"error": "server"}))) == (
        "status=500; sdk_error=NetworkError; payload={'error': 'server'}"
    )
    assert format_amadeus_error(FakeAmadeusError(FakeAmadeusResponse(500, None, body="not json"))) == (
        "status=500; sdk_error=NetworkError; body=not json"
    )
    assert format_amadeus_error(FakeAmadeusError(FakeAmadeusResponse(500, None))) == (
        "status=500; sdk_error=NetworkError; message=[---]"
    )


def test_format_amadeus_error_includes_network_reason_and_request_context():
    message = format_amadeus_error(
        FakeAmadeusError(
            FakeAmadeusResponse(
                None,
                None,
                request=FakeAmadeusRequest(),
                http_response=FakeNetworkErrorResponse(),
            )
        )
    )

    assert "status=None" in message
    assert "sdk_error=NetworkError" in message
    assert "request=GET /v2/shopping/flight-offers" in message
    assert "originLocationCode" in message
    assert "client_secret': '[redacted]'" in message
    assert "network_reason=[Errno 8] nodename nor servname provided, or not known" in message


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

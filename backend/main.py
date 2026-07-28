import asyncio
import html
import os
import warnings
from contextlib import asynccontextmanager
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import parse_qsl, urlparse

import httpx
import uvicorn
from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from FlightCache import FlightCache
from data.FlightRoute import FlightRoute
from data.FlightSearchQuery import FlightSearchQuery
from data.FlightSearchResult import BookingRequest, Flight, FlightSearchResult, FlightSegment

SERPAPI_SEARCH_URL = "https://serpapi.com/search.json"
SERPAPI_CONNECT_TIMEOUT_SECONDS = 10
SERPAPI_READ_TIMEOUT_SECONDS = 45
SERPAPI_READ_TIMEOUT_RETRIES = 1
SERPAPI_RETRY_BACKOFF_SECONDS = 0.5
SERPAPI_MAX_CONCURRENT_REQUESTS = 4
SERPAPI_FLIGHT_LIMIT = 5
serpapi_request_semaphore = asyncio.Semaphore(SERPAPI_MAX_CONCURRENT_REQUESTS)


class MissingConfigurationWarning(UserWarning):
    """Emitted when required configuration is absent.

    Emitted (not raised) so the server still starts, but callers can catch or
    escalate it, e.g. ``warnings.simplefilter("error", MissingConfigurationWarning)``
    to turn it into a hard startup failure later.
    """


def load_environment_file() -> None:
    """Load local backend env values without overriding shell-provided config."""
    env_path = Path(__file__).with_name("environment.env")
    if not env_path.exists():
        return

    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        # Tolerate shell-style `export KEY=value` lines so the key name does not
        # end up as the literal "export KEY".
        if key.startswith("export "):
            key = key[len("export "):].strip()
        value = value.strip().strip('"').strip("'")

        if key:
            os.environ.setdefault(key, value)


def required_environment_value(name: str) -> str:
    value = os.environ.get(name)
    if value:
        return value

    raise RuntimeError(
        f"Missing required environment variable {name}. "
        "Set it in backend/environment.env or export it before starting uvicorn."
    )


def redact_sensitive_params(params):
    if not isinstance(params, dict):
        return params

    redacted = {}
    for key, value in params.items():
        if any(secret in str(key).lower() for secret in ("secret", "token", "password", "key")):
            redacted[key] = "[redacted]"
        else:
            redacted[key] = value
    return redacted

load_environment_file()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.environ.get("SERPAPI_KEY"):
        warnings.warn(
            "SERPAPI_KEY is not set. Flight searches will return HTTP 500 until it "
            "is configured in backend/environment.env or exported in the environment.",
            MissingConfigurationWarning,
            stacklevel=2,
        )
    cleanup_task = asyncio.create_task(cache_cleaner())
    yield

    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        print("Background cache cleaner cancelled.")


app = FastAPI(title="Flight Search Engine", lifespan=lifespan)
flight_cache = FlightCache()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/status")
async def get_status():
    """Validates the backend is running."""
    return {
        "status": "online",
        "service": "flight-search-backend",
        "version": "2.0.0",
    }


@app.post("/booking/redirect", response_class=HTMLResponse)
async def booking_redirect(
    method: str = Form(...),
    url: str = Form(...),
    post_data: str = Form(""),
):
    booking_request = BookingRequest(method=method, url=url, post_data=post_data or None)
    parsed_url = urlparse(booking_request.url)
    if parsed_url.scheme != "https" or not parsed_url.netloc:
        raise HTTPException(status_code=400, detail="Invalid booking URL.")

    if booking_request.method == "GET":
        escaped_url = html.escape(booking_request.url, quote=True)
        return HTMLResponse(
            f"<!doctype html><html><head><meta http-equiv=\"refresh\" content=\"0;url={escaped_url}\"></head>"
            f"<body><p>Redirecting to booking…</p><p><a href=\"{escaped_url}\">Continue</a></p></body></html>"
        )

    if not booking_request.post_data:
        raise HTTPException(status_code=400, detail="POST booking request is missing form data.")

    form_fields = "\n".join(
        (
            f'<input type="hidden" name="{html.escape(key, quote=True)}" '
            f'value="{html.escape(value, quote=True)}" />'
        )
        for key, value in parse_qsl(booking_request.post_data, keep_blank_values=True)
    )
    escaped_url = html.escape(booking_request.url, quote=True)

    return HTMLResponse(
        "<!doctype html><html><body>"
        f'<form id="booking-handoff" action="{escaped_url}" method="post">'
        f"{form_fields}"
        "</form>"
        "<p>Redirecting to booking…</p>"
        "<script>document.getElementById('booking-handoff').submit();</script>"
        "</body></html>"
    )


async def fetch_serpapi_json(
    params: Dict[str, Any],
    *,
    force_fresh: bool = True,
) -> Dict[str, Any]:
    request_params = {
        **params,
        "engine": "google_flights",
        "api_key": required_environment_value("SERPAPI_KEY"),
    }
    if force_fresh:
        request_params["no_cache"] = "true"

    timeout = httpx.Timeout(
        connect=SERPAPI_CONNECT_TIMEOUT_SECONDS,
        read=SERPAPI_READ_TIMEOUT_SECONDS,
        write=SERPAPI_CONNECT_TIMEOUT_SECONDS,
        pool=SERPAPI_CONNECT_TIMEOUT_SECONDS,
    )
    attempts = SERPAPI_READ_TIMEOUT_RETRIES + 1
    response = None

    for attempt in range(attempts):
        try:
            async with serpapi_request_semaphore:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.get(SERPAPI_SEARCH_URL, params=request_params)
                    response.raise_for_status()
            break
        except httpx.ReadTimeout as error:
            if attempt + 1 < attempts:
                await asyncio.sleep(SERPAPI_RETRY_BACKOFF_SECONDS * (attempt + 1))
                continue
            raise_serpapi_request_error(error, request_params)
        except httpx.HTTPError as error:
            raise_serpapi_request_error(error, request_params)

    if response is None:
        raise RuntimeError("SerpApi request ended without a response.")

    payload = response.json()
    if payload.get("error"):
        sanitized = redact_sensitive_params(request_params)
        raise RuntimeError(f"SerpApi returned an error; params={sanitized}; error={payload['error']}")

    return payload


def raise_serpapi_request_error(
    error: httpx.HTTPError,
    request_params: Dict[str, Any],
) -> None:
    sanitized = redact_sensitive_params(request_params)
    response = getattr(error, "response", None)
    response_body = None
    if response is not None:
        try:
            response_body = response.text
        except Exception:
            response_body = None

    details = (
        "SerpApi request failed; "
        f"params={sanitized}; "
        f"error_type={type(error).__name__}; "
        f"error={error!r}"
    )
    if response_body:
        details += f"; response_body={response_body}"

    raise RuntimeError(details) from error


async def fetch_booking_request(
    booking_token: str,
) -> BookingRequest | None:
    params = {
        "booking_token": booking_token,
        "currency": "USD",
        "hl": "en",
        "gl": "us",
    }

    payload = await fetch_serpapi_json(params, force_fresh=False)
    booking_request = find_booking_request(payload.get("booking_options"))
    if not booking_request:
        return None

    url = booking_request.get("url")
    if not isinstance(url, str) or not url:
        return None

    post_data = booking_request.get("post_data")
    method = "POST" if isinstance(post_data, str) and post_data else "POST" if post_data else "GET"

    return BookingRequest(
        method=method,
        url=url,
        post_data=post_data if isinstance(post_data, str) and post_data else None,
    )


def find_booking_request(value: Any) -> Dict[str, Any] | None:
    if isinstance(value, dict):
        booking_request = value.get("booking_request")
        if isinstance(booking_request, dict):
            return booking_request

        for child in value.values():
            result = find_booking_request(child)
            if result:
                return result

    if isinstance(value, list):
        for item in value:
            result = find_booking_request(item)
            if result:
                return result

    return None


def parse_serpapi_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace(" ", "T"))


def convert_string_to_datetime(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def convert_string_to_date(s: str) -> date:
    return datetime.fromisoformat(s.replace("Z", "+00:00")).date()


def iso_duration_to_minutes(d: str) -> int:
    if not d or not d.startswith("PT"):
        raise ValueError(f"Bad duration: {d}")

    s = d[2:]
    hours = 0
    mins = 0

    if "H" in s:
        h_part, s = s.split("H", 1)
        hours = int(h_part) if h_part else 0

    if "M" in s:
        m_part = s.split("M", 1)[0]
        mins = int(m_part) if m_part else 0

    return hours * 60 + mins


def parse_query(q: FlightSearchQuery):
    for origin in q.origins:
        for destination in q.destinations:
            for departure_date in q.departure_dates:
                if not q.return_dates:
                    yield (origin.upper().strip(), destination.upper().strip(), departure_date, None)
                    continue

                for return_date in q.return_dates:
                    if return_date >= departure_date:
                        yield (
                            origin.upper().strip(),
                            destination.upper().strip(),
                            departure_date,
                            return_date,
                        )

def parse_serpapi_results(
    serpapi_payload: Dict[str, Any],
    route: FlightRoute,
    booking_requests: Dict[str, BookingRequest | None],
) -> FlightSearchResult | None:
    itineraries = (serpapi_payload.get("best_flights") or []) + (serpapi_payload.get("other_flights") or [])
    flights: List[Flight] = []

    for itinerary in itineraries[:SERPAPI_FLIGHT_LIMIT]:
        segments_raw = itinerary.get("flights") or []
        if not segments_raw:
            continue

        try:
            segments = [
                FlightSegment(
                    origin=segment["departure_airport"]["id"],
                    destination=segment["arrival_airport"]["id"],
                    start_time=parse_serpapi_datetime(segment["departure_airport"]["time"]),
                    end_time=parse_serpapi_datetime(segment["arrival_airport"]["time"]),
                )
                for segment in segments_raw
            ]
        except (KeyError, TypeError, ValueError):
            continue

        price = itinerary.get("price")
        duration_minutes = itinerary.get("total_duration")
        if not isinstance(price, (int, float)) or not isinstance(duration_minutes, int):
            continue

        booking_token = itinerary.get("booking_token")
        booking_request = booking_requests.get(booking_token) if isinstance(booking_token, str) else None
        booking_url = booking_request.url if booking_request and booking_request.method == "GET" else None

        first_segment = segments_raw[0]
        airline = first_segment.get("airline")
        if not isinstance(airline, str) or not airline:
            airline = "Unknown airline"

        airline_logo_url = itinerary.get("airline_logo") or first_segment.get("airline_logo")
        if not isinstance(airline_logo_url, str):
            airline_logo_url = None

        outbound_segment_count = itinerary.get("_outbound_segment_count")
        return_segments = None
        if route.return_date and isinstance(outbound_segment_count, int):
            return_segments = segments[outbound_segment_count:]
            segments = segments[:outbound_segment_count]

        flights.append(
            Flight(
                airline=airline,
                airline_logo_url=airline_logo_url,
                price=float(price),
                segments=segments,
                return_segments=return_segments,
                duration_minutes=duration_minutes,
                booking_url=booking_url,
                booking_request=booking_request,
            )
        )

    if not flights:
        return None

    flights.sort(key=lambda flight: flight.price)

    return FlightSearchResult(
        date=route.date,
        return_date=route.return_date,
        origin=route.origin,
        destination=route.destination,
        flights=flights,
    )


async def fetch_single_route(
    origin: str,
    dest: str,
    outbound_date: str,
    route: FlightRoute,
    return_date: str | None = None,
):
    try:
        search_params = {
            "departure_id": origin,
            "arrival_id": dest,
            "outbound_date": outbound_date,
            "currency": "USD",
            "type": "1" if return_date else "2",
            "hl": "en",
            "gl": "us",
        }
        if return_date:
            search_params["return_date"] = return_date

        search_payload = await fetch_serpapi_json(search_params)

        if return_date:
            outbound_itineraries = (
                (search_payload.get("best_flights") or [])
                + (search_payload.get("other_flights") or [])
            )[:SERPAPI_FLIGHT_LIMIT]
            return_payloads = await asyncio.gather(
                *(
                    fetch_serpapi_json(
                        {
                            **search_params,
                            "departure_token": itinerary["departure_token"],
                        },
                        force_fresh=False,
                    )
                    for itinerary in outbound_itineraries
                    if isinstance(itinerary.get("departure_token"), str)
                ),
                return_exceptions=True,
            )

            combined_itineraries = []
            for outbound_itinerary, return_payload in zip(
                [
                    itinerary
                    for itinerary in outbound_itineraries
                    if isinstance(itinerary.get("departure_token"), str)
                ],
                return_payloads,
            ):
                if isinstance(return_payload, Exception):
                    continue
                return_itineraries = (
                    (return_payload.get("best_flights") or [])
                    + (return_payload.get("other_flights") or [])
                )
                for return_itinerary in return_itineraries:
                    outbound_duration = outbound_itinerary.get("total_duration")
                    inbound_duration = return_itinerary.get("total_duration")
                    combined_itineraries.append({
                        **return_itinerary,
                        "flights": (
                            (outbound_itinerary.get("flights") or [])
                            + (return_itinerary.get("flights") or [])
                        ),
                        "airline_logo": (
                            return_itinerary.get("airline_logo")
                            or outbound_itinerary.get("airline_logo")
                        ),
                        "total_duration": (
                            (outbound_duration if isinstance(outbound_duration, int) else 0)
                            + (inbound_duration if isinstance(inbound_duration, int) else 0)
                        ),
                        "_outbound_segment_count": len(outbound_itinerary.get("flights") or []),
                    })

            combined_itineraries.sort(
                key=lambda itinerary: itinerary.get("price")
                if isinstance(itinerary.get("price"), (int, float))
                else float("inf")
            )
            search_payload = {"best_flights": combined_itineraries[:SERPAPI_FLIGHT_LIMIT]}

        itineraries = (search_payload.get("best_flights") or []) + (search_payload.get("other_flights") or [])
        booking_tokens = [
            itinerary.get("booking_token")
            for itinerary in itineraries[:SERPAPI_FLIGHT_LIMIT]
            if isinstance(itinerary.get("booking_token"), str)
        ]
        booking_requests_list = await asyncio.gather(
            *(
                fetch_booking_request(token)
                for token in booking_tokens
            ),
            return_exceptions=True,
        )

        booking_requests: Dict[str, BookingRequest | None] = {}
        for token, request in zip(booking_tokens, booking_requests_list):
            if isinstance(request, Exception):
                print(f"SerpApi booking options failed for {origin}->{dest}; token=[redacted]; error={request}")
                booking_requests[token] = None
            else:
                booking_requests[token] = request

        flights = parse_serpapi_results(search_payload, route, booking_requests)
        if flights:
            flight_dicts = flights.model_dump()
            flight_cache.set(route, flight_dicts)
            return flight_dicts

    except Exception as error:
        print(f"SerpApi error for {origin}->{dest}: {error}")

    return None


@app.post("/search")
async def search_flights(query: FlightSearchQuery):
    if not os.environ.get("SERPAPI_KEY"):
        raise HTTPException(
            status_code=500,
            detail="SERPAPI_KEY is not configured on the server.",
        )
    try:
        tasks = []
        results = []
        all_routes = list(parse_query(query))

        for origin, dest, departure_date, return_date in all_routes:
            route = FlightRoute(origin, dest, departure_date, return_date)
            cached_data = flight_cache.get(route)

            if cached_data:
                results.append(cached_data)
                continue

            task = asyncio.create_task(
                fetch_single_route(
                    origin,
                    dest,
                    departure_date.isoformat(),
                    route,
                    return_date.isoformat() if return_date else None,
                )
            )
            tasks.append(task)
            await asyncio.sleep(0.1)

        if tasks:
            api_results = await asyncio.gather(*tasks)
            results.extend([result for result in api_results if result is not None])

        results.sort(key=lambda result: result["flights"][0]["price"])
        return results[:6]

    except HTTPException:
        raise
    except Exception as error:
        print(f"Error: {error}")
        raise HTTPException(status_code=500, detail=str(error))


async def cache_cleaner():
    """Run cleanup every hour."""
    while True:
        try:
            await asyncio.sleep(3600)
            flight_cache.cleanup()
        except asyncio.CancelledError:
            break
        except Exception as error:
            print(f"Error in cache cleaner: {error}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)

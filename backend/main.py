from contextlib import asynccontextmanager

from amadeus import ResponseError
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import httpx
import os
import asyncio
import amadeus
from datetime import date, datetime
from typing import List, Dict, Any

from FlightCache import FlightCache
from data.FlightRoute import FlightRoute
from data.FlightSearchQuery import FlightSearchQuery
from data.FlightSearchResult import FlightSearchResult, FlightSegment, FlightSearchResultByCombination


@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_task = asyncio.create_task(cache_cleaner())
    yield

    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        print("Background cache cleaner error.") # TODO: Build proper logging

app = FastAPI(title="Flight Search Engine", lifespan=lifespan)
token = None 
base = "https://test.api.amadeus.com"  # or https://api.amadeus.com for prod

client = amadeus.Client(
    client_id=os.environ["AMADEUS_CLIENT_ID"],
    client_secret=os.environ["AMADEUS_CLIENT_SECRET"]
)

token_lock = asyncio.Lock() # this stops multiple versions calling the new create function
flight_cache = FlightCache()


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: replace with actual frontend URL
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
        "version": "2.0.0"
    }


async def fetch_single_route(origin, dest, dt_str, route):
    """
    This function handles one single amadeus API call.
    It will run in a separate thread.
    """
    try:
        response = await asyncio.to_thread(
            client.shopping.flight_offers_search.get,
            originLocationCode=origin,
            destinationLocationCode=dest,
            departureDate=dt_str,
            adults=1,
            currencyCode="USD",
            max=50
        )

        flights = parse_amadeus_results(response.data, route)
        if flights:
            flight_dicts = flights.model_dump()
            flight_cache.set(route, flight_dicts)
            return flight_dicts

    except ResponseError as error:
        if error.response.status_code == 429:
            print(f"Rate limit hit for {origin}->{dest}.")
            # TODO Retry here
        else: print(f"Amadeus Error for {origin}-{dest}: {error}")

    return None


@app.post("/search")
async def search_flights(query: FlightSearchQuery):
    try:
        tasks = []
        results = []
        all_routes = list(parse_query(query))

        for origin, dest, dt in all_routes:
            dt_str = dt.isoformat()
            route = FlightRoute(origin, dest, convert_string_to_date(dt_str))

            cached_data = flight_cache.get(route)

            if cached_data:
                results.append(cached_data)
            else:
                task = asyncio.create_task(fetch_single_route(origin, dest, dt_str, route))
                tasks.append(task)

                # Wait for 100ms to not hit Amadeus rate limit
                await asyncio.sleep(0.1)

        # Runs as soon as all api calls complete
        if tasks:
            api_results = await asyncio.gather(*tasks)
            results.extend([r for r in api_results if r is not None])


        results.sort(key=lambda r: r["flights"][0]["price"])
        return results[:6]

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def iso_duration_to_minutes(d: str) -> int: ## This is the parser for time
    # Ex: "PT6H10M", "PT45M", "PT7H"
    if not d or not d.startswith("PT"):
        raise ValueError(f"Bad duration: {d}")

    s = d[2:]  # strip "PT"
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
    # yields (origin, destination, date)
    for o in q.origins:
        for d in q.destinations:
            for dt in q.departure_dates:
                yield (o.upper().strip(), d.upper().strip(), dt)
   
   
def convert_string_to_datetime(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))

def convert_string_to_date(s: str) -> date:
    return datetime.fromisoformat(s.replace("Z", "+00:00")).date()
             
def parse_amadeus_results(amadeus_offers: List[Dict[str, Any]], route: FlightRoute) -> FlightSearchResultByCombination | None:
    flights: List[FlightSearchResult] = []

    for offer in amadeus_offers:
        itin = offer["itineraries"][0]
        dur_iso = itin.get("duration")
        if not dur_iso: 
            continue
        duration_minutes = iso_duration_to_minutes(dur_iso)

        segs = itin["segments"]

        segments = [
            FlightSegment(
                origin=s["departure"]["iataCode"],
                destination=s["arrival"]["iataCode"],
                start_time=convert_string_to_datetime(s["departure"]["at"]),
                end_time=convert_string_to_datetime(s["arrival"]["at"]),
            )
            for s in segs
        ]

        airline = (offer.get("validatingAirlineCodes") or [segs[0].get("carrierCode", "")])[0]
        price = float(offer["price"]["total"])

        flights.append(
            FlightSearchResult(
                airline=airline,
                price=price,
                segments=segments,
                duration_minutes=duration_minutes,
            )
        )

    if not flights:
        return None

    flights.sort(key=lambda r: r.price)

    return FlightSearchResultByCombination(
        date=route.date,
        origin=route.origin,
        destination=route.destination,
        flights=flights
    )



async def cache_cleaner():
    """Run cleanup every hour."""
    while True:
        try:
            await asyncio.sleep(3600)
            flight_cache.cleanup()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in cache cleaner: {e}")



if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
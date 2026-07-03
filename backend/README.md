# Backend

FastAPI service for flight search. It queries SerpApi's Google Flights engine and exposes HTTP endpoints for the frontend.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copy the example environment file and fill in your SerpApi API key:

```bash
cp environment.env.example environment.env
```

```env
SERPAPI_KEY=your_api_key
```

The backend automatically loads `backend/environment.env` for local development. Values already exported in your shell take priority over values in the file. `export KEY=value` lines are also accepted.

`SERPAPI_KEY` is required. If it is missing, the backend emits a `MissingConfigurationWarning` (via Python's `warnings` module) on startup and `/search` returns HTTP 500 (rather than silently returning an empty result list). Because it is a real warning, it can be caught in tests or escalated to a hard startup failure with `warnings.simplefilter("error", MissingConfigurationWarning)`. The legacy `AMADEUS_*` variables are deprecated and no longer read.

## Notes

- The current search flow uses one-way Google Flights searches because the backend query model only carries departure dates.
- SerpApi returns booking options separately. The backend resolves those into:
  - `booking_url` for direct `GET` deeplinks
  - `booking_request` for actions that require a server-side `POST`
- The frontend currently enables `Select` only when `booking_url` is available.

## Run

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

## Test

Install the development dependencies, then run the pytest unit tests:

```bash
pip install -r requirements-dev.txt
python -m pytest
```

Run the tests with a coverage report:

```bash
python -m pytest --cov=main --cov=FlightCache --cov=data --cov-report=term-missing --cov-report=html
```

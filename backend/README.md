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

The backend automatically loads `backend/environment.env` for local development. Values already exported in your shell take priority over values in the file.

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

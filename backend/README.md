# Backend

FastAPI service for flight search. It queries the Amadeus API and exposes HTTP endpoints for the frontend.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copy the example environment file and fill in your Amadeus credentials:

```bash
cp environment.env.example environment.env
```

```env
AMADEUS_CLIENT_ID=your_client_id
AMADEUS_CLIENT_SECRET=your_client_secret
AMADEUS_BASE_URL=https://test.api.amadeus.com
```

The backend automatically loads `backend/environment.env` for local development. Values already exported in your shell take priority over values in the file.

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

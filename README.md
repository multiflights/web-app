# Flight Search Engine

A tool to search for flights with multiple route and date options.

## Prerequisites

- Python 3.x
- Node.js
- An [Amadeus API](https://developers.amadeus.com/) account (for client ID, secret, and base URL)

## Backend

The backend is a FastAPI server using the Amadeus API.

### Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copy the example env file and fill in your Amadeus credentials:

```bash
cp environment.env.example environment.env
```

```
AMADEUS_CLIENT_ID=your_client_id
AMADEUS_CLIENT_SECRET=your_client_secret
AMADEUS_BASE_URL=https://test.api.amadeus.com
```

### Run

```bash
source environment.env
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

## Frontend

The frontend is a React + Vite app with Tailwind CSS.

### Setup

```bash
cd frontend
npm install
```

Copy the example env file and set the backend URL:

```bash
cp environment.env.example environment.env
```

```
VITE_BACKEND_URL=http://localhost:8000
```

### Run

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

# Frontend

React + Vite app for searching flights through the backend API.

## Setup

```bash
cd frontend
npm install
```

Copy the example environment file and set the backend URL:

```bash
cp environment.env.example environment.env
```

```env
VITE_BACKEND_URL=http://localhost:8000
```

## Run

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Test

Run the Vitest unit tests:

```bash
npm test
```

Run the tests with a coverage report:

```bash
npm run test:coverage
```

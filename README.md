# Flight Search Engine

A web application for comparing flights across multiple airports and travel dates in a single search.

## Why We Built It

We like to explore every viable route and date before booking a trip. When several airports and dates are in play, that can mean juggling dozens of tabs and side-by-side searches.

We built Flight Search Engine to bring those combinations into one place, making it easier to find an affordable itinerary that fits the trip.

## Features

- Search combinations of multiple origin and destination airports.
- Compare one-way or round-trip flights across date ranges.
- View routes, schedules, prices, and available booking links.
- Display prices in a preferred currency.
- Share or revisit searches through URL parameters.

## Project Structure

- [`backend/`](backend/README.md) — FastAPI service that retrieves Google Flights results through SerpApi.
- [`frontend/`](frontend/README.md) — React, TypeScript, and Vite web application.

## How to Run

The backend and frontend are configured and run separately. Follow each component's README for its prerequisites, environment variables, setup, run, and test commands:

1. [Set up and run the backend](backend/README.md)
2. [Set up and run the frontend](frontend/README.md)

Run both services for local development. By default, the API is available at `http://localhost:8000` and the web application at `http://localhost:5173`.

## Deploy with GitHub Actions

The included workflows deploy the application as two services:

- [Backend workflow](.github/workflows/deploy-backend-cloud-run.yml) — builds the backend container and deploys it to Google Cloud Run.
- [Frontend workflow](.github/workflows/deploy-frontend-netlify.yml) — tests and builds the frontend, then deploys it to Netlify.

### 1. Prepare Google Cloud

Create or select a billing-enabled Google Cloud project, then:

1. Enable the Cloud Run and Artifact Registry APIs.
2. Create a service account for GitHub Actions.
3. Grant it permission to administer Artifact Registry and Cloud Run, plus permission to act as the Cloud Run runtime service account.
4. Create a JSON key for the service account. Store the complete JSON document as the `GCP_SA_KEY` GitHub secret; never commit it to the repository.

The backend workflow creates the configured Artifact Registry repository if it does not already exist.

### 2. Prepare external services

- Create a [SerpApi](https://serpapi.com/) account and API key.
- Create or select a Netlify site and generate a Netlify personal access token.

### 3. Configure GitHub

In the repository's **Settings → Secrets and variables → Actions**, add:

| Type | Name | Required | Description |
| --- | --- | --- | --- |
| Secret | `GCP_SA_KEY` | Yes | Complete JSON key for the Google Cloud service account. |
| Secret | `SERPAPI_KEY` | Yes | SerpApi key passed to the Cloud Run service. |
| Secret | `NETLIFY_AUTH_TOKEN` | Yes | Token authorized to deploy the Netlify site. |
| Variable | `GCP_PROJECT_ID` | Yes | Google Cloud project ID. |
| Variable | `GCP_REGION` | Yes | Deployment region, such as `europe-west1`. |
| Variable | `NETLIFY_SITE_ID` | Yes | API ID of the target Netlify site. |
| Variable | `GAR_REPOSITORY` | No | Artifact Registry repository name. Defaults to `flight-search-backend`. |
| Variable | `CLOUD_RUN_SERVICE` | No | Cloud Run service name. Defaults to `flight-search-backend`. |
| Variable | `VITE_BACKEND_URL` | No | Explicit public backend URL. When omitted, the frontend workflow resolves the Cloud Run service URL. |

### 4. Deploy

Run **Deploy Backend to Cloud Run** from the repository's **Actions** tab. After a successful backend deployment, the frontend workflow runs automatically and deploys the production build to Netlify.

Subsequent pushes to `main` deploy only the affected service:

- Changes under `backend/` trigger the backend deployment, followed by the frontend deployment.
- Changes under `frontend/` trigger the frontend deployment directly.

Both workflows can also be started manually with **Run workflow**.

## Support the Project

<!-- TODO: Replace this placeholder with a linked Buy Me a Coffee button once the account URL is available. -->

_Buy us a coffee link coming soon._

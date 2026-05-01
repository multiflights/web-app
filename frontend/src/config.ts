export const config = {
  apiUrl: import.meta.env.PROD
    ? 'https://flight-search-engine-backend-999820369908.us-east1.run.app'
    : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'),

  isProd: import.meta.env.PROD
};
import time
from typing import List, Dict

from data.FlightRoute import FlightRoute
from data.FlightSearchResult import FlightSearchResult


class FlightCache:
    def __init__(self, ttl_seconds: int = 86400):  # Default 24h
        self._cache = {}
        self.ttl = ttl_seconds

    def get(self, route: FlightRoute) -> FlightSearchResult:
        key = self._key(route)
        entry = self._cache.get(key)
        if not entry:
            return None

        # Check if expired
        if time.time() > entry["expiry"]:
            del self._cache[key]
            return None

        return entry["data"]

    def set(self, route: FlightRoute, data: List[Dict]):
        key = self._key(route)
        self._cache[key] = {
            "expiry": time.time() + self.ttl,
            "data": data
        }

    @staticmethod
    def _key(route: FlightRoute) -> str:
        return f"{route.origin}:{route.destination}:{route.date}:{route.return_date or 'one-way'}"

    def cleanup(self):
        """Remove all expired entries to free memory."""
        now = time.time()
        expired_keys = [k for k, v in self._cache.items() if now > v["expiry"]]
        for k in expired_keys:
            del self._cache[k]

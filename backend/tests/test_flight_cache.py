from datetime import date

from FlightCache import FlightCache
from data.FlightRoute import FlightRoute


def test_cache_returns_stored_data_before_expiry():
    cache = FlightCache(ttl_seconds=60)
    route = FlightRoute("JFK", "LAX", date(2026, 6, 12))
    data = [{"flights": [{"price": 250}]}]

    cache.set(route, data)

    assert cache.get(route) == data


def test_cache_misses_unknown_route():
    cache = FlightCache(ttl_seconds=60)

    assert cache.get(FlightRoute("JFK", "LAX", date(2026, 6, 12))) is None


def test_cache_keeps_one_way_and_round_trip_searches_separate():
    cache = FlightCache(ttl_seconds=60)
    one_way = FlightRoute("JFK", "LAX", date(2026, 6, 12))
    round_trip = FlightRoute(
        "JFK",
        "LAX",
        date(2026, 6, 12),
        date(2026, 6, 20),
    )

    cache.set(one_way, [{"trip": "one-way"}])
    cache.set(round_trip, [{"trip": "round-trip"}])

    assert cache.get(one_way) == [{"trip": "one-way"}]
    assert cache.get(round_trip) == [{"trip": "round-trip"}]


def test_cache_expires_entries(monkeypatch):
    cache = FlightCache(ttl_seconds=10)
    route = FlightRoute("JFK", "LAX", date(2026, 6, 12))

    monkeypatch.setattr("FlightCache.time.time", lambda: 1000)
    cache.set(route, [{"flights": []}])

    monkeypatch.setattr("FlightCache.time.time", lambda: 1011)

    assert cache.get(route) is None
    assert cache._cache == {}


def test_cleanup_removes_only_expired_entries(monkeypatch):
    cache = FlightCache(ttl_seconds=10)
    expired_route = FlightRoute("JFK", "LAX", date(2026, 6, 12))
    active_route = FlightRoute("BOS", "SFO", date(2026, 6, 13))

    monkeypatch.setattr("FlightCache.time.time", lambda: 1000)
    cache.set(expired_route, [{"flights": ["expired"]}])

    monkeypatch.setattr("FlightCache.time.time", lambda: 1005)
    cache.set(active_route, [{"flights": ["active"]}])

    monkeypatch.setattr("FlightCache.time.time", lambda: 1011)
    cache.cleanup()

    assert cache.get(expired_route) is None
    assert cache.get(active_route) == [{"flights": ["active"]}]

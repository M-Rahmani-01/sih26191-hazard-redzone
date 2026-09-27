"""
Simple in-memory result cache. Priority-list sirf tab recompute hoti hai
jab data ya overrides change ho — warna cached result serve hota hai.
"""

import time

_cache = {"data": None, "computed_at": None, "key": None}
CACHE_TTL_SECONDS = 30  # itni der tak same result reuse hoga


def get_cached(key: str):
    if _cache["key"] == key and _cache["data"] is not None:
        age = time.time() - _cache["computed_at"]
        if age < CACHE_TTL_SECONDS:
            return _cache["data"]
    return None


def set_cache(key: str, data):
    _cache["key"] = key
    _cache["data"] = data
    _cache["computed_at"] = time.time()


def invalidate_cache():
    _cache["key"] = None
    _cache["data"] = None
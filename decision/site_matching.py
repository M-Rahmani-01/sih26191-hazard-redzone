"""
Har high-risk village ke liye nearest safe relocation site dhundta hai,
KD-tree se efficient lookup (bade datasets ke liye scale karta hai).
"""

import numpy as np
from scipy.spatial import cKDTree
from decision.carrying_capacity import compute_carrying_capacity

_site_tree_cache = {"tree": None, "sites_df": None}


def _build_tree(sites_df):
    coords = sites_df[["latitude", "longitude"]].to_numpy()
    tree = cKDTree(coords)
    _site_tree_cache["tree"] = tree
    _site_tree_cache["sites_df"] = sites_df
    return tree


def find_nearest_site(village_lat: float, village_lon: float, sites_df) -> dict:
    if _site_tree_cache["tree"] is None or not _site_tree_cache["sites_df"].equals(sites_df):
        tree = _build_tree(sites_df)
    else:
        tree = _site_tree_cache["tree"]

    _, idx = tree.query([village_lat, village_lon])
    best_site = sites_df.iloc[idx]

    # approx haversine for the matched pair only (accurate distance display ke liye)
    R = 6371
    lat1, lon1 = np.radians(village_lat), np.radians(village_lon)
    lat2, lon2 = np.radians(best_site["latitude"]), np.radians(best_site["longitude"])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    distance_km = R * 2 * np.arcsin(np.sqrt(a))

    capacity = compute_carrying_capacity(
        usable_area_sqkm=best_site["usable_area_sqkm"],
        safety_buffer_pct=best_site["safety_buffer_pct"],
        existing_occupancy=int(best_site["existing_occupancy"]),
    )

    return {
        "recommended_site": best_site["site_name"],
        "distance_km": round(float(distance_km), 1),
        "site_remaining_capacity": capacity,
    }
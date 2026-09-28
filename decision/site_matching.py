"""
Har high-risk village ke liye nearest safe relocation site dhundta hai,
KD-tree se efficient lookup, aur ek hi run ke andar allocations ko
site-wise track karta hai taaki capacity dobara na bat jaye.
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


def _get_tree(sites_df):
    if _site_tree_cache["tree"] is None or not _site_tree_cache["sites_df"].equals(sites_df):
        return _build_tree(sites_df)
    return _site_tree_cache["tree"]


def init_allocation_tracker(sites_df) -> dict:
    """
    Har site ke liye starting remaining-capacity nikalta hai.
    Isse ek dict banta hai jo poore priority_ranking run mein pass hoga,
    taaki ek site se allocate hui jagah agli village ke liye ghat jaye.
    """
    tracker = {}
    for _, site in sites_df.iterrows():
        tracker[site["site_name"]] = compute_carrying_capacity(
            usable_area_sqkm=site["usable_area_sqkm"],
            safety_buffer_pct=site["safety_buffer_pct"],
            existing_occupancy=int(site["existing_occupancy"]),
        )
    return tracker


def find_nearest_site(village_lat: float, village_lon: float, sites_df,
                       allocation_tracker: dict, village_population: int = 0) -> dict:
    tree = _get_tree(sites_df)

    # Har candidate site ko nearest-first order mein check karo,
    # jis site mein capacity bachi ho wahi assign karo.
    k = min(len(sites_df), 5)
    distances, indices = tree.query([village_lat, village_lon], k=k)
    if k == 1:
        distances, indices = [distances], [indices]

    for dist_deg, idx in zip(np.atleast_1d(distances), np.atleast_1d(indices)):
        site = sites_df.iloc[idx]
        site_name = site["site_name"]
        remaining = allocation_tracker.get(site_name, 0)

        if remaining > 0:
            R = 6371
            lat1, lon1 = np.radians(village_lat), np.radians(village_lon)
            lat2, lon2 = np.radians(site["latitude"]), np.radians(site["longitude"])
            dlat, dlon = lat2 - lat1, lon2 - lon1
            a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
            distance_km = R * 2 * np.arcsin(np.sqrt(a))

            allocation_tracker[site_name] = max(0, remaining - village_population)

            return {
                "recommended_site": site_name,
                "distance_km": round(float(distance_km), 1),
                "site_remaining_capacity": allocation_tracker[site_name],
            }

    # Koi bhi nearby site mein jagah nahi bachi
    return {
        "recommended_site": None,
        "distance_km": None,
        "site_remaining_capacity": 0,
    }
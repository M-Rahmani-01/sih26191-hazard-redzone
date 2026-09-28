import json
import pandas as pd
from features.hex_grid_builder import assign_villages_to_hex
from data_ingestion.dem_adapter import load_and_validate
from data_ingestion.site_adapter import load_sites
from scoring.landslide import LandslideScorer
from decision.redzone_tiering import assign_tier
from decision.site_matching import find_nearest_site, init_allocation_tracker
from decision.cache import get_cached, set_cache


def compute_priority_list(overrides: dict | None = None) -> pd.DataFrame:
    cache_key = json.dumps(overrides, sort_keys=True) if overrides else "baseline"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached.copy()

    df = load_and_validate()
    df = assign_villages_to_hex(df)
    sites_df = load_sites()
    allocation_tracker = init_allocation_tracker(sites_df)

    if overrides:
        for village_name, changed_features in overrides.items():
            mask = df["village_name"] == village_name
            for feature, value in changed_features.items():
                column_map = {
                    "slope": "slope_degrees",
                    "rainfall_intensity": "rainfall_intensity_mm",
                    "past_incidents": "past_incidents",
                    "population_density": "population_density",
                }
                col = column_map.get(feature, feature)
                if col in df.columns:
                    df.loc[mask, col] = value

    scorer = LandslideScorer()
    scores, confidences, tiers, breakdowns = [], [], [], []
    recommended_sites, distances, site_capacities = [], [], []

    for _, row in df.iterrows():
        features = {
            "slope": row["slope_degrees"],
            "rainfall_intensity": row["rainfall_intensity_mm"],
            "past_incidents": row["past_incidents"],
            "population_density": row["population_density"],
        }
        score, confidence = scorer.score(features)
        tier = assign_tier(score, scorer.thresholds)

        scores.append(score)
        confidences.append(confidence)
        tiers.append(tier)
        breakdowns.append(scorer.explain(features))

        if tier in ("Red", "Critical"):
            match = find_nearest_site(row["latitude"], row["longitude"], sites_df, allocation_tracker, int(row["population"]))
            recommended_sites.append(match["recommended_site"])
            distances.append(match["distance_km"])
            site_capacities.append(match["site_remaining_capacity"])
        else:
            recommended_sites.append(None)
            distances.append(None)
            site_capacities.append(None)

    df["hazard_score"] = scores
    df["confidence"] = confidences
    df["tier"] = tiers
    df["breakdown"] = breakdowns
    df["recommended_site"] = recommended_sites
    df["distance_to_site_km"] = distances
    df["site_remaining_capacity"] = site_capacities

    ranked = df.sort_values("hazard_score", ascending=False).reset_index(drop=True)
    ranked["priority_rank"] = ranked.index + 1

    result = ranked[[
        "priority_rank", "village_name", "tehsil", "hazard_score", "tier", "confidence",
        "hex_id", "breakdown", "recommended_site", "distance_to_site_km", "site_remaining_capacity",
        "elevation_m", "population", "distance_to_river_km", "latitude", "longitude",
    ]]
    set_cache(cache_key, result)
    return result


if __name__ == "__main__":
    result = compute_priority_list()
    print(result[["priority_rank", "village_name", "hazard_score", "tier", "recommended_site", "site_remaining_capacity"]].to_string(index=False))
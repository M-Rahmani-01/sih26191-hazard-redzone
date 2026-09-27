"""
DEM / terrain-and-hazard-features adapter.

Production mein ye Bhuvan/SRTM DEM raster se slope nikalega. Abhi
sample_dataset.csv (Rudraprayag district ke real villages/tehsils,
approximate values) se load karta hai taaki pipeline end-to-end
test ho sake.
"""

import pandas as pd
from pathlib import Path

RAW_PATH = Path(__file__).parent.parent / "data" / "sample_dataset_real_slope.csv"
REQUIRED_COLUMNS = [
    "village_name", "tehsil", "latitude", "longitude",
    "elevation_m", "slope_degrees", "rainfall_intensity_mm",
    "population", "population_density", "past_incidents",
    "distance_to_river_km",
]

VALID_RANGES = {
    "latitude": (-90, 90),
    "longitude": (-180, 180),
    "slope_degrees": (0, 90),
    "rainfall_intensity_mm": (0, 5000),
    "population": (0, None),
    "population_density": (0, None),
    "past_incidents": (0, None),
    "distance_to_river_km": (0, None),
}


def load_and_validate(path: Path = RAW_PATH) -> pd.DataFrame:
    df = pd.read_csv(path)

    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns: {missing_cols}")

    rejected_rows = []
    for col, (min_val, max_val) in VALID_RANGES.items():
        if min_val is not None:
            bad = df[df[col] < min_val]
            if not bad.empty:
                rejected_rows.append((col, "below_min", bad.index.tolist()))
        if max_val is not None:
            bad = df[df[col] > max_val]
            if not bad.empty:
                rejected_rows.append((col, "above_max", bad.index.tolist()))

    if rejected_rows:
        print(f"[dem_adapter] Flagged out-of-range rows: {rejected_rows}")

    df["source"] = "sample_rudraprayag_v1"
    return df


if __name__ == "__main__":
    data = load_and_validate()
    print(data.head())
    print(f"\nLoaded {len(data)} habitation records from Rudraprayag district.")
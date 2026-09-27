"""
Real DEM (SRTM 30m) se Rudraprayag district ka actual slope nikalta hai,
OpenTopography API se. .env mein OPENTOPOGRAPHY_API_KEY chahiye.
"""

import os
import requests
import numpy as np
import rasterio
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENTOPOGRAPHY_API_KEY")
DEM_OUTPUT_PATH = Path(__file__).parent.parent / "data" / "rudraprayag_dem.tif"

# Rudraprayag district ka bounding box (saari villages cover karta hai)
BBOX = {"south": 30.10, "north": 30.80, "west": 78.60, "east": 79.35}


def download_dem():
    if DEM_OUTPUT_PATH.exists():
        print(f"[dem_real_adapter] DEM already exists at {DEM_OUTPUT_PATH}, skipping download.")
        return DEM_OUTPUT_PATH

    if not API_KEY:
        raise ValueError("OPENTOPOGRAPHY_API_KEY not found in .env file")

    url = "https://portal.opentopography.org/API/globaldem"
    params = {
        "demtype": "SRTMGL1",
        "south": BBOX["south"],
        "north": BBOX["north"],
        "west": BBOX["west"],
        "east": BBOX["east"],
        "outputFormat": "GTiff",
        "API_Key": API_KEY,
    }

    print("[dem_real_adapter] Downloading real SRTM DEM for Rudraprayag...")
    response = requests.get(url, params=params, timeout=60)
    response.raise_for_status()

    DEM_OUTPUT_PATH.parent.mkdir(exist_ok=True)
    with open(DEM_OUTPUT_PATH, "wb") as f:
        f.write(response.content)

    print(f"[dem_real_adapter] DEM saved to {DEM_OUTPUT_PATH} ({len(response.content)} bytes)")
    return DEM_OUTPUT_PATH


def compute_slope_raster(dem_path: Path):
    """DEM se slope (degrees) nikalta hai using simple gradient method."""
    with rasterio.open(dem_path) as src:
        elevation = src.read(1).astype(float)
        transform = src.transform
        pixel_size_x = transform[0]
        pixel_size_y = -transform[4]

        # approx meters-per-degree at this latitude (Rudraprayag ~30°N)
        meters_per_deg_lat = 111320
        meters_per_deg_lon = 111320 * np.cos(np.radians(30.4))

        dy, dx = np.gradient(elevation, pixel_size_y * meters_per_deg_lat, pixel_size_x * meters_per_deg_lon)
        slope_rad = np.arctan(np.sqrt(dx ** 2 + dy ** 2))
        slope_deg = np.degrees(slope_rad)

        return slope_deg, src.transform, src.crs


def get_slope_at_point(slope_raster, transform, lat: float, lon: float) -> float:
    """Ek lat/lon coordinate pe slope value nikalta hai."""
    row, col = rasterio.transform.rowcol(transform, lon, lat)
    row = max(0, min(row, slope_raster.shape[0] - 1))
    col = max(0, min(col, slope_raster.shape[1] - 1))
    return round(float(slope_raster[row, col]), 1)
def build_real_slope_dataset():
    """Saari villages ke liye real slope nikal ke CSV update karta hai."""
    import pandas as pd
    from data_ingestion.dem_adapter import load_and_validate

    dem_path = download_dem()
    slope_raster, transform, crs = compute_slope_raster(dem_path)

    df = load_and_validate()
    real_slopes = []
    for _, row in df.iterrows():
        slope = get_slope_at_point(slope_raster, transform, row["latitude"], row["longitude"])
        real_slopes.append(slope)

    df["slope_degrees_synthetic"] = df["slope_degrees"]
    df["slope_degrees"] = real_slopes

    output_path = Path(__file__).parent.parent / "data" / "sample_dataset_real_slope.csv"
    df.drop(columns=["source"]).to_csv(output_path, index=False)
    print(f"\n[dem_real_adapter] Updated dataset saved to {output_path}")
    print(df[["village_name", "slope_degrees_synthetic", "slope_degrees"]].to_string(index=False))


if __name__ == "__main__":
    dem_path = download_dem()
    slope_raster, transform, crs = compute_slope_raster(dem_path)

    # test: apni known villages ke real slope values dikhao
    test_points = {
        "Kedarpuri": (30.7346, 79.0669),
        "Rudraprayag": (30.2846, 78.9811),
        "Ukhimath": (30.5183, 79.0953),
    }
    for name, (lat, lon) in test_points.items():
        real_slope = get_slope_at_point(slope_raster, transform, lat, lon)
        print(f"{name}: real slope = {real_slope}°")

    print("\n--- Building full real-slope dataset ---")
    build_real_slope_dataset()


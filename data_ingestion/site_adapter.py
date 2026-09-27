"""
Relocation sites adapter — safe/lower-risk towns jahan log shift ho sakte hain.
"""

import pandas as pd
from pathlib import Path

SITES_PATH = Path(__file__).parent.parent / "data" / "relocation_sites.csv"


def load_sites(path: Path = SITES_PATH) -> pd.DataFrame:
    df = pd.read_csv(path)
    required = ["site_name", "latitude", "longitude", "usable_area_sqkm", "safety_buffer_pct", "existing_occupancy"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in relocation_sites.csv: {missing}")
    return df
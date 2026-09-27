import pandas as pd
from features.hex_grid_builder import assign_villages_to_hex
from data_ingestion.dem_adapter import load_and_validate


def test_villages_get_hex_id():
    df = load_and_validate()
    result = assign_villages_to_hex(df)
    assert "hex_id" in result.columns
    assert result["hex_id"].notnull().all()
    assert result["hex_id"].nunique() > 1  # kam se kam 2 alag hex cells honi chahiye
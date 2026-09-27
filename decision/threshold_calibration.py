"""
Data-driven threshold calibration: hazard scores ki quartile distribution
se Safe/Watch/Red/Critical thresholds nikalta hai, hardcoded guess ki jagah.
"""

import numpy as np


def calibrate_thresholds(scores: list[float]) -> dict:
    """
    scores: saari scored habitations ke hazard_score values
    Returns: {"safe": ..., "watch": ..., "red": ...} — 25th/50th/75th percentile
    """
    scores_arr = np.array(scores)
    return {
        "safe": round(float(np.percentile(scores_arr, 25)), 3),
        "watch": round(float(np.percentile(scores_arr, 50)), 3),
        "red": round(float(np.percentile(scores_arr, 75)), 3),
    }


if __name__ == "__main__":
    from decision.priority_ranking import compute_priority_list
    df = compute_priority_list()
    new_thresholds = calibrate_thresholds(df["hazard_score"].tolist())
    print("Recalibrated thresholds (from real-data score distribution):")
    print(new_thresholds)
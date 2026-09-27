"""
Pure decision-logic: hazard score → zone tier.
Scoring engine se independent — koi bhi hazard type (landslide/flood/erosion)
isi function ko use kar sakta hai, bas apne thresholds pass karke.
"""


def assign_tier(hazard_score: float, thresholds: dict) -> str:
    if hazard_score < thresholds["safe"]:
        return "Safe"
    elif hazard_score < thresholds["watch"]:
        return "Watch"
    elif hazard_score < thresholds["red"]:
        return "Red"
    else:
        return "Critical"
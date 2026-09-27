from decision.redzone_tiering import assign_tier
from decision.carrying_capacity import compute_carrying_capacity

THRESHOLDS = {"safe": 0.30, "watch": 0.55, "red": 0.75, "critical": 0.90}


def test_tier_boundaries():
    assert assign_tier(0.10, THRESHOLDS) == "Safe"
    assert assign_tier(0.40, THRESHOLDS) == "Watch"
    assert assign_tier(0.60, THRESHOLDS) == "Red"
    assert assign_tier(0.95, THRESHOLDS) == "Critical"


def test_carrying_capacity_basic():
    capacity = compute_carrying_capacity(usable_area_sqkm=2.0, safety_buffer_pct=0.2, existing_occupancy=300)
    assert capacity > 0


def test_carrying_capacity_full_site_returns_zero():
    capacity = compute_carrying_capacity(usable_area_sqkm=1.0, safety_buffer_pct=0.5, existing_occupancy=100000)
    assert capacity == 0

def test_site_matching_only_for_high_risk():
    from decision.priority_ranking import compute_priority_list
    result = compute_priority_list()
    red_zones = result[result["tier"].isin(["Red", "Critical"])]
    safe_zones = result[~result["tier"].isin(["Red", "Critical"])]
    assert red_zones["recommended_site"].notna().all()
    assert safe_zones["recommended_site"].isna().all()
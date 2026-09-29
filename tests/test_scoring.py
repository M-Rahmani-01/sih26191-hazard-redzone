from scoring.landslide import LandslideScorer
from scoring.flood import FloodScorer
from scoring.erosion import ErosionScorer


def test_landslide_score_range():
    scorer = LandslideScorer()
    score, confidence = scorer.score({
        "slope": 45, "rainfall_intensity": 250,
        "past_incidents": 3, "population_density": 800
    })
    assert 0 <= score <= 1
    assert 0 <= confidence <= 1


def test_flood_scorer_plugs_into_same_interface():
    scorer = FloodScorer()
    score, confidence = scorer.score({
        "distance_to_river_km": 0.5, "rainfall_intensity": 2000,
        "past_incidents": 2, "population_density": 600
    })
    assert 0 <= score <= 1
    assert 0 <= confidence <= 1
    # nadi ke bahut paas hona zyada risk dena chahiye (inverted distance)
    near_score, _ = scorer.score({"distance_to_river_km": 0.1, "rainfall_intensity": 1000, "past_incidents": 0, "population_density": 0})
    far_score, _ = scorer.score({"distance_to_river_km": 4.9, "rainfall_intensity": 1000, "past_incidents": 0, "population_density": 0})
    assert near_score > far_score


def test_erosion_scorer_plugs_into_same_interface():
    scorer = ErosionScorer()
    score, confidence = scorer.score({
        "distance_to_river_km": 0.5, "slope": 30,
        "rainfall_intensity": 1800, "past_incidents": 1
    })
    assert 0 <= score <= 1
    assert 0 <= confidence <= 1
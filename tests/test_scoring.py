from scoring.landslide import LandslideScorer

def test_landslide_score_range():
    scorer = LandslideScorer()
    score, confidence = scorer.score({
        "slope": 45, "rainfall_intensity": 250,
        "past_incidents": 3, "population_density": 800
    })
    assert 0 <= score <= 1
    assert 0 <= confidence <= 1
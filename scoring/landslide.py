import yaml
from pathlib import Path
from scoring.base import HazardScorer

CONFIG_PATH = Path(__file__).parent / "config" / "weights.yaml"

FEATURE_NAMES = ["slope", "rainfall_intensity", "past_incidents", "population_density"]


class LandslideScorer(HazardScorer):
    def __init__(self):
        with open(CONFIG_PATH, "r") as f:
            config = yaml.safe_load(f)["landslide"]
        self.weights = config["weights"]
        self.thresholds = config["thresholds"]
        self.ranges = config["normalization"]

    def _normalize(self, name: str, value: float) -> float:
        low, high = self.ranges[name]
        if high == low:
            return 0.0
        return max(0.0, min(1.0, (value - low) / (high - low)))

    def score(self, features: dict) -> tuple[float, float]:
        hazard_score = sum(
            self.weights[name] * self._normalize(name, features.get(name, 0))
            for name in FEATURE_NAMES
        )
        missing = sum(1 for name in FEATURE_NAMES if name not in features)
        confidence = 1.0 - (missing * 0.2)
        return round(hazard_score, 4), round(max(confidence, 0.2), 2)

    def explain(self, features: dict) -> list[dict]:
        breakdown = []
        for name in FEATURE_NAMES:
            raw = features.get(name, 0)
            norm = self._normalize(name, raw)
            weight = self.weights[name]
            breakdown.append({
                "factor": name,
                "raw_value": raw,
                "normalized_value": round(norm, 3),
                "weight": weight,
                "contribution": round(norm * weight, 4),
            })
        breakdown.sort(key=lambda f: f["contribution"], reverse=True)
        return breakdown
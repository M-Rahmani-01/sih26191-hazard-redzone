import yaml
from pathlib import Path
from scoring.base import HazardScorer

CONFIG_PATH = Path(__file__).parent / "config" / "weights.yaml"


class LandslideScorer(HazardScorer):
    def __init__(self):
        with open(CONFIG_PATH, "r") as f:
            config = yaml.safe_load(f)["landslide"]
        self.weights = config["weights"]
        self.thresholds = config["thresholds"]

    def _normalize(self, value: float, min_val: float, max_val: float) -> float:
        if max_val == min_val:
            return 0.0
        return max(0.0, min(1.0, (value - min_val) / (max_val - min_val)))

    def score(self, features: dict) -> tuple[float, float]:
        norm_slope = self._normalize(features.get("slope", 0), 0, 90)
        norm_rainfall = self._normalize(features.get("rainfall_intensity", 0), 0, 500)
        norm_incidents = self._normalize(features.get("past_incidents", 0), 0, 10)
        norm_population = self._normalize(features.get("population_density", 0), 0, 5000)

        hazard_score = (
            self.weights["slope"] * norm_slope
            + self.weights["rainfall_intensity"] * norm_rainfall
            + self.weights["past_incidents"] * norm_incidents
            + self.weights["population_density"] * norm_population
        )

        missing = sum(1 for k in ["slope", "rainfall_intensity", "past_incidents", "population_density"] if k not in features)
        confidence = 1.0 - (missing * 0.2)

        return round(hazard_score, 4), round(max(confidence, 0.2), 2)
    def explain(self, features: dict) -> dict:
        """
        Har factor ka raw value, normalized value, weight, aur contribution
        (weight x normalized) return karta hai — explainability panel ke liye.
        """
        norm_slope = self._normalize(features.get("slope", 0), 0, 90)
        norm_rainfall = self._normalize(features.get("rainfall_intensity", 0), 0, 500)
        norm_incidents = self._normalize(features.get("past_incidents", 0), 0, 10)
        norm_population = self._normalize(features.get("population_density", 0), 0, 5000)

        factors = {
            "slope": (features.get("slope", 0), norm_slope, self.weights["slope"]),
            "rainfall_intensity": (features.get("rainfall_intensity", 0), norm_rainfall, self.weights["rainfall_intensity"]),
            "past_incidents": (features.get("past_incidents", 0), norm_incidents, self.weights["past_incidents"]),
            "population_density": (features.get("population_density", 0), norm_population, self.weights["population_density"]),
        }

        breakdown = []
        for name, (raw, norm, weight) in factors.items():
            breakdown.append({
                "factor": name,
                "raw_value": raw,
                "normalized_value": round(norm, 3),
                "weight": weight,
                "contribution": round(norm * weight, 4),
            })

        breakdown.sort(key=lambda f: f["contribution"], reverse=True)
        return breakdown
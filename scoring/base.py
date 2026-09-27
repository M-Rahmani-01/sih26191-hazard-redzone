from abc import ABC, abstractmethod
from typing import Dict, Tuple


class HazardScorer(ABC):
    """Common interface every hazard scoring module must implement."""

    @abstractmethod
    def score(self, features: Dict[str, float]) -> Tuple[float, float]:
        """
        features: dict of feature_name -> value for one hex cell
        returns: (hazard_score in [0,1], confidence in [0,1])
        """
        raise NotImplementedError
from pydantic import BaseModel


class FactorContribution(BaseModel):
    factor: str
    raw_value: float
    normalized_value: float
    weight: float
    contribution: float

class HabitationResult(BaseModel):
    priority_rank: int
    village_name: str
    tehsil: str
    hazard_score: float
    tier: str
    confidence: float
    hex_id: str
    breakdown: list[FactorContribution]
    recommended_site: str | None = None
    distance_to_site_km: float | None = None
    site_remaining_capacity: int | None = None
    elevation_m: float
    population: int
    distance_to_river_km: float
    latitude: float
    longitude: float


class PriorityListResponse(BaseModel):
    count: int
    source: str
    results: list[HabitationResult]

class SimulateEventRequest(BaseModel):
    village_name: str
    rainfall_intensity: float | None = None
    past_incidents: int | None = None

class HistoryEntry(BaseModel):
    village_name: str
    hazard_score: float
    tier: str
    priority_rank: int
    triggered_by: str
    timestamp: str


class HistoryResponse(BaseModel):
    village_name: str
    history: list[HistoryEntry]

class CriticalVillageCount(BaseModel):
    village_name: str
    critical_count: int


class RecentEvent(BaseModel):
    village_name: str
    hazard_score: float
    tier: str
    triggered_by: str
    timestamp: str


class AnalyticsResponse(BaseModel):
    total_snapshots: int
    total_events_triggered: int
    most_critical_villages: list[CriticalVillageCount]
    recent_events: list[RecentEvent]

class AllHistoryResponse(BaseModel):
    count: int
    records: list[HistoryEntry]

class NarrativeResponse(BaseModel):
    village_name: str
    text: str
    source: str
    cached: bool
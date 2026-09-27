from fastapi import APIRouter
import numpy as np
from decision.priority_ranking import compute_priority_list
from decision.history_store import log_snapshot, get_history, get_analytics_summary, get_all_history
from api.v1.narrative import get_narrative
from api.v1.schemas import PriorityListResponse, HabitationResult, SimulateEventRequest, HistoryResponse, AnalyticsResponse, AllHistoryResponse, NarrativeResponse
router = APIRouter(prefix="/v1", tags=["redzone"])


@router.get("/priority-list", response_model=PriorityListResponse)
def get_priority_list():
    df = compute_priority_list()
    df = df.replace({np.nan: None})
    results = [HabitationResult(**row) for row in df.to_dict(orient="records")]
    return PriorityListResponse(count=len(results), source="local", results=results)


@router.post("/simulate-event", response_model=PriorityListResponse)
def simulate_event(event: SimulateEventRequest):
    overrides = {}
    changed = {}
    if event.rainfall_intensity is not None:
        changed["rainfall_intensity"] = event.rainfall_intensity
    if event.past_incidents is not None:
        changed["past_incidents"] = event.past_incidents
    if changed:
        overrides[event.village_name] = changed

    df = compute_priority_list(overrides=overrides)
    df = df.replace({np.nan: None})
    results = [HabitationResult(**row) for row in df.to_dict(orient="records")]
    log_snapshot(df.to_dict(orient="records"), triggered_by=f"event:{event.village_name}")
    return PriorityListResponse(count=len(results), source="local", results=results)


@router.get("/history/{village_name}", response_model=HistoryResponse)
def village_history(village_name: str):
    history = get_history(village_name)
    return HistoryResponse(village_name=village_name, history=history)
@router.get("/analytics", response_model=AnalyticsResponse)
def analytics():
    return AnalyticsResponse(**get_analytics_summary())
@router.get("/history-all", response_model=AllHistoryResponse)
def all_history():
    records = get_all_history()
    return AllHistoryResponse(count=len(records), records=records)
@router.get("/narrative/{village_name}", response_model=NarrativeResponse)
def narrative(village_name: str):
    df = compute_priority_list()
    row = df[df["village_name"] == village_name]
    if row.empty:
        return NarrativeResponse(village_name=village_name, text="Village not found.", source="local", cached=False)

    row = row.iloc[0]
    result = get_narrative(village_name, row["tier"], row["breakdown"], row["hazard_score"])
    return NarrativeResponse(village_name=village_name, **result)   
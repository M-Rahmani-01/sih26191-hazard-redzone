"""
Local-first explanation narrative, Gemini API se enhance hota hai jab available ho.
Local template hamesha guaranteed fallback hai — kabhi crash nahi hoga.
Cache lagाya hai taaki same village+score ke liye Gemini dobara call na ho (quota bachane ke liye).
"""

import os
from dotenv import load_dotenv
from api.v1.circuit_breaker import gemini_breaker

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# In-memory cache: key = (village_name, hazard_score) -> narrative dict
_narrative_cache: dict[tuple, dict] = {}


def build_local_narrative(village_name: str, tier: str, breakdown: list[dict]) -> str:
    """Guaranteed-working local template — kabhi fail nahi hota, quota bhi use nahi karta."""
    top_factor = breakdown[0]
    return (
        f"{village_name} is classified as {tier} risk, primarily driven by "
        f"{top_factor['factor'].replace('_', ' ')} (raw value: {top_factor['raw_value']}), "
        f"which contributes {round(top_factor['contribution'] * 100, 1)}% of the overall hazard score."
    )


def build_gemini_narrative(village_name: str, tier: str, breakdown: list[dict]) -> str | None:
    """Gemini se natural, judge-friendly explanation banata hai. Fail hone pe None return karta hai."""
    if not GEMINI_API_KEY or not gemini_breaker.should_try():
        return None

    try:
        from google import genai

        client = genai.Client(api_key=GEMINI_API_KEY)
        factors_text = ", ".join(
            f"{f['factor'].replace('_', ' ')} ({round(f['contribution'] * 100, 1)}%)" for f in breakdown
        )
        prompt = (
            f"In 2 short sentences, explain in plain English why the habitation '{village_name}' "
            f"has been classified as '{tier}' landslide risk. Contributing factors and their "
            f"weighted contribution to the score are: {factors_text}. "
            f"Be factual, avoid alarmist language, and do not invent numbers not given."
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        gemini_breaker.record_success()
        return response.text.strip()

    except Exception as e:
        print(f"[narrative] Gemini fallback triggered: {e}")
        gemini_breaker.record_failure()
        return None


def get_narrative(village_name: str, tier: str, breakdown: list[dict], hazard_score: float, force_refresh: bool = False) -> dict:
    """
    Pehle cache check karta hai (quota bachane ke liye). Cache miss hone par hi
    Gemini try karta hai; warna local template use karta hai. Kabhi error nahi deta.
    """
    cache_key = (village_name, round(hazard_score, 4))

    if not force_refresh and cache_key in _narrative_cache:
        cached = _narrative_cache[cache_key]
        return {**cached, "cached": True}

    gemini_text = build_gemini_narrative(village_name, tier, breakdown)
    if gemini_text:
        result = {"text": gemini_text, "source": "gemini"}
    else:
        result = {"text": build_local_narrative(village_name, tier, breakdown), "source": "local"}

    _narrative_cache[cache_key] = result
    return {**result, "cached": False}
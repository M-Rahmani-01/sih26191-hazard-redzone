"""
Local-first explanation narrative, Gemini API se enhance hota hai jab available ho.
Local template hamesha guaranteed fallback hai — kabhi crash nahi hoga.
Cache lagाya hai taaki same village+score+language ke liye Gemini dobara call na ho.
"""

import os
from dotenv import load_dotenv
from api.v1.circuit_breaker import gemini_breaker

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# In-memory cache: key = (village_name, hazard_score, lang) -> narrative dict
_narrative_cache: dict[tuple, dict] = {}

FACTOR_LABELS_HI = {
    "slope": "ढलान",
    "rainfall_intensity": "वर्षा तीव्रता",
    "past_incidents": "पूर्व घटनाएँ",
    "population_density": "जनसंख्या घनत्व",
}


def build_local_narrative(village_name: str, tier: str, breakdown: list[dict], lang: str = "en") -> str:
    """Guaranteed-working local template — kabhi fail nahi hota, quota bhi use nahi karta."""
    top_factor = breakdown[0]
    if lang == "hi":
        tier_hi = {"Critical": "गंभीर", "Red": "लाल", "Watch": "निगरानी", "Safe": "सुरक्षित"}.get(tier, tier)
        factor_hi = FACTOR_LABELS_HI.get(top_factor["factor"], top_factor["factor"])
        return (
            f"{village_name} को '{tier_hi}' जोखिम श्रेणी में रखा गया है, जिसका मुख्य कारण "
            f"{factor_hi} (मान: {top_factor['raw_value']}) है, जो कुल स्कोर में "
            f"{round(top_factor['contribution'] * 100, 1)}% का योगदान देता है।"
        )
    return (
        f"{village_name} is classified as {tier} risk, primarily driven by "
        f"{top_factor['factor'].replace('_', ' ')} (raw value: {top_factor['raw_value']}), "
        f"which contributes {round(top_factor['contribution'] * 100, 1)}% of the overall hazard score."
    )


def build_gemini_narrative(village_name: str, tier: str, breakdown: list[dict], lang: str = "en") -> str | None:
    """Gemini se natural, judge-friendly explanation banata hai. Fail hone pe None return karta hai."""
    if not GEMINI_API_KEY or not gemini_breaker.should_try():
        return None

    try:
        from google import genai

        client = genai.Client(api_key=GEMINI_API_KEY)
        factors_text = ", ".join(
            f"{f['factor'].replace('_', ' ')} ({round(f['contribution'] * 100, 1)}%)" for f in breakdown
        )

        if lang == "hi":
            prompt = (
                f"'{village_name}' नाम की बस्ती को भूस्खलन जोखिम श्रेणी '{tier}' में क्यों रखा गया है, "
                f"इसे सरल हिंदी में सिर्फ 2 छोटे वाक्यों में समझाइए। योगदान देने वाले कारक और उनका भारित "
                f"योगदान: {factors_text}। तथ्यों पर आधारित रहें, डरावनी भाषा से बचें, और दिए गए आंकड़ों "
                f"के अलावा कोई नया आंकड़ा न बनाएं। पूरा उत्तर केवल हिंदी में दें।"
            )
        else:
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


def get_narrative(village_name: str, tier: str, breakdown: list[dict], hazard_score: float,
                   lang: str = "en", force_refresh: bool = False) -> dict:
    """
    Pehle cache check karta hai (quota bachane ke liye). Cache miss hone par hi
    Gemini try karta hai; warna local template use karta hai. Kabhi error nahi deta.
    """
    cache_key = (village_name, round(hazard_score, 4), lang)

    if not force_refresh and cache_key in _narrative_cache:
        cached = _narrative_cache[cache_key]
        return {**cached, "cached": True}

    gemini_text = build_gemini_narrative(village_name, tier, breakdown, lang)
    if gemini_text:
        result = {"text": gemini_text, "source": "gemini"}
    else:
        result = {"text": build_local_narrative(village_name, tier, breakdown, lang), "source": "local"}

    _narrative_cache[cache_key] = result
    return {**result, "cached": False} 
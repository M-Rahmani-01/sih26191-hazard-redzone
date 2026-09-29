# SIH26191 — Hazard Red Zone & Relocation Priority Platform

**Problem Statement:** Intelligent Identification of Hazard-Based Red Zones, Carrying Capacity Assessment, and Immediate Relocation Needs for Vulnerable Habitations
**Organization:** Ministry of Home Affairs | **Theme:** Disaster Management | **Category:** Software

🔗 **Live Demo:** [sih26191-hazard-redzone-gng8.vercel.app](https://sih26191-hazard-redzone-gng8.vercel.app)
🔗 **Backend API:** [sih26191-backend.onrender.com/docs](https://sih26191-backend.onrender.com/docs)

---

## What this does

Disaster relocation in India today is largely **reactive** — planning begins only after a disaster strikes. This platform flips that: it identifies hazard-based Red Zones, assesses the carrying capacity of nearby safe relocation sites, and produces a continuously-updated relocation priority list — **before** disaster strikes.

Demo region: **Rudraprayag district, Uttarakhand** — chosen because NRSC's *Landslide Atlas of India* (2023) ranks it #1 nationally for landslide risk exposure among 147 studied districts.

## Key features

- **Real terrain data** — slope is computed from actual NASA SRTM satellite elevation data (via OpenTopography), not assumed values
- **Explainable scoring** — an AHP (Analytic Hierarchy Process) model with statistically-calibrated thresholds; every score breaks down into its weighted factors, never a black box
- **Carrying-capacity-aware relocation** — recommends the nearest safe site using a KD-tree, and tracks capacity as it's allocated across multiple habitations
- **Dynamic re-ranking** — simulate a new rainfall/incident event and watch the entire priority list re-score live, with **no habitation ever dropped**, only re-ranked
- **AI-assisted explanations** — Gemini generates a plain-language summary on demand, with a guaranteed local fallback, response caching, and a circuit breaker so repeated failures never slow the app
- **Bilingual** — full Hindi/English toggle, including AI summaries in both languages
- **Live analytics** — every computation and simulated event is persisted (SQLite) and viewable in an in-app analytics dashboard
- **Built to scale** — cached scoring, KD-tree lookups, and marker clustering so the same architecture handles thousands of habitations, not just ten
- **Multi-hazard-ready architecture** — flood and coastal-erosion scorers are implemented against the same pluggable interface as landslide, ready to activate with hazard-specific data
- **One-click officer report** — generates a printable/PDF-ready priority report (with data-source attribution) for District Magistrate / SDMA record-keeping

## Architecture

Raw data (elevation, rainfall, population, incidents)
│
▼
H3 hex-grid mapping ──────────────────────────────
│ │
▼ │
AHP hazard scoring (scoring/) │ pluggable per
│ │ hazard type
▼ │
Decision layer (decision/): tiering, │
carrying capacity, site matching, ranking ──────────
│
▼
FastAPI backend (api/) — cached, SQLite history
│
▼
React + Leaflet dashboard (frontend/)


## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, H3 (hex-grid), SciPy (KD-tree), SQLite |
| Scoring | AHP with percentile-calibrated thresholds |
| AI | Google Gemini (optional, local-fallback) |
| Frontend | React, Vite, Leaflet, Axios |
| Data | NASA SRTM (via OpenTopography) for terrain |
| Deployment | Render (backend), Vercel (frontend) |

## Project structure

project-root/
├── data_ingestion/ # data loading + validation, real DEM slope adapter
├── features/ # H3 hex-grid builder
├── scoring/ # hazard scoring modules (landslide live; flood/erosion pluggable)
├── decision/ # tiering, carrying capacity, site matching, priority ranking
├── api/v1/ # FastAPI routes, schemas, Gemini narrative + fallback
├── frontend/ # React + Leaflet dashboard
├── tests/ # unit tests for scoring/decision/features
└── requirements.txt


## Running locally

**Backend**
```bash
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Set `OPENTOPOGRAPHY_API_KEY` and `GEMINI_API_KEY` in a `.env` file in `project-root/` (both optional — the app runs fully without them, with reduced functionality).

## Known limitations & next steps

- Rainfall, population, and past-incident figures are structured sample values; slope is the only field currently sourced from real satellite data. Architecture is designed to plug in real GSI/IMD/Census data with no code changes.
- Landslide scoring is fully live end-to-end. Flood and coastal-erosion scorers are implemented against the same interface but not yet wired into the live dashboard, pending hazard-specific input data
- Built for a single district demo; national-scale deployment would move from SQLite to PostGIS and add concurrent-user support.

## Team
BY: TEAM-LEADER : Mohammad Rahmani
Team [THE BYTEWRIGHT'S] — SIH2026-[128328]

LEADER	Mohammad Rahmani
TEAM_MEMBER	Noor Arif	
TEAM_MEMBER	Sania Rahman
TEAM_MEMBER	Alok	
TEAM_MEMBER	Himanshu Gautam	
TEAM_MEMBER	Shreya Kesarwani	
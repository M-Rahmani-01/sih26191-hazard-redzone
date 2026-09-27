"""
SQLite-based history log — har simulate-event/recompute ka snapshot save karta hai,
taaki dashboard mein "score over time" trend dikhaya ja sake.
"""

import sqlite3
from pathlib import Path
from datetime import datetime, timezone

DB_PATH = Path(__file__).parent.parent / "data" / "history.db"


def init_db():
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS score_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            village_name TEXT NOT NULL,
            hazard_score REAL NOT NULL,
            tier TEXT NOT NULL,
            priority_rank INTEGER NOT NULL,
            triggered_by TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def log_snapshot(results: list[dict], triggered_by: str = "recompute"):
    conn = sqlite3.connect(DB_PATH)
    now = datetime.now(timezone.utc).isoformat()
    rows = [
        (r["village_name"], r["hazard_score"], r["tier"], r["priority_rank"], triggered_by, now)
        for r in results
    ]
    conn.executemany(
        "INSERT INTO score_history (village_name, hazard_score, tier, priority_rank, triggered_by, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
        rows,
    )
    conn.commit()
    conn.close()


def get_history(village_name: str) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT village_name, hazard_score, tier, priority_rank, triggered_by, timestamp FROM score_history WHERE village_name = ? ORDER BY timestamp ASC",
        (village_name,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


init_db()

def get_analytics_summary() -> dict:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    total_snapshots = conn.execute("SELECT COUNT(DISTINCT timestamp) as c FROM score_history").fetchone()["c"]
    total_events = conn.execute(
        "SELECT COUNT(DISTINCT timestamp) as c FROM score_history WHERE triggered_by LIKE 'event:%'"
    ).fetchone()["c"]

    most_critical = conn.execute("""
        SELECT village_name, COUNT(*) as critical_count
        FROM score_history
        WHERE tier = 'Critical'
        GROUP BY village_name
        ORDER BY critical_count DESC
        LIMIT 5
    """).fetchall()

    recent_events = conn.execute("""
        SELECT village_name, hazard_score, tier, triggered_by, timestamp
        FROM score_history
        WHERE triggered_by LIKE 'event:%'
        ORDER BY timestamp DESC
        LIMIT 10
    """).fetchall()

    conn.close()
    return {
        "total_snapshots": total_snapshots,
        "total_events_triggered": total_events,
        "most_critical_villages": [dict(r) for r in most_critical],
        "recent_events": [dict(r) for r in recent_events],
    }
def get_all_history(limit: int = 200) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT village_name, hazard_score, tier, priority_rank, triggered_by, timestamp FROM score_history ORDER BY timestamp DESC LIMIT ?",
        (limit,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
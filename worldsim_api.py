"""
WorldSim API — FastAPI Backend for Indian State Resource Intelligence
======================================================================
Serves the 10-state dataset through REST endpoints with MongoDB persistence
and optional Ollama-based AI analysis.
"""

from __future__ import annotations

import os
import json
import importlib
import re
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from worldsim_engine import World
from worldsim_agents import StrategyAnalyzer

# ---------------------------------------------------------------------------
# Optional deps
# ---------------------------------------------------------------------------

try:
    MongoClient = importlib.import_module("pymongo").MongoClient
    HAS_PYMONGO = True
except Exception:
    HAS_PYMONGO = False

try:
    importlib.import_module("ollama")
    HAS_OLLAMA_PYTHON_PACKAGE = True
except Exception:
    HAS_OLLAMA_PYTHON_PACKAGE = False

# ---------------------------------------------------------------------------
# MongoDB
# ---------------------------------------------------------------------------

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "worldsim")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")

mongo_client = None
mongo_db = None
mongo_runs = None
mongo_ai = None
mongo_connected = False
mongo_error = ""

if HAS_PYMONGO:
    try:
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1200)
        mongo_client.admin.command("ping")
        mongo_db = mongo_client[MONGO_DB_NAME]
        mongo_runs = mongo_db["simulation_runs"]
        mongo_ai = mongo_db["ai_analyses"]
        mongo_connected = True
    except Exception as exc:
        mongo_error = str(exc)

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="WorldSim India Resource API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class SimulationRequest(BaseModel):
    seed: int = Field(default=42, ge=1, le=999999)
    tick_start: int = Field(default=1, ge=1, le=120)
    tick_end: int = Field(default=120, ge=1, le=120)


class OllamaRequest(BaseModel):
    model: str = "gemma3:4b"
    summary: str
    state_table: List[Dict[str, Any]] = Field(default_factory=list)


def _as_10_line_summary(text: str, max_lines: int = 10) -> str:
    raw_lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
    if not raw_lines:
        return "1. No analysis text returned by Ollama."

    banned_starts = (
        "here's",
        "here is",
        "below is",
        "executive summary",
        "summary:",
        "based on",
        "okay",
        "certainly",
    )

    compact_lines = []
    for line in raw_lines:
        normalized = line.lstrip("-•0123456789. ").strip()
        lowered = normalized.lower()
        if not normalized:
            continue
        if lowered.startswith(banned_starts):
            continue
        if "concise executive summary" in lowered:
            continue
        if "lines or less" in lowered:
            continue
        if normalized:
            compact_lines.append(normalized)

    if not compact_lines:
        return "1. No analysis text returned by Ollama."

    limited = compact_lines[:max_lines]
    return "\n".join(f"{idx + 1}. {line}" for idx, line in enumerate(limited))


def _sanitize_state_mentions(text: str, allowed_states: List[str]) -> str:
    all_india_states = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
        "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
        "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
        "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
        "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    ]
    allowed = {s.strip().lower() for s in allowed_states if s and s.strip()}
    sanitized = text
    for name in sorted(all_india_states, key=len, reverse=True):
        lowered = name.lower()
        if lowered in allowed:
            continue
        pattern = re.compile(rf"\b{re.escape(name)}\b", flags=re.IGNORECASE)
        sanitized = pattern.sub("other states", sanitized)
    return sanitized


def _ollama_post(path: str, payload: Dict[str, Any], timeout: int = 180) -> Dict[str, Any]:
    url = f"{OLLAMA_BASE_URL}{path}"
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url=url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
    except Exception as exc:
        raise RuntimeError(str(exc)) from exc


def _ollama_get(path: str, timeout: int = 8) -> Dict[str, Any]:
    url = f"{OLLAMA_BASE_URL}{path}"
    req = urllib.request.Request(url=url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
    except Exception as exc:
        raise RuntimeError(str(exc)) from exc


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health() -> Dict[str, Any]:
    ollama_reachable = True
    ollama_error = ""
    try:
        _ollama_get("/api/tags")
    except Exception as exc:
        ollama_reachable = False
        ollama_error = str(exc)

    return {
        "ok": True,
        "service": "worldsim-india-api",
        "version": "2.0.0",
        "dataset": "worldsim_synthetic_dataset_10000_rows.csv",
        "states": 10,
        "ticks": 120,
        "ollama_python_package": HAS_OLLAMA_PYTHON_PACKAGE,
        "ollama_base_url": OLLAMA_BASE_URL,
        "ollama_server_reachable": ollama_reachable,
        "ollama_error": ollama_error,
        "mongo_connected": mongo_connected,
        "mongo_error": mongo_error,
    }


@app.get("/api/ollama/status")
def ollama_status() -> Dict[str, Any]:
    try:
        tags = _ollama_get("/api/tags")
        models = [m.get("name") for m in tags.get("models", []) if m.get("name")]
        return {
            "ok": True,
            "base_url": OLLAMA_BASE_URL,
            "models": models,
        }
    except Exception as exc:
        return {
            "ok": False,
            "base_url": OLLAMA_BASE_URL,
            "models": [],
            "error": str(exc),
        }


@app.post("/api/simulate")
def simulate(payload: SimulationRequest) -> Dict[str, Any]:
    """Run dataset analysis for the given tick range and return state metrics."""
    world = World(
        seed=payload.seed,
        tick_start=payload.tick_start,
        tick_end=payload.tick_end,
    )
    analyzer = StrategyAnalyzer(world)

    summary = world.get_summary()
    trade = world.trade_summary()
    climate = world.climate_summary()
    strategy_classifications = analyzer.classify_all()
    strategy_mix = analyzer.strategy_mix()
    resilience = analyzer.resilience_ranking()

    # Build per-state output at final tick
    final_tick = summary["final_tick"]
    states: list[dict[str, Any]] = []
    for state_name in world.states:
        snap = world.state_snapshot(final_tick, state_name)
        classification = strategy_classifications.get(state_name, {})
        snap["dominant_strategy"] = classification.get("dominant_strategy", "—")
        snap["strategy_tags"] = classification.get("tags", [])
        snap["scores"] = classification.get("scores", {})
        states.append(snap)

    # Global time series
    gseries = world.global_series()

    response_payload: dict[str, Any] = {
        "summary": {
            "final_tick": summary["final_tick"],
            "tick_range": summary["tick_range"],
            "total_states": summary["total_states"],
            "alive_states": summary["alive_states"],
            "healthy_states": summary["healthy_states"],
            "critical_states": summary["critical_states"],
            "total_population": summary["total_population"],
            "total_gdp": summary["total_gdp"],
            "avg_welfare": summary["avg_welfare"],
            "avg_inequality": summary["avg_inequality"],
            "total_trades_executed": summary["total_trades_executed"],
            "trade_execution_rate": summary["trade_execution_rate"],
            "climate_events": summary["climate_events"],
            "total_data_rows": summary["total_data_rows"],
        },
        "states": sorted(states, key=lambda s: (not s["alive"], -(s.get("population") or 0))),
        "strategy_mix": strategy_mix,
        "resilience_ranking": resilience,
        "trade": trade,
        "climate": climate,
        "series": {
            "ticks": gseries["ticks"],
            "total_population": gseries["total_population"],
            "total_gdp": gseries["total_gdp"],
            "avg_welfare": gseries["avg_welfare"],
            "total_trade_volume": gseries["total_trade_volume"],
        },
    }

    # MongoDB persistence
    if mongo_connected and mongo_runs is not None:
        try:
            doc = {
                "created_at": datetime.now(timezone.utc),
                "seed": payload.seed,
                "tick_start": payload.tick_start,
                "tick_end": payload.tick_end,
                **response_payload,
            }
            insert_result = mongo_runs.insert_one(doc)
            response_payload["run_id"] = str(insert_result.inserted_id)
            response_payload["stored_in_mongodb"] = True
        except Exception as exc:
            response_payload["stored_in_mongodb"] = False
            response_payload["mongodb_error"] = str(exc)
    else:
        response_payload["stored_in_mongodb"] = False

    return response_payload


@app.post("/api/ollama/analyze")
def ollama_analyze(payload: OllamaRequest) -> Dict[str, str]:
    allowed_states = [
        str(s.get("state", "")).strip()
        for s in payload.state_table
        if str(s.get("state", "")).strip()
    ]
    allowed_states_text = ", ".join(allowed_states) if allowed_states else "No state list provided"

    table_preview = "\n".join(
        f"- {s.get('state','')}: pop={s.get('population','')}, "
        f"welfare={s.get('welfare_index','')}, GDP_growth={s.get('gdp_growth_rate','')}, "
        f"strategy={s.get('dominant_strategy','')}"
        for s in payload.state_table[:10]
    )

    prompt = (
        "You are an Indian resource and economic strategy analyst.\n"
        "Return ONLY a concise executive summary in at most 10 lines.\n"
        "Use short, insight-dense lines with state-specific evidence when possible.\n"
        "ONLY mention states from the allowed list below. If uncertain, use 'other states'.\n"
        "Do not include long paragraphs.\n\n"
        f"Allowed states:\n{allowed_states_text}\n\n"
        f"Summary:\n{payload.summary}\n\n"
        f"State data:\n{table_preview}"
    )

    try:
        response = _ollama_post(
            "/api/chat",
            {
                "model": payload.model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "Output must be summary-style and max 10 lines. "
                            "Prefer one insight per line. Reference states and numbers."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
            },
        )
        analysis_text = response.get("message", {}).get("content", "")
        analysis_text = _sanitize_state_mentions(analysis_text, allowed_states)
        analysis_text = _as_10_line_summary(analysis_text, max_lines=10)

        if mongo_connected and mongo_ai is not None:
            try:
                mongo_ai.insert_one({
                    "created_at": datetime.now(timezone.utc),
                    "model": payload.model,
                    "summary": payload.summary,
                    "state_table": payload.state_table,
                    "analysis": analysis_text,
                })
            except Exception:
                pass

        return {"analysis": analysis_text}
    except Exception as exc:
        return {
            "analysis": (
                f"Ollama request failed: {exc}. "
                f"Ensure Ollama is running at {OLLAMA_BASE_URL} and model '{payload.model}' is pulled."
            )
        }

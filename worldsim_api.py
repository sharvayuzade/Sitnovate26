from __future__ import annotations

import os
from collections import Counter
from datetime import datetime, timezone
from typing import List, Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from worldsim_engine import World
from worldsim_agents import AgentManager

try:
    from pymongo import MongoClient
    HAS_PYMONGO = True
except Exception:
    HAS_PYMONGO = False

try:
    import ollama
    HAS_OLLAMA = True
except Exception:
    HAS_OLLAMA = False


MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "worldsim")

mongo_client = None
mongo_db = None
mongo_runs_collection = None
mongo_ai_collection = None
mongo_connected = False
mongo_error = ""

if HAS_PYMONGO:
    try:
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1200)
        mongo_client.admin.command("ping")
        mongo_db = mongo_client[MONGO_DB_NAME]
        mongo_runs_collection = mongo_db["simulation_runs"]
        mongo_ai_collection = mongo_db["ai_analyses"]
        mongo_connected = True
    except Exception as exc:
        mongo_error = str(exc)


app = FastAPI(title="WorldSim API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:7860",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimulationRequest(BaseModel):
    seed: int = Field(default=42, ge=1, le=999999)
    cycles: int = Field(default=500, ge=20, le=2000)


class OllamaRequest(BaseModel):
    model: str = "gemma:4b"
    summary: str
    region_table: List[Dict[str, Any]] = Field(default_factory=list)


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "service": "worldsim-api",
        "ollama_client_installed": HAS_OLLAMA,
        "mongo_client_installed": HAS_PYMONGO,
        "mongo_connected": mongo_connected,
        "mongo_db": MONGO_DB_NAME,
        "mongo_uri": MONGO_URI,
        "mongo_error": mongo_error,
    }


@app.post("/api/simulate")
def simulate(payload: SimulationRequest) -> Dict[str, Any]:
    world = World(seed=payload.seed, num_cycles=payload.cycles)
    agent_manager = AgentManager(world.get_region_names(), seed=payload.seed)

    for _ in range(payload.cycles):
        prev_snapshot = agent_manager.snapshot_states(world)
        decisions = agent_manager.get_decisions(world)
        world.step(decisions)
        agent_manager.update_all(world, prev_snapshot)

    summary = world.get_summary()
    agent_summary = agent_manager.summary()

    regions = []
    for name in world.get_region_names():
        region = world.regions[name]
        regions.append(
            {
                "region": name,
                "alive": bool(region.is_alive),
                "population": round(region.population, 2),
                "water": round(region.resources["water"], 2),
                "food": round(region.resources["food"], 2),
                "energy": round(region.resources["energy"], 2),
                "land": round(region.resources["land"], 2),
                "happiness": round(region.happiness, 4),
                "tech": round(region.tech_level, 4),
                "dominant_strategy": agent_summary[name]["dominant_strategy"],
                "avg_reward_50": round(agent_summary[name]["avg_reward_50"], 2),
            }
        )

    strategy_counter = Counter([agent_summary[name]["dominant_strategy"] for name in agent_summary])

    top_trade_pairs = Counter()
    for trade in world.trade_system.trade_history:
        pair = tuple(sorted([trade["buyer"], trade["seller"]]))
        top_trade_pairs[pair] += 1

    top_pairs = [
        {"pair": f"{a} ↔ {b}", "count": count}
        for (a, b), count in top_trade_pairs.most_common(6)
    ]

    pop_series = [round(sum(h.values()), 2) for h in world.population_history]
    trade_series = list(world.trade_count_history)

    response_payload = {
        "summary": {
            "cycle": summary["cycle"],
            "alive_regions": summary["alive_regions"],
            "collapsed_regions": summary["collapsed_regions"],
            "total_population": round(summary["total_population"], 2),
            "total_trades": summary["total_trades"],
            "total_events": summary["total_events"],
            "climate_stress": summary["climate_stress"],
        },
        "regions": sorted(regions, key=lambda r: (not r["alive"], -r["population"])),
        "strategy_mix": [{"strategy": k, "count": v} for k, v in strategy_counter.most_common()],
        "top_trade_pairs": top_pairs,
        "series": {
            "population_total": pop_series,
            "trade_count": trade_series,
        },
    }

    if mongo_connected and mongo_runs_collection is not None:
        try:
            doc = {
                "created_at": datetime.now(timezone.utc),
                "seed": payload.seed,
                "cycles": payload.cycles,
                "summary": response_payload["summary"],
                "regions": response_payload["regions"],
                "strategy_mix": response_payload["strategy_mix"],
                "top_trade_pairs": response_payload["top_trade_pairs"],
                "series": response_payload["series"],
            }
            insert_result = mongo_runs_collection.insert_one(doc)
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
    if not HAS_OLLAMA:
        return {
            "analysis": "Ollama Python client is not installed. Install with: pip install ollama"
        }

    table_preview = "\n".join(
        [
            f"- {r.get('region', '')}: alive={r.get('alive', '')}, pop={r.get('population', '')}, "
            f"strategy={r.get('dominant_strategy', '')}"
            for r in payload.region_table[:8]
        ]
    )

    prompt = (
        "You are a strategic simulation analyst.\n"
        "Given this WorldSim run summary and top regions, provide:\n"
        "1) Executive summary (4-6 lines)\n"
        "2) Sustainable strategy patterns\n"
        "3) Fragile strategy patterns\n"
        "4) 3 real-world parallels\n"
        "5) 5 concrete improvements for next hackathon iteration\n\n"
        f"Summary:\n{payload.summary}\n\n"
        f"Top regions:\n{table_preview}"
    )

    try:
        response = ollama.chat(
            model=payload.model,
            messages=[
                {"role": "system", "content": "Be concise, practical, and insight-driven."},
                {"role": "user", "content": prompt},
            ],
        )
        analysis_text = response["message"]["content"]

        if mongo_connected and mongo_ai_collection is not None:
            try:
                mongo_ai_collection.insert_one(
                    {
                        "created_at": datetime.now(timezone.utc),
                        "model": payload.model,
                        "summary": payload.summary,
                        "region_table": payload.region_table,
                        "analysis": analysis_text,
                    }
                )
            except Exception:
                pass

        return {"analysis": analysis_text}
    except Exception as exc:
        return {
            "analysis": (
                f"Ollama request failed: {exc}. Make sure Ollama is running and model '{payload.model}' is available."
            )
        }

"""
WorldSim Engine — Data-Driven Indian State Resource Intelligence Engine
========================================================================
Loads the 10,000-row synthetic dataset (10 Indian states x 120 ticks) and
provides aggregation, time-series, snapshot, and summary APIs that power the
full simulation dashboard.

Dataset columns
---------------
tick, state, population, water_supply, food_supply, energy_supply,
water_generated, food_generated, energy_generated,
water_consumed, food_consumed, energy_consumed,
state_gdp, gdp_growth_rate, welfare_index, inequality_index,
migration_in, migration_out, order_type, resource_type,
trade_quantity, trade_price, trade_executed, climate_event, shock_intensity
"""

from __future__ import annotations

import csv
import random
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np

# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).resolve().parent
DEFAULT_CSV = DATA_DIR / "worldsim_synthetic_dataset_10000_rows.csv"

STATES = [
    "Bihar", "Gujarat", "Karnataka", "Madhya Pradesh", "Maharashtra",
    "Punjab", "Rajasthan", "Tamil Nadu", "Uttar Pradesh", "West Bengal",
]

RESOURCES = ["Water", "Food", "Energy"]
CLIMATE_EVENTS = ["None", "Heatwave", "Drought", "Flood", "Cyclone"]

# ---------------------------------------------------------------------------
# Core data loader
# ---------------------------------------------------------------------------

REQUIRED_COLUMNS = {
    "tick", "state", "population", "water_supply", "food_supply",
    "energy_supply", "water_generated", "food_generated", "energy_generated",
    "water_consumed", "food_consumed", "energy_consumed", "state_gdp",
    "gdp_growth_rate", "welfare_index", "inequality_index", "migration_in",
    "migration_out", "order_type", "resource_type", "trade_quantity",
    "trade_price", "trade_executed", "climate_event", "shock_intensity",
}


def _safe_float(val: Any, default: float = 0.0) -> float:
    """Convert to float, returning *default* on failure."""
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _safe_int(val: Any, default: int = 0) -> int:
    """Convert to int (via float to handle '3.0'), returning *default* on failure."""
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def load_dataset(path=DEFAULT_CSV):
    """Load the CSV dataset and parse numeric fields.

    Raises
    ------
    FileNotFoundError  – if the CSV file does not exist.
    ValueError         – if the CSV is empty or missing required columns.
    """
    csv_path = Path(path)
    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset not found: {csv_path}")

    rows: list[dict[str, Any]] = []
    with open(csv_path, "r", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)

        # Validate header presence
        if reader.fieldnames is None:
            raise ValueError("CSV file appears empty or has no header row.")

        header_set = {h.strip() for h in reader.fieldnames if h}
        missing = REQUIRED_COLUMNS - header_set
        if missing:
            raise ValueError(f"CSV missing required columns: {', '.join(sorted(missing))}")

        for line_no, raw in enumerate(reader, start=2):  # line 1 = header
            try:
                row: dict[str, Any] = {
                    "tick": _safe_int(raw.get("tick"), 0),
                    "state": str(raw.get("state", "")).strip(),
                    "population": _safe_float(raw.get("population")),
                    "water_supply": _safe_float(raw.get("water_supply")),
                    "food_supply": _safe_float(raw.get("food_supply")),
                    "energy_supply": _safe_float(raw.get("energy_supply")),
                    "water_generated": _safe_float(raw.get("water_generated")),
                    "food_generated": _safe_float(raw.get("food_generated")),
                    "energy_generated": _safe_float(raw.get("energy_generated")),
                    "water_consumed": _safe_float(raw.get("water_consumed")),
                    "food_consumed": _safe_float(raw.get("food_consumed")),
                    "energy_consumed": _safe_float(raw.get("energy_consumed")),
                    "state_gdp": _safe_float(raw.get("state_gdp")),
                    "gdp_growth_rate": _safe_float(raw.get("gdp_growth_rate")),
                    "welfare_index": _safe_float(raw.get("welfare_index")),
                    "inequality_index": _safe_float(raw.get("inequality_index")),
                    "migration_in": _safe_int(raw.get("migration_in")),
                    "migration_out": _safe_int(raw.get("migration_out")),
                    "order_type": str(raw.get("order_type", "")).strip(),
                    "resource_type": str(raw.get("resource_type", "")).strip(),
                    "trade_quantity": _safe_float(raw.get("trade_quantity")),
                    "trade_price": _safe_float(raw.get("trade_price")),
                    "trade_executed": _safe_int(raw.get("trade_executed")),
                    "climate_event": str(raw.get("climate_event", "None")).strip(),
                    "shock_intensity": _safe_float(raw.get("shock_intensity")),
                }
                # Skip rows with no state name or invalid tick
                if not row["state"] or row["tick"] < 1:
                    continue
                rows.append(row)
            except Exception as exc:
                # Log but skip corrupt rows rather than crashing
                print(f"[WorldSim] Warning: skipping CSV line {line_no}: {exc}")

    if not rows:
        raise ValueError("CSV loaded zero valid data rows.")

    return rows


# ---------------------------------------------------------------------------
# World — main data engine
# ---------------------------------------------------------------------------

class World:
    """Data-driven world engine backed by the CSV dataset."""

    def __init__(self, seed: int = 42, tick_start: int = 1, tick_end: int = 120,
                 csv_path=DEFAULT_CSV):
        # --- Input validation ---
        if not isinstance(seed, (int, float)) or seed < 1:
            raise ValueError(f"seed must be a positive integer, got {seed!r}")
        seed = int(seed)

        tick_start = max(1, int(tick_start))
        tick_end = max(1, int(tick_end))
        if tick_start > tick_end:
            tick_start, tick_end = tick_end, tick_start  # auto-swap

        self.seed = seed
        self.tick_start = tick_start
        self.tick_end = tick_end
        self.rng = random.Random(seed)

        # Load full dataset (may raise FileNotFoundError / ValueError)
        self.raw_rows = load_dataset(csv_path)

        # Filter to requested tick range
        self.rows = [r for r in self.raw_rows if tick_start <= r["tick"] <= tick_end]

        if not self.rows:
            raise ValueError(
                f"No data rows found for tick range [{tick_start}, {tick_end}]. "
                f"Dataset ticks: {min(r['tick'] for r in self.raw_rows)}–"
                f"{max(r['tick'] for r in self.raw_rows)}"
            )

        # Index by (tick, state)
        self.index: dict[tuple[int, str], list[dict]] = defaultdict(list)
        for r in self.rows:
            self.index[(r["tick"], r["state"])].append(r)

        # Index by state
        self.by_state: dict[str, list[dict]] = defaultdict(list)
        for r in self.rows:
            self.by_state[r["state"]].append(r)

        # Ticks & states present
        self.ticks = sorted({r["tick"] for r in self.rows})
        self.states = sorted({r["state"] for r in self.rows})

    # ----- Snapshot for a single tick-state -----

    def state_snapshot(self, tick: int, state: str) -> dict[str, Any]:
        """Aggregate all rows for a (tick, state) pair into one snapshot."""
        entries = self.index.get((tick, state), [])
        if not entries:
            return {"state": state, "tick": tick, "alive": False}

        base = entries[0]
        total_trade_qty = sum(e["trade_quantity"] for e in entries)
        executed_trades = sum(e["trade_executed"] for e in entries)
        total_orders = len(entries)
        worst = max(entries, key=lambda e: e["shock_intensity"])

        return {
            "state": state,
            "tick": tick,
            "alive": True,
            "population": round(base["population"]),
            "water_supply": round(base["water_supply"], 1),
            "food_supply": round(base["food_supply"], 1),
            "energy_supply": round(base["energy_supply"], 1),
            "water_generated": round(base["water_generated"], 1),
            "food_generated": round(base["food_generated"], 1),
            "energy_generated": round(base["energy_generated"], 1),
            "water_consumed": round(base["water_consumed"], 1),
            "food_consumed": round(base["food_consumed"], 1),
            "energy_consumed": round(base["energy_consumed"], 1),
            "state_gdp": round(base["state_gdp"], 2),
            "gdp_growth_rate": round(base["gdp_growth_rate"], 2),
            "welfare_index": round(base["welfare_index"], 4),
            "inequality_index": round(base["inequality_index"], 4),
            "migration_in": base["migration_in"],
            "migration_out": base["migration_out"],
            "net_migration": base["migration_in"] - base["migration_out"],
            "trade_volume": round(total_trade_qty, 2),
            "executed_trades": executed_trades,
            "total_orders": total_orders,
            "climate_event": worst["climate_event"],
            "shock_intensity": round(worst["shock_intensity"], 4),
        }

    def tick_snapshot(self, tick: int) -> list[dict]:
        """All state snapshots for a given tick."""
        return [self.state_snapshot(tick, s) for s in self.states]

    # ----- Time series for a state -----

    def state_series(self, state: str) -> dict[str, list]:
        """Per-tick time series for a single state."""
        out: dict[str, list] = {
            "ticks": [], "population": [], "state_gdp": [], "welfare_index": [],
            "water_supply": [], "food_supply": [], "energy_supply": [],
            "trade_volume": [],
        }
        for tick in self.ticks:
            snap = self.state_snapshot(tick, state)
            if not snap["alive"]:
                continue
            out["ticks"].append(tick)
            out["population"].append(snap["population"])
            out["state_gdp"].append(snap["state_gdp"])
            out["welfare_index"].append(snap["welfare_index"])
            out["water_supply"].append(snap["water_supply"])
            out["food_supply"].append(snap["food_supply"])
            out["energy_supply"].append(snap["energy_supply"])
            out["trade_volume"].append(snap["trade_volume"])
        return out

    # ----- Global time series -----

    def global_series(self) -> dict[str, list]:
        """Aggregate population, GDP, welfare across all states per tick."""
        out: dict[str, list] = {
            "ticks": [], "total_population": [], "total_gdp": [],
            "avg_welfare": [], "total_trade_volume": [],
        }
        for tick in self.ticks:
            snaps = self.tick_snapshot(tick)
            alive = [s for s in snaps if s["alive"]]
            if not alive:
                continue
            out["ticks"].append(tick)
            out["total_population"].append(sum(s["population"] for s in alive))
            out["total_gdp"].append(round(sum(s["state_gdp"] for s in alive), 2))
            out["avg_welfare"].append(round(np.mean([s["welfare_index"] for s in alive]), 4))
            out["total_trade_volume"].append(round(sum(s["trade_volume"] for s in alive), 2))
        return out

    # ----- Trade analytics -----

    def trade_summary(self) -> dict[str, Any]:
        """Global trade statistics from the dataset."""
        executed = [r for r in self.rows if r["trade_executed"] == 1]
        total_orders = len(self.rows)
        total_executed = len(executed)
        by_resource: Counter = Counter()
        by_state: Counter = Counter()
        volume_by_resource: dict[str, float] = defaultdict(float)
        for r in executed:
            by_resource[r["resource_type"]] += 1
            by_state[r["state"]] += 1
            volume_by_resource[r["resource_type"]] += r["trade_quantity"]
        return {
            "total_orders": total_orders,
            "total_executed": total_executed,
            "execution_rate": round(total_executed / max(total_orders, 1), 4),
            "by_resource": dict(by_resource.most_common()),
            "by_state": dict(by_state.most_common()),
            "volume_by_resource": {k: round(v, 2) for k, v in volume_by_resource.items()},
        }

    # ----- Climate analytics -----

    def climate_summary(self) -> dict[str, Any]:
        """Climate event breakdown across dataset."""
        events = Counter(r["climate_event"] for r in self.rows)
        avg_shock: dict[str, float] = {}
        for evt in events:
            vals = [r["shock_intensity"] for r in self.rows if r["climate_event"] == evt]
            avg_shock[evt] = round(np.mean(vals), 4) if vals else 0.0
        return {"event_counts": dict(events.most_common()), "avg_shock_by_event": avg_shock}

    # ----- End-state summary -----

    def get_summary(self) -> dict[str, Any]:
        """Summary at the final tick."""
        if not self.ticks:
            return {
                "final_tick": self.tick_end,
                "tick_range": [self.tick_start, self.tick_end],
                "total_states": 0, "alive_states": [], "healthy_states": [],
                "critical_states": [], "total_population": 0, "total_gdp": 0,
                "avg_welfare": 0.0, "avg_inequality": 0.0,
                "total_trades_executed": 0, "trade_execution_rate": 0.0,
                "climate_events": {}, "total_data_rows": 0,
            }

        final_tick = self.ticks[-1]
        snaps = self.tick_snapshot(final_tick)
        alive = [s for s in snaps if s.get("alive")]
        trade = self.trade_summary()
        climate = self.climate_summary()

        total_pop = sum(s.get("population", 0) for s in alive)
        total_gdp = round(sum(s.get("state_gdp", 0) for s in alive), 2)
        avg_welfare = round(float(np.mean([s["welfare_index"] for s in alive])), 4) if alive else 0.0
        avg_inequality = round(float(np.mean([s["inequality_index"] for s in alive])), 4) if alive else 0.0

        # Critical: welfare < 0.3 OR negative GDP growth
        critical = [s["state"] for s in alive if s.get("welfare_index", 0) < 0.3 or s.get("gdp_growth_rate", 0) < 0]
        healthy = [s["state"] for s in alive if s["state"] not in critical]

        return {
            "final_tick": final_tick,
            "tick_range": [self.tick_start, self.tick_end],
            "total_states": len(self.states),
            "alive_states": [s["state"] for s in alive],
            "healthy_states": healthy,
            "critical_states": critical,
            "total_population": total_pop,
            "total_gdp": total_gdp,
            "avg_welfare": avg_welfare,
            "avg_inequality": avg_inequality,
            "total_trades_executed": trade["total_executed"],
            "trade_execution_rate": trade["execution_rate"],
            "climate_events": climate["event_counts"],
            "total_data_rows": len(self.rows),
        }

    def get_state_names(self) -> list[str]:
        return list(self.states)

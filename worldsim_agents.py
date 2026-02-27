"""
WorldSim Agents — Dataset-Driven Strategy Analyzer
====================================================
Instead of training RL agents, this module analyzes the CSV dataset to derive
dominant resource strategies, trade behaviours, climate resilience scores,
and per-state strategy classifications.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any, Dict, List

import numpy as np

from worldsim_engine import World

# Strategy labels derived from data patterns
STRATEGY_LABELS = {
    "Trade-Heavy": "State with above-median executed trades",
    "Resource-Conservative": "State consumes less than it generates across resources",
    "Growth-Focused": "State with above-median GDP growth rate",
    "Welfare-Priority": "State with above-median welfare index",
    "Migration-Attracting": "State with positive net migration",
    "Climate-Resilient": "State maintains welfare despite high shock exposure",
}


class StrategyAnalyzer:
    """Analyze the dataset and classify each state's dominant strategy."""

    def __init__(self, world: World):
        if world is None:
            raise ValueError("StrategyAnalyzer requires a valid World instance.")
        self.world = world

    def classify_state(self, state: str) -> Dict[str, Any]:
        """Classify a single state based on its aggregate behaviour."""
        rows = self.world.by_state.get(state, [])
        if not rows:
            return {"state": state, "strategy": "Unknown", "tags": [], "scores": {}}

        avg_gdp_growth = float(np.mean([r["gdp_growth_rate"] for r in rows]))
        avg_welfare = float(np.mean([r["welfare_index"] for r in rows]))
        avg_inequality = float(np.mean([r["inequality_index"] for r in rows]))
        avg_shock = float(np.mean([r["shock_intensity"] for r in rows]))

        total_generated = sum(
            r["water_generated"] + r["food_generated"] + r["energy_generated"]
            for r in rows
        )
        total_consumed = sum(
            r["water_consumed"] + r["food_consumed"] + r["energy_consumed"]
            for r in rows
        )

        executed = sum(r["trade_executed"] for r in rows)
        total_orders = len(rows)
        trade_rate = executed / max(total_orders, 1)

        net_migration = sum(r["migration_in"] - r["migration_out"] for r in rows)

        tags: list[str] = []
        if trade_rate > 0.5:
            tags.append("Trade-Heavy")
        if total_consumed < total_generated * 0.85:
            tags.append("Resource-Conservative")
        if avg_gdp_growth > 3.0:
            tags.append("Growth-Focused")
        if avg_welfare > 0.5:
            tags.append("Welfare-Priority")
        if net_migration > 0:
            tags.append("Migration-Attracting")
        if avg_welfare > 0.4 and avg_shock > 0.4:
            tags.append("Climate-Resilient")

        # Dominant = most defining tag (first match priority)
        dominant = tags[0] if tags else "Balanced"

        return {
            "state": state,
            "dominant_strategy": dominant,
            "tags": tags,
            "scores": {
                "avg_gdp_growth": round(avg_gdp_growth, 2),
                "avg_welfare": round(avg_welfare, 4),
                "avg_inequality": round(avg_inequality, 4),
                "avg_shock": round(avg_shock, 4),
                "trade_execution_rate": round(trade_rate, 4),
                "net_migration": net_migration,
                "resource_surplus_ratio": round(
                    total_generated / max(total_consumed, 1), 4
                ),
            },
        }

    def classify_all(self) -> Dict[str, Dict[str, Any]]:
        """Classify all states."""
        return {state: self.classify_state(state) for state in self.world.states}

    def strategy_mix(self) -> List[Dict[str, Any]]:
        """Count of each dominant strategy across all states."""
        all_classified = self.classify_all()
        counter = Counter(v["dominant_strategy"] for v in all_classified.values())
        return [{"strategy": k, "count": v} for k, v in counter.most_common()]

    def resilience_ranking(self) -> List[Dict[str, Any]]:
        """Rank states by a composite resilience score."""
        results: list[dict[str, Any]] = []
        for state in self.world.states:
            info = self.classify_state(state)
            scores = info["scores"]
            # Composite: weighted welfare, GDP growth, trade success, low inequality
            composite = (
                scores["avg_welfare"] * 0.35
                + min(scores["avg_gdp_growth"] / 15.0, 1.0) * 0.25
                + scores["trade_execution_rate"] * 0.2
                + (1.0 - scores["avg_inequality"]) * 0.2
            )
            results.append({
                "state": state,
                "resilience_score": round(composite, 4),
                "dominant_strategy": info["dominant_strategy"],
                "tags": info["tags"],
            })
        results.sort(key=lambda x: x["resilience_score"], reverse=True)
        return results

    def summary(self) -> Dict[str, Dict[str, Any]]:
        """Return per-state strategy info (backwards-compatible API)."""
        return self.classify_all()

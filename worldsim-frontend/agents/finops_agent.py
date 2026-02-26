"""
WORLDSIM: India Ecosystem — FinOps Agent (Brain 1: The Quant)
Rule-based heuristic agent for resource optimization and deficit analysis.
Generates structured StateReports consumed by the Governor LLM.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import RESOURCE_MAX, LLM_DEFICIT_THRESHOLD, STATE_NAMES


class FinOpsAgent:
    """
    The Quant Brain — handles predictive analytics on a region's resource ledger.
    Calculates deficits, recommends trades, and produces state reports.
    """

    def __init__(self, region_code: str):
        self.region_code = region_code
        self.region_name = STATE_NAMES.get(region_code, region_code)

    def analyze(self, region_data: dict) -> dict:
        """
        Perform full analysis of a region and produce a StateReport.

        Args:
            region_data: Full region document from Firestore.

        Returns:
            StateReport dict with deficits, recommendations, and priorities.
        """
        resources = region_data.get("resources", {})
        gen_rates = region_data.get("resource_generation_rates", {})
        con_rates = region_data.get("resource_consumption_rates", {})
        finops = region_data.get("finops_metrics", {})
        demographics = region_data.get("demographics", {})
        infrastructure = region_data.get("infrastructure", {})
        policies = region_data.get("internal_policies", {})

        # ─── Deficit Analysis ───────────────────────────────────────────
        deficits = {}
        surpluses = {}
        projections = {}

        for resource in ["water", "energy", "food", "tech"]:
            current = resources.get(resource, 0)
            gen = gen_rates.get(resource, 0)
            con = con_rates.get(resource, 0)
            net_flow = gen - con
            max_val = RESOURCE_MAX.get(resource, 10000)

            # Project ticks until depletion or overflow
            if net_flow < 0 and current > 0:
                ticks_to_depletion = current / abs(net_flow)
            else:
                ticks_to_depletion = float("inf")

            ratio = current / max_val if max_val > 0 else 0
            is_deficit = ratio < LLM_DEFICIT_THRESHOLD or ticks_to_depletion < 5
            is_surplus = ratio > 0.6 and net_flow > 0

            projections[resource] = {
                "current": current,
                "net_flow": net_flow,
                "ratio": round(ratio, 3),
                "ticks_to_depletion": round(ticks_to_depletion, 1),
                "status": "CRITICAL" if ratio < 0.05 else
                          "DEFICIT" if is_deficit else
                          "SURPLUS" if is_surplus else "STABLE",
            }

            if is_deficit:
                # Calculate how much we need
                target = max_val * 0.3  # Target 30% reserves
                deficit_amount = max(0, int(target - current))
                priority = self._calculate_priority(resource, ratio, ticks_to_depletion, demographics)
                deficits[resource] = {
                    "amount_needed": deficit_amount,
                    "urgency": "CRITICAL" if ratio < 0.05 else "HIGH" if ticks_to_depletion < 5 else "MEDIUM",
                    "priority_score": priority,
                }

            if is_surplus:
                tradeable = int(current - max_val * 0.4)  # Keep 40% as reserve
                surpluses[resource] = {
                    "amount_available": max(0, tradeable),
                }

        # ─── Trade Recommendations ──────────────────────────────────────
        trade_recommendations = self._generate_trade_recommendations(deficits, surpluses)

        # ─── Policy Recommendations ─────────────────────────────────────
        policy_recommendations = self._generate_policy_recommendations(
            projections, demographics, policies
        )

        # ─── Overall Health Score ───────────────────────────────────────
        health_score = self._calculate_health_score(projections, demographics, finops)

        # ─── Build StateReport ──────────────────────────────────────────
        state_report = {
            "region_code": self.region_code,
            "region_name": self.region_name,
            "gdp_score": region_data.get("gdp_score", 0),
            "welfare_score": region_data.get("welfare_score", 0),
            "population": region_data.get("population", 0),
            "trust_score": region_data.get("trust_score", 100),
            "health_score": round(health_score, 1),
            "resource_projections": projections,
            "deficits": deficits,
            "surpluses": surpluses,
            "trade_recommendations": trade_recommendations,
            "policy_recommendations": policy_recommendations,
            "demographics_summary": {
                "workforce_efficiency": demographics.get("workforce_efficiency", 0),
                "unrest_level": demographics.get("unrest_level", 0),
                "migration_pressure": demographics.get("migration_pressure", 0),
            },
            "budget_summary": {
                "surplus": finops.get("budget_surplus", 0),
                "burn_rate": finops.get("burn_rate", 0),
            },
            "needs_governor": len(deficits) > 0 or health_score < 50,
        }

        return state_report

    def _calculate_priority(self, resource: str, ratio: float,
                            ticks_to_depletion: float, demographics: dict) -> float:
        """Calculate a priority score for a resource deficit (0-100)."""
        # Base priority from ratio (lower = more urgent)
        ratio_score = (1.0 - ratio) * 40

        # Urgency from depletion timeline
        if ticks_to_depletion < 3:
            depletion_score = 40
        elif ticks_to_depletion < 10:
            depletion_score = 25
        elif ticks_to_depletion < 20:
            depletion_score = 10
        else:
            depletion_score = 0

        # Population impact multiplier
        unrest = demographics.get("unrest_level", 0)
        pop_score = unrest * 20

        return min(100, ratio_score + depletion_score + pop_score)

    def _generate_trade_recommendations(self, deficits: dict, surpluses: dict) -> list:
        """Generate specific trade recommendations based on deficits/surpluses."""
        recommendations = []

        # Sort deficits by priority
        sorted_deficits = sorted(
            deficits.items(),
            key=lambda x: x[1]["priority_score"],
            reverse=True,
        )

        for resource, deficit_info in sorted_deficits:
            # Find what we can offer in exchange
            for surplus_resource, surplus_info in surpluses.items():
                if surplus_info["amount_available"] > 0:
                    # Calculate a fair exchange ratio
                    offer_amount = min(
                        surplus_info["amount_available"],
                        deficit_info["amount_needed"],
                    )
                    request_amount = min(
                        deficit_info["amount_needed"],
                        offer_amount,  # 1:1 ratio as baseline
                    )
                    recommendations.append({
                        "action": "TRADE",
                        "offer_resource": surplus_resource,
                        "offer_amount": offer_amount,
                        "request_resource": resource,
                        "request_amount": request_amount,
                        "urgency": deficit_info["urgency"],
                        "rationale": f"Trade {offer_amount} {surplus_resource} for "
                                     f"{request_amount} {resource} to address {deficit_info['urgency']} deficit",
                    })
                    break  # One recommendation per deficit

        # If we have deficits but no surpluses to trade, recommend relief request
        for resource, deficit_info in sorted_deficits:
            has_trade = any(
                r["request_resource"] == resource for r in recommendations
            )
            if not has_trade and deficit_info["urgency"] == "CRITICAL":
                recommendations.append({
                    "action": "REQUEST_RELIEF",
                    "request_resource": resource,
                    "request_amount": deficit_info["amount_needed"],
                    "urgency": "CRITICAL",
                    "rationale": f"No surplus to trade. Requesting emergency {resource} relief.",
                })

        return recommendations

    def _generate_policy_recommendations(self, projections: dict,
                                          demographics: dict, current_policies: dict) -> list:
        """Generate internal policy recommendations."""
        recommendations = []

        # Water scarcity → increase water tax
        water_proj = projections.get("water", {})
        if water_proj.get("status") in ("CRITICAL", "DEFICIT"):
            current_tax = current_policies.get("water_tax", 0)
            if current_tax < 0.25:
                recommendations.append({
                    "policy": "water_tax",
                    "current": current_tax,
                    "recommended": min(0.30, current_tax + 0.05),
                    "rationale": "Increase water tax to reduce consumption during scarcity",
                })

        # Food deficit → increase food subsidy
        food_proj = projections.get("food", {})
        if food_proj.get("status") in ("CRITICAL", "DEFICIT"):
            current_sub = current_policies.get("food_subsidy", 0)
            if current_sub < 0.30:
                recommendations.append({
                    "policy": "food_subsidy",
                    "current": current_sub,
                    "recommended": min(0.35, current_sub + 0.05),
                    "rationale": "Increase food subsidy to boost production",
                })

        # High unrest → increase subsidies broadly
        if demographics.get("unrest_level", 0) > 0.25:
            recommendations.append({
                "policy": "emergency_welfare",
                "rationale": "High unrest detected — consider broad welfare spending",
            })

        # Energy surplus → lower tariff to boost trade
        energy_proj = projections.get("energy", {})
        if energy_proj.get("status") == "SURPLUS":
            current_tariff = current_policies.get("energy_tariff", 0)
            if current_tariff > 0.05:
                recommendations.append({
                    "policy": "energy_tariff",
                    "current": current_tariff,
                    "recommended": max(0.03, current_tariff - 0.03),
                    "rationale": "Lower energy tariff to encourage exports",
                })

        return recommendations

    def _calculate_health_score(self, projections: dict, demographics: dict,
                                 finops: dict) -> float:
        """Calculate overall regional health score (0-100)."""
        score = 100.0

        # Resource penalties
        for resource, proj in projections.items():
            if proj["status"] == "CRITICAL":
                score -= 25
            elif proj["status"] == "DEFICIT":
                score -= 10

        # Demographic penalties
        unrest = demographics.get("unrest_level", 0)
        score -= unrest * 30

        migration = demographics.get("migration_pressure", 0)
        if migration > 0.2:
            score -= migration * 15

        # Budget health
        surplus = finops.get("budget_surplus", 0)
        if surplus < 0:
            score -= 15

        burn_rate = finops.get("burn_rate", 0)
        if burn_rate > 0.15:
            score -= 10

        return max(0, min(100, score))

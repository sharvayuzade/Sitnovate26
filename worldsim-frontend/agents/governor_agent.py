"""
WORLDSIM: India Ecosystem — Governor Agent (Brain 2: The Diplomat)
Agentic LLM Governor that uses Ollama for diplomatic negotiation,
treaty proposals, and federal assembly participation.
"""

import sys
import os
import json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import STATE_NAMES
from agents.ollama_client import get_ollama_client


class GovernorAgent:
    """
    The Diplomat Brain — uses an LLM to generate strategic negotiations,
    treaty proposals, and policy votes based on FinOps StateReports.
    """

    def __init__(self, region_code: str):
        self.region_code = region_code
        self.region_name = STATE_NAMES.get(region_code, region_code)
        self.client = get_ollama_client()

    # ─── System Prompt ────────────────────────────────────────────────────

    def _get_system_prompt(self) -> str:
        return (
            f"You are the Governor of {self.region_name} ({self.region_code}) "
            f"in a multi-state economic simulation of India. "
            f"Your role is to negotiate trade deals, propose treaties, and make "
            f"policy decisions that benefit your state while contributing to "
            f"national stability. "
            f"You must balance self-interest with cooperation — the national "
            f"reward function penalizes inequality between states. "
            f"Always respond in valid JSON format as instructed."
        )

    # ─── Trade Negotiation ────────────────────────────────────────────────

    def negotiate_trade(self, state_report: dict, target_region: str,
                        target_surpluses: dict) -> dict:
        """
        Generate a trade negotiation proposal to another state.

        Args:
            state_report: This state's FinOps StateReport
            target_region: Code of the state to negotiate with
            target_surpluses: Dict of what the target state has in surplus

        Returns:
            Trade proposal dict with offer/request details.
        """
        target_name = STATE_NAMES.get(target_region, target_region)

        prompt = f"""Based on your state's analysis, generate a trade proposal.

YOUR STATE ({self.region_code} - {self.region_name}):
- GDP Score: {state_report.get('gdp_score', 0)}
- Health Score: {state_report.get('health_score', 0)}
- Deficits: {json.dumps(state_report.get('deficits', {}))}
- Surpluses: {json.dumps(state_report.get('surpluses', {}))}
- Trust Score: {state_report.get('trust_score', 100)}

TARGET STATE ({target_region} - {target_name}):
- Known Surpluses: {json.dumps(target_surpluses)}

Trade Recommendations from FinOps: {json.dumps(state_report.get('trade_recommendations', []))}

Respond with a JSON object:
{{
    "action": "TRADE_PROPOSAL",
    "from": "{self.region_code}",
    "to": "{target_region}",
    "offering": {{"resource_name": amount}},
    "requesting": {{"resource_name": amount}},
    "message": "A 1-2 sentence diplomatic message explaining the proposal",
    "urgency": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL"
}}

Be strategic: offer what you have surplus of, request what you critically need. Keep quantities reasonable (100-1000 range)."""

        result = self.client.generate(
            prompt=prompt,
            system=self._get_system_prompt(),
            format_json=True,
        )

        if result["success"] and result["parsed"]:
            proposal = result["parsed"]
            # Ensure required fields
            proposal.setdefault("action", "TRADE_PROPOSAL")
            proposal.setdefault("from", self.region_code)
            proposal.setdefault("to", target_region)
            proposal.setdefault("offering", {})
            proposal.setdefault("requesting", {})
            proposal.setdefault("message", "Trade proposal")
            proposal.setdefault("urgency", "MEDIUM")
            return proposal

        # Fallback: use FinOps recommendation directly
        return self._fallback_trade(state_report, target_region, target_surpluses)

    # ─── Treaty Proposal ──────────────────────────────────────────────────

    def propose_treaty(self, state_report: dict, target_region: str,
                       duration_ticks: int = 20) -> dict:
        """
        Generate a long-term treaty proposal.

        Args:
            state_report: This state's FinOps StateReport
            target_region: Code of the state to propose treaty to
            duration_ticks: How many ticks the treaty should last

        Returns:
            Treaty proposal dict.
        """
        target_name = STATE_NAMES.get(target_region, target_region)

        prompt = f"""Propose a long-term treaty between your state and {target_name}.

YOUR STATE ({self.region_code} - {self.region_name}):
- GDP Score: {state_report.get('gdp_score', 0)}
- Deficits: {json.dumps(state_report.get('deficits', {}))}
- Surpluses: {json.dumps(state_report.get('surpluses', {}))}

The treaty should last {duration_ticks} ticks (months). Each tick, both states exchange resources.

Respond with JSON:
{{
    "action": "TREATY_PROPOSAL",
    "from": "{self.region_code}",
    "to": "{target_region}",
    "duration_ticks": {duration_ticks},
    "per_tick_offer": {{"resource_name": amount_per_tick}},
    "per_tick_request": {{"resource_name": amount_per_tick}},
    "conditions": "Any special conditions or clauses",
    "message": "A diplomatic message explaining the treaty benefits"
}}

Keep per-tick amounts small (10-100 range) since they compound over many ticks."""

        result = self.client.generate(
            prompt=prompt,
            system=self._get_system_prompt(),
            format_json=True,
        )

        if result["success"] and result["parsed"]:
            treaty = result["parsed"]
            treaty.setdefault("action", "TREATY_PROPOSAL")
            treaty.setdefault("from", self.region_code)
            treaty.setdefault("to", target_region)
            treaty.setdefault("duration_ticks", duration_ticks)
            treaty.setdefault("per_tick_offer", {})
            treaty.setdefault("per_tick_request", {})
            return treaty

        # Fallback
        return self._fallback_treaty(state_report, target_region, duration_ticks)

    # ─── Federal Assembly Participation ───────────────────────────────────

    def propose_federal_policy(self, state_report: dict,
                                all_states_summary: dict) -> dict:
        """
        Generate a federal policy proposal for the Assembly.

        Args:
            state_report: This state's FinOps StateReport
            all_states_summary: Dict of all states' GDP and deficit info

        Returns:
            Policy proposal dict.
        """
        prompt = f"""You are at the Federal Assembly of India. Propose ONE national policy.

YOUR STATE ({self.region_code} - {self.region_name}):
- GDP: {state_report.get('gdp_score', 0)}, Health: {state_report.get('health_score', 0)}
- Deficits: {json.dumps(state_report.get('deficits', {}))}

NATIONAL OVERVIEW:
{json.dumps(all_states_summary, indent=2)}

Respond with JSON:
{{
    "action": "FEDERAL_PROPOSAL",
    "proposer": "{self.region_code}",
    "policy_name": "Short Name for the Policy Act",
    "policy_type": "INFRASTRUCTURE" or "TRADE" or "WELFARE" or "CLIMATE",
    "description": "One sentence describing the policy",
    "effect": {{"affected_resource": "percentage_change (e.g. 0.05 for 5%)"}},
    "duration_ticks": 100,
    "speech": "A 2-3 sentence speech proposing this to the assembly"
}}"""

        result = self.client.generate(
            prompt=prompt,
            system=self._get_system_prompt(),
            format_json=True,
        )

        if result["success"] and result["parsed"]:
            proposal = result["parsed"]
            proposal.setdefault("action", "FEDERAL_PROPOSAL")
            proposal.setdefault("proposer", self.region_code)
            return proposal

        return self._fallback_federal_policy(state_report)

    def vote_on_policy(self, state_report: dict, policy: dict) -> dict:
        """
        Vote on a federal policy proposal.

        Returns:
            Dict with 'vote' (YES/NO) and 'reasoning'.
        """
        prompt = f"""A federal policy has been proposed. Vote YES or NO.

YOUR STATE ({self.region_code} - {self.region_name}):
- GDP: {state_report.get('gdp_score', 0)}
- Deficits: {json.dumps(state_report.get('deficits', {}))}

PROPOSED POLICY:
- Name: {policy.get('policy_name', 'Unknown')}
- Description: {policy.get('description', '')}
- Effects: {json.dumps(policy.get('effect', {}))}
- Duration: {policy.get('duration_ticks', 0)} ticks

Respond with JSON:
{{
    "vote": "YES" or "NO",
    "reasoning": "One sentence explaining your vote"
}}"""

        result = self.client.generate(
            prompt=prompt,
            system=self._get_system_prompt(),
            format_json=True,
        )

        if result["success"] and result["parsed"]:
            vote = result["parsed"]
            vote.setdefault("vote", "YES")
            vote.setdefault("reasoning", "No reasoning provided")
            return vote

        # Fallback: vote YES if it helps our deficits
        return {"vote": "YES", "reasoning": "Default vote — policy may help national stability"}

    # ─── Relief Response ──────────────────────────────────────────────────

    def evaluate_relief_request(self, state_report: dict, requesting_region: str,
                                 resource: str, amount: int) -> dict:
        """
        Evaluate whether to send relief aid to a disaster-hit region.

        Returns:
            Dict with decision and amount.
        """
        prompt = f"""A state is requesting emergency relief after a disaster.

YOUR STATE ({self.region_code}):
- Surpluses: {json.dumps(state_report.get('surpluses', {}))}
- Health: {state_report.get('health_score', 0)}

RELIEF REQUEST:
- From: {requesting_region} ({STATE_NAMES.get(requesting_region, '')})
- Needs: {amount} units of {resource}
- Reason: Climate disaster

Sending relief costs you resources now but earns Diplomatic Leverage (karma).

Respond with JSON:
{{
    "action": "RELIEF_RESPONSE",
    "send_aid": true or false,
    "resource": "{resource}",
    "amount": how_much_to_send (0 if refusing),
    "message": "Brief diplomatic message"
}}"""

        result = self.client.generate(
            prompt=prompt,
            system=self._get_system_prompt(),
            format_json=True,
        )

        if result["success"] and result["parsed"]:
            return result["parsed"]

        # Fallback: send 25% of requested if we have surplus
        has_surplus = resource in state_report.get("surpluses", {})
        if has_surplus:
            available = state_report["surpluses"][resource].get("amount_available", 0)
            send_amount = min(amount // 4, available)
            return {
                "action": "RELIEF_RESPONSE",
                "send_aid": send_amount > 0,
                "resource": resource,
                "amount": send_amount,
                "message": f"{self.region_name} sends {send_amount} {resource} as relief.",
            }

        return {"action": "RELIEF_RESPONSE", "send_aid": False, "resource": resource,
                "amount": 0, "message": "Unable to provide relief — no surplus."}

    # ─── Fallback Methods (Rule-based) ────────────────────────────────────

    def _fallback_trade(self, state_report: dict, target_region: str,
                        target_surpluses: dict) -> dict:
        """Rule-based fallback when LLM fails."""
        recs = state_report.get("trade_recommendations", [])
        if recs:
            rec = recs[0]
            return {
                "action": "TRADE_PROPOSAL",
                "from": self.region_code,
                "to": target_region,
                "offering": {rec.get("offer_resource", "energy"): rec.get("offer_amount", 100)},
                "requesting": {rec.get("request_resource", "water"): rec.get("request_amount", 100)},
                "message": f"{self.region_name} proposes a fair resource exchange.",
                "urgency": rec.get("urgency", "MEDIUM"),
            }
        return {
            "action": "TRADE_PROPOSAL",
            "from": self.region_code,
            "to": target_region,
            "offering": {},
            "requesting": {},
            "message": "No trade needed at this time.",
            "urgency": "LOW",
        }

    def _fallback_treaty(self, state_report: dict, target_region: str,
                         duration: int) -> dict:
        """Rule-based fallback for treaty proposals."""
        deficits = state_report.get("deficits", {})
        surpluses = state_report.get("surpluses", {})

        per_tick_offer = {}
        per_tick_request = {}

        if surpluses:
            res = list(surpluses.keys())[0]
            per_tick_offer[res] = min(50, surpluses[res].get("amount_available", 50) // duration)
        if deficits:
            res = list(deficits.keys())[0]
            per_tick_request[res] = min(50, deficits[res].get("amount_needed", 50) // duration)

        return {
            "action": "TREATY_PROPOSAL",
            "from": self.region_code,
            "to": target_region,
            "duration_ticks": duration,
            "per_tick_offer": per_tick_offer,
            "per_tick_request": per_tick_request,
            "message": f"{self.region_name} proposes a mutually beneficial treaty.",
        }

    def _fallback_federal_policy(self, state_report: dict) -> dict:
        """Rule-based fallback for federal policy proposals."""
        deficits = state_report.get("deficits", {})
        if "water" in deficits:
            return {
                "action": "FEDERAL_PROPOSAL",
                "proposer": self.region_code,
                "policy_name": "National Water Sharing Framework",
                "policy_type": "INFRASTRUCTURE",
                "description": "Mandate 5% water surplus sharing across states",
                "effect": {"water": 0.05},
                "duration_ticks": 50,
                "speech": f"{self.region_name} calls for equitable water distribution.",
            }
        return {
            "action": "FEDERAL_PROPOSAL",
            "proposer": self.region_code,
            "policy_name": "Economic Growth Initiative",
            "policy_type": "TRADE",
            "description": "Reduce inter-state trade tariffs by 3%",
            "effect": {"trade_tariff": -0.03},
            "duration_ticks": 50,
            "speech": f"{self.region_name} advocates for freer trade.",
        }

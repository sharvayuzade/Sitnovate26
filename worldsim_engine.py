"""
WorldSim Engine — Core Simulation Module
=========================================
Implements the world model with regions, resources, climate events,
trade system, and population dynamics for the Adaptive Resource
Scarcity & Agent Strategy Simulator.

Hardware target: Intel i5-1220P / Iris Xe (CPU-only, no GPU required)
"""

import numpy as np
import random
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional
from enum import Enum
from copy import deepcopy


# ════════════════════════════════════════════════════════════════
# ENUMERATIONS
# ════════════════════════════════════════════════════════════════

class ResourceType(Enum):
    WATER = "water"
    FOOD = "food"
    ENERGY = "energy"
    LAND = "land"


class EventType(Enum):
    DROUGHT = "drought"
    FLOOD = "flood"
    EARTHQUAKE = "earthquake"
    PLAGUE = "plague"
    BUMPER_HARVEST = "bumper_harvest"
    ENERGY_CRISIS = "energy_crisis"
    ENERGY_BOOM = "energy_boom"
    WATER_DISCOVERY = "water_discovery"
    VOLCANIC_ERUPTION = "volcanic_eruption"
    TRADE_DISRUPTION = "trade_disruption"
    TECHNOLOGICAL_LEAP = "technological_leap"
    NONE = "none"


class BiomeType(Enum):
    TROPICAL = "Tropical Rainforest"
    ARID = "Arid Desert"
    TEMPERATE = "Temperate Plains"
    CONTINENTAL = "Continental Forest"
    POLAR = "Polar Tundra"
    COASTAL = "Coastal Maritime"
    MOUNTAINOUS = "Highland Mountains"
    RIVERINE = "River Delta"


RESOURCE_KEYS = ["water", "food", "energy", "land"]
SEASONS = ["Spring", "Summer", "Autumn", "Winter"]


# ════════════════════════════════════════════════════════════════
# REGION
# ════════════════════════════════════════════════════════════════

@dataclass
class Region:
    """Represents a geographic region with resources and population."""
    name: str
    biome: BiomeType
    resources: Dict[str, float]
    max_resources: Dict[str, float]
    production_rates: Dict[str, float]
    consumption_per_pop: Dict[str, float]
    population: float
    max_population: float
    position: Tuple[float, float]
    neighbors: List[str] = field(default_factory=list)
    happiness: float = 0.50
    tech_level: float = 1.0
    is_alive: bool = True
    collapse_cycle: int = -1

    def resource_ratio(self, res: str) -> float:
        """Get resource level as fraction of capacity (0-1)."""
        return self.resources[res] / max(self.max_resources[res], 1)

    def get_state_tuple(self) -> tuple:
        """Discretize state for Q-learning. Returns a hashable tuple."""
        def level(ratio):
            if ratio < 0.15:
                return 0   # critical
            elif ratio < 0.35:
                return 1   # low
            elif ratio < 0.55:
                return 2   # medium
            elif ratio < 0.75:
                return 3   # high
            else:
                return 4   # abundant

        resource_levels = tuple(
            level(self.resource_ratio(r)) for r in RESOURCE_KEYS
        )
        pop_bucket = min(int(self.population // 50), 5)
        happiness_bucket = min(int(self.happiness * 4), 3)
        return resource_levels + (pop_bucket, happiness_bucket)

    def total_consumption(self, res: str) -> float:
        return self.consumption_per_pop[res] * self.population

    def surplus(self, res: str) -> float:
        """Resources above 3-cycle consumption buffer."""
        return self.resources[res] - self.total_consumption(res) * 3

    def deficit_resources(self) -> List[str]:
        return [r for r in RESOURCE_KEYS if self.resource_ratio(r) < 0.3]

    def surplus_resources(self) -> List[str]:
        return [r for r in RESOURCE_KEYS if self.resource_ratio(r) > 0.55]

    def overall_satisfaction(self) -> float:
        return float(np.mean([self.resource_ratio(r) for r in RESOURCE_KEYS]))

    def clamp_resources(self):
        for res in RESOURCE_KEYS:
            self.resources[res] = float(
                np.clip(self.resources[res], 0, self.max_resources[res])
            )


# ════════════════════════════════════════════════════════════════
# CLIMATE EVENT SYSTEM
# ════════════════════════════════════════════════════════════════

class ClimateSystem:
    """Generates climate events with biome-specific probabilities and
    seasonal / long-term climate-stress modifiers."""

    # Biome -> event type -> base weight
    BIOME_EVENT_WEIGHTS = {
        BiomeType.TROPICAL: {
            EventType.FLOOD: 0.30, EventType.PLAGUE: 0.20,
            EventType.BUMPER_HARVEST: 0.25, EventType.DROUGHT: 0.10,
            EventType.TECHNOLOGICAL_LEAP: 0.05,
        },
        BiomeType.ARID: {
            EventType.DROUGHT: 0.35, EventType.ENERGY_BOOM: 0.20,
            EventType.WATER_DISCOVERY: 0.15, EventType.EARTHQUAKE: 0.10,
            EventType.TRADE_DISRUPTION: 0.05,
        },
        BiomeType.TEMPERATE: {
            EventType.BUMPER_HARVEST: 0.30, EventType.FLOOD: 0.15,
            EventType.DROUGHT: 0.15, EventType.PLAGUE: 0.10,
            EventType.TECHNOLOGICAL_LEAP: 0.10,
        },
        BiomeType.CONTINENTAL: {
            EventType.DROUGHT: 0.20, EventType.FLOOD: 0.15,
            EventType.BUMPER_HARVEST: 0.20, EventType.ENERGY_CRISIS: 0.15,
            EventType.EARTHQUAKE: 0.05,
        },
        BiomeType.POLAR: {
            EventType.ENERGY_CRISIS: 0.30, EventType.WATER_DISCOVERY: 0.15,
            EventType.EARTHQUAKE: 0.10, EventType.FLOOD: 0.10,
            EventType.DROUGHT: 0.10,
        },
        BiomeType.COASTAL: {
            EventType.FLOOD: 0.30, EventType.BUMPER_HARVEST: 0.15,
            EventType.WATER_DISCOVERY: 0.15, EventType.PLAGUE: 0.10,
            EventType.TRADE_DISRUPTION: 0.10,
        },
        BiomeType.MOUNTAINOUS: {
            EventType.EARTHQUAKE: 0.25, EventType.ENERGY_BOOM: 0.20,
            EventType.VOLCANIC_ERUPTION: 0.10, EventType.DROUGHT: 0.10,
            EventType.FLOOD: 0.10,
        },
        BiomeType.RIVERINE: {
            EventType.FLOOD: 0.30, EventType.BUMPER_HARVEST: 0.25,
            EventType.WATER_DISCOVERY: 0.10, EventType.PLAGUE: 0.10,
            EventType.TECHNOLOGICAL_LEAP: 0.08,
        },
    }

    def __init__(self, rng: np.random.RandomState):
        self.rng = rng
        self.base_event_prob = 0.15
        self.climate_stress = 0.0
        self.season_idx = 0

    @property
    def season(self):
        return SEASONS[self.season_idx]

    def advance(self, cycle: int):
        self.season_idx = cycle % 4
        self.climate_stress = min(0.45, self.climate_stress + 0.0008)

    def generate_events(
        self, regions: Dict[str, Region], cycle: int
    ) -> List[dict]:
        self.advance(cycle)
        events = []
        prob = self.base_event_prob + self.climate_stress

        for name, region in regions.items():
            if not region.is_alive:
                continue
            if self.rng.random() < prob:
                evt = self._local_event(region, cycle)
                if evt:
                    events.append(evt)

        # Rare global events
        if self.rng.random() < 0.025 + self.climate_stress * 0.04:
            events.append(self._global_event(cycle))

        return events

    def _local_event(self, region: Region, cycle: int) -> Optional[dict]:
        weights_map = self.BIOME_EVENT_WEIGHTS.get(
            region.biome,
            {EventType.DROUGHT: 0.25, EventType.FLOOD: 0.25}
        )
        weights_map = dict(weights_map)  # copy

        # Seasonal modifiers
        if self.season_idx == 1:   # Summer
            weights_map[EventType.DROUGHT] = weights_map.get(EventType.DROUGHT, 0.1) * 1.4
        elif self.season_idx == 3: # Winter
            weights_map[EventType.ENERGY_CRISIS] = weights_map.get(EventType.ENERGY_CRISIS, 0.1) * 1.4

        events = list(weights_map.keys())
        probs = np.array([weights_map[e] for e in events], dtype=float)
        probs /= probs.sum()

        idx = self.rng.choice(len(events), p=probs)
        return {
            "type": events[idx],
            "region": region.name,
            "cycle": cycle,
            "season": self.season,
            "severity": float(self.rng.uniform(0.3, 1.0)),
            "is_global": False,
        }

    def _global_event(self, cycle: int) -> dict:
        choices = [EventType.DROUGHT, EventType.ENERGY_CRISIS,
                   EventType.PLAGUE, EventType.TRADE_DISRUPTION]
        evt = self.rng.choice(choices)
        return {
            "type": evt,
            "region": "GLOBAL",
            "cycle": cycle,
            "season": self.season,
            "severity": float(self.rng.uniform(0.15, 0.50)),
            "is_global": True,
        }


# ════════════════════════════════════════════════════════════════
# TRADE SYSTEM
# ════════════════════════════════════════════════════════════════

class TradeSystem:
    """Bilateral trade negotiation system based on surplus/deficit matching
    and evolving relationship scores between regions."""

    def __init__(self, rng: np.random.RandomState):
        self.rng = rng
        self.trade_history: List[dict] = []
        self.relationship: Dict[Tuple[str, str], float] = {}
        self.disrupted = False   # set by trade_disruption events

    def get_rel(self, r1: str, r2: str) -> float:
        key = tuple(sorted([r1, r2]))
        return self.relationship.get(key, 0.5)

    def update_rel(self, r1: str, r2: str, delta: float):
        key = tuple(sorted([r1, r2]))
        cur = self.relationship.get(key, 0.5)
        self.relationship[key] = float(np.clip(cur + delta, 0.0, 1.0))

    def decay_relationships(self):
        """Slight decay each cycle — relationships need maintenance."""
        for key in self.relationship:
            self.relationship[key] = max(
                0.1, self.relationship[key] - 0.003
            )

    def negotiate_trades(
        self,
        regions: Dict[str, Region],
        agent_decisions: Dict[str, dict],
        cycle: int,
    ) -> List[dict]:
        """Match willing traders and execute bilateral exchanges."""
        if self.disrupted:
            self.disrupted = False
            return []  # trade disruption event blocks all trade this cycle

        self.decay_relationships()
        trades_executed = []

        # ANY alive region can passively sell surplus resources
        sellers = {}   # resource -> [(region_name, amount)]
        for name, region in regions.items():
            if not region.is_alive:
                continue
            for res in region.surplus_resources():
                amount = region.surplus(res) * 0.30
                if amount > 5:
                    sellers.setdefault(res, []).append((name, amount))

        # Regions choosing "trade" actively seek to BUY what they lack
        # Regions NOT choosing trade can still buy if ratio < 0.20 (emergency)
        buyers = {}   # resource -> [(region_name, need, offering_resource)]
        for name, decision in agent_decisions.items():
            region = regions[name]
            if not region.is_alive:
                continue

            is_active_trader = decision.get("action") == "trade"
            deficit_threshold = 0.40 if is_active_trader else 0.18

            deficit_res = [r for r in RESOURCE_KEYS if region.resource_ratio(r) < deficit_threshold]
            surplus_res = [r for r in RESOURCE_KEYS if region.resource_ratio(r) > 0.45]

            for res in deficit_res:
                need = region.max_resources[res] * 0.35 - region.resources[res]
                if need > 5:
                    for offer_res in surplus_res:
                        if offer_res != res:
                            buyers.setdefault(res, []).append(
                                (name, need, offer_res)
                            )
                            break

        # Match buyers with sellers
        for resource, buyer_list in buyers.items():
            if resource not in sellers:
                continue
            for buyer_name, need, offer_res in buyer_list:
                for i, (seller_name, available) in enumerate(sellers[resource]):
                    if seller_name == buyer_name or available < 3:
                        continue
                    if not regions[seller_name].is_alive:
                        continue

                    rel = self.get_rel(buyer_name, seller_name)
                    # Lower threshold: 50% base chance even at neutral relations
                    if self.rng.random() > (0.3 + 0.7 * rel):
                        continue

                    trade_amt = min(need, available, 60)
                    exchange_amt = trade_amt * (0.80 + 0.20 * rel)

                    # Seller must actually want the offered resource
                    if regions[seller_name].resource_ratio(offer_res) > 0.85:
                        continue

                    # Execute
                    regions[buyer_name].resources[resource] += trade_amt
                    regions[seller_name].resources[resource] -= trade_amt
                    regions[buyer_name].resources[offer_res] -= exchange_amt
                    regions[seller_name].resources[offer_res] += exchange_amt

                    for rn in [buyer_name, seller_name]:
                        regions[rn].clamp_resources()

                    trade = {
                        "cycle": cycle,
                        "buyer": buyer_name,
                        "seller": seller_name,
                        "resource_bought": resource,
                        "amount": round(trade_amt, 1),
                        "resource_sold": offer_res,
                        "exchange_amount": round(exchange_amt, 1),
                    }
                    trades_executed.append(trade)
                    self.trade_history.append(trade)
                    self.update_rel(buyer_name, seller_name, 0.04)

                    sellers[resource][i] = (seller_name, available - trade_amt)
                    break

        return trades_executed


# ════════════════════════════════════════════════════════════════
# WORLD
# ════════════════════════════════════════════════════════════════

class World:
    """Main simulation container. Holds regions, climate, trade, and
    runs the step-by-step world evolution."""

    REGION_CONFIGS = [
        dict(
            name="Verdantia", biome=BiomeType.TROPICAL,
            resources=dict(water=800, food=700, energy=300, land=500),
            max_resources=dict(water=1000, food=1000, energy=600, land=600),
            production_rates=dict(water=38, food=42, energy=10, land=3),
            consumption_per_pop=dict(water=0.25, food=0.20, energy=0.10, land=0.03),
            population=120, max_population=500, position=(0.15, 0.75),
        ),
        dict(
            name="Aridia", biome=BiomeType.ARID,
            resources=dict(water=200, food=300, energy=800, land=700),
            max_resources=dict(water=500, food=600, energy=1000, land=900),
            production_rates=dict(water=8, food=14, energy=48, land=5),
            consumption_per_pop=dict(water=0.30, food=0.20, energy=0.15, land=0.02),
            population=80, max_population=300, position=(0.50, 0.88),
        ),
        dict(
            name="Temperalis", biome=BiomeType.TEMPERATE,
            resources=dict(water=600, food=600, energy=500, land=600),
            max_resources=dict(water=800, food=800, energy=700, land=800),
            production_rates=dict(water=28, food=32, energy=22, land=4),
            consumption_per_pop=dict(water=0.20, food=0.20, energy=0.15, land=0.03),
            population=150, max_population=600, position=(0.35, 0.50),
        ),
        dict(
            name="Borealis", biome=BiomeType.CONTINENTAL,
            resources=dict(water=500, food=400, energy=600, land=800),
            max_resources=dict(water=700, food=700, energy=800, land=1000),
            production_rates=dict(water=22, food=18, energy=32, land=5),
            consumption_per_pop=dict(water=0.20, food=0.25, energy=0.20, land=0.03),
            population=100, max_population=400, position=(0.68, 0.58),
        ),
        dict(
            name="Glaciera", biome=BiomeType.POLAR,
            resources=dict(water=900, food=150, energy=200, land=300),
            max_resources=dict(water=1200, food=400, energy=500, land=400),
            production_rates=dict(water=48, food=5, energy=12, land=1),
            consumption_per_pop=dict(water=0.15, food=0.25, energy=0.30, land=0.02),
            population=50, max_population=200, position=(0.82, 0.18),
        ),
        dict(
            name="Maritosa", biome=BiomeType.COASTAL,
            resources=dict(water=700, food=600, energy=400, land=350),
            max_resources=dict(water=900, food=800, energy=600, land=450),
            production_rates=dict(water=32, food=36, energy=18, land=2),
            consumption_per_pop=dict(water=0.20, food=0.18, energy=0.15, land=0.04),
            population=130, max_population=450, position=(0.15, 0.32),
        ),
        dict(
            name="Montarok", biome=BiomeType.MOUNTAINOUS,
            resources=dict(water=400, food=250, energy=700, land=400),
            max_resources=dict(water=600, food=500, energy=900, land=500),
            production_rates=dict(water=18, food=10, energy=42, land=2),
            consumption_per_pop=dict(water=0.20, food=0.22, energy=0.10, land=0.03),
            population=70, max_population=250, position=(0.85, 0.72),
        ),
        dict(
            name="Fluviana", biome=BiomeType.RIVERINE,
            resources=dict(water=850, food=750, energy=350, land=550),
            max_resources=dict(water=1100, food=900, energy=500, land=700),
            production_rates=dict(water=42, food=40, energy=12, land=4),
            consumption_per_pop=dict(water=0.20, food=0.18, energy=0.12, land=0.03),
            population=140, max_population=550, position=(0.50, 0.28),
        ),
    ]

    def __init__(self, seed: int = 42, num_cycles: int = 500):
        self.seed = seed
        self.rng = np.random.RandomState(seed)
        random.seed(seed)
        self.cycle = 0
        self.max_cycles = num_cycles

        self.regions: Dict[str, Region] = {}
        self.climate = ClimateSystem(self.rng)
        self.trade_system = TradeSystem(self.rng)

        # ── History buffers ──
        self.resource_history: List[Dict[str, Dict[str, float]]] = []
        self.population_history: List[Dict[str, float]] = []
        self.happiness_history: List[Dict[str, float]] = []
        self.tech_history: List[Dict[str, float]] = []
        self.event_history: List[dict] = []
        self.trade_count_history: List[int] = []
        self.strategy_history: List[Dict[str, str]] = []
        self.season_history: List[str] = []
        self.collapse_log: List[dict] = []

        self._init_regions()

    # ─── Initialization ─────────────────────────────────────────

    def _init_regions(self):
        for cfg in self.REGION_CONFIGS:
            self.regions[cfg["name"]] = Region(**cfg)

        # Assign neighbors by proximity
        names = list(self.regions.keys())
        for i, r1 in enumerate(names):
            pos1 = np.array(self.regions[r1].position)
            dists = []
            for j, r2 in enumerate(names):
                if i != j:
                    pos2 = np.array(self.regions[r2].position)
                    dists.append((r2, np.linalg.norm(pos1 - pos2)))
            dists.sort(key=lambda x: x[1])
            self.regions[r1].neighbors = [d[0] for d in dists[:3]]

        # Initialize relationship scores
        for i, r1 in enumerate(names):
            for r2 in names[i + 1:]:
                self.trade_system.relationship[tuple(sorted([r1, r2]))] = 0.5

    # ─── Event Application ──────────────────────────────────────

    def _apply_event(self, event: dict):
        etype = event["type"]
        severity = event["severity"]

        targets = (
            [r for r in self.regions.values() if r.is_alive]
            if event["is_global"]
            else [self.regions[event["region"]]]
            if event["region"] in self.regions and self.regions[event["region"]].is_alive
            else []
        )

        for region in targets:
            if etype == EventType.DROUGHT:
                region.resources["water"] *= (1 - 0.30 * severity)
                region.resources["food"] *= (1 - 0.12 * severity)
                region.production_rates["water"] *= max(0.8, 1 - 0.08 * severity)

            elif etype == EventType.FLOOD:
                region.resources["food"] *= (1 - 0.22 * severity)
                region.resources["land"] *= (1 - 0.08 * severity)
                region.resources["water"] = min(
                    region.resources["water"] + region.max_resources["water"] * 0.18 * severity,
                    region.max_resources["water"]
                )

            elif etype == EventType.EARTHQUAKE:
                region.resources["energy"] *= (1 - 0.18 * severity)
                region.resources["land"] *= (1 - 0.12 * severity)
                region.population *= (1 - 0.04 * severity)

            elif etype == EventType.PLAGUE:
                region.population *= (1 - 0.12 * severity)
                region.happiness *= (1 - 0.15 * severity)

            elif etype == EventType.BUMPER_HARVEST:
                region.resources["food"] = min(
                    region.resources["food"] + region.max_resources["food"] * 0.25 * severity,
                    region.max_resources["food"]
                )
                region.happiness = min(1.0, region.happiness + 0.05 * severity)

            elif etype == EventType.ENERGY_CRISIS:
                region.resources["energy"] *= (1 - 0.28 * severity)
                region.production_rates["energy"] *= max(0.85, 1 - 0.04 * severity)

            elif etype == EventType.ENERGY_BOOM:
                region.resources["energy"] = min(
                    region.resources["energy"] + region.max_resources["energy"] * 0.22 * severity,
                    region.max_resources["energy"]
                )
                region.production_rates["energy"] *= (1 + 0.04 * severity)

            elif etype == EventType.WATER_DISCOVERY:
                region.resources["water"] = min(
                    region.resources["water"] + region.max_resources["water"] * 0.18 * severity,
                    region.max_resources["water"]
                )
                region.production_rates["water"] *= (1 + 0.04 * severity)

            elif etype == EventType.VOLCANIC_ERUPTION:
                region.resources["land"] *= (1 - 0.18 * severity)
                region.resources["energy"] = min(
                    region.resources["energy"] + region.max_resources["energy"] * 0.12 * severity,
                    region.max_resources["energy"]
                )
                region.population *= (1 - 0.08 * severity)

            elif etype == EventType.TRADE_DISRUPTION:
                self.trade_system.disrupted = True
                # Also damage relationships slightly
                for key in self.trade_system.relationship:
                    self.trade_system.relationship[key] = max(
                        0.1, self.trade_system.relationship[key] - 0.05 * severity
                    )

            elif etype == EventType.TECHNOLOGICAL_LEAP:
                region.tech_level = min(3.0, region.tech_level + 0.15 * severity)
                region.happiness = min(1.0, region.happiness + 0.05)

            region.clamp_resources()
            region.population = max(0, region.population)

    # ─── Agent Action Application ───────────────────────────────

    def _apply_action(self, name: str, decision: dict):
        region = self.regions[name]
        action = decision.get("action", "balance")

        if action == "focus_water":
            region.resources["water"] += region.production_rates["water"] * 0.5 * region.tech_level
        elif action == "focus_food":
            region.resources["food"] += region.production_rates["food"] * 0.5 * region.tech_level
        elif action == "focus_energy":
            region.resources["energy"] += region.production_rates["energy"] * 0.5 * region.tech_level
        elif action == "expand_land":
            region.resources["land"] = min(
                region.resources["land"] + 12 * region.tech_level,
                region.max_resources["land"]
            )
        elif action == "conserve":
            for res in ["water", "food", "energy"]:
                saved = region.consumption_per_pop[res] * region.population * 0.35
                region.resources[res] += saved
            region.happiness *= 0.98  # minor unhappiness from rationing
        elif action == "research":
            region.tech_level = min(3.0, region.tech_level + 0.018)
        elif action == "trade":
            pass  # handled by TradeSystem
        elif action == "stockpile":
            for res in ["water", "food", "energy"]:
                region.max_resources[res] *= 1.004
        elif action == "balance":
            for res in ["water", "food", "energy"]:
                region.resources[res] += region.production_rates[res] * 0.12 * region.tech_level

        region.clamp_resources()

    # ─── Main Simulation Step ───────────────────────────────────

    def step(self, agent_decisions: Dict[str, dict]) -> dict:
        """Advance the world by one cycle. Returns cycle log."""
        self.cycle += 1
        log = {"cycle": self.cycle, "events": [], "trades": [],
               "collapses": [], "season": self.climate.season}

        # 1. Natural resource production
        for name, region in self.regions.items():
            if not region.is_alive:
                continue
            for res in RESOURCE_KEYS:
                land_factor = region.resource_ratio("land") if res != "land" else 1.0
                prod = region.production_rates[res] * region.tech_level * (0.5 + 0.5 * land_factor)
                region.resources[res] = min(
                    region.resources[res] + prod,
                    region.max_resources[res]
                )

        # 2. Population consumption
        for name, region in self.regions.items():
            if not region.is_alive:
                continue
            for res in RESOURCE_KEYS:
                consumption = region.consumption_per_pop[res] * region.population
                region.resources[res] = max(0, region.resources[res] - consumption)

        # 3. Agent actions
        for name, decision in agent_decisions.items():
            if self.regions[name].is_alive:
                self._apply_action(name, decision)

        # 4. Climate events
        events = self.climate.generate_events(self.regions, self.cycle)
        for evt in events:
            self._apply_event(evt)
            log["events"].append(evt)
            self.event_history.append(evt)

        # 5. Trade
        trades = self.trade_system.negotiate_trades(
            self.regions, agent_decisions, self.cycle
        )
        log["trades"] = trades

        # 6. Population dynamics & happiness
        for name, region in self.regions.items():
            if not region.is_alive:
                continue
            sat = region.overall_satisfaction()
            region.happiness = 0.7 * region.happiness + 0.3 * sat

            # Growth / decline
            if sat > 0.45:
                growth = 0.018 * (sat - 0.45) * region.happiness
            else:
                growth = -0.028 * (0.45 - sat)

            # Critical resource penalties
            for res in ["water", "food"]:
                if region.resource_ratio(res) < 0.10:
                    growth -= 0.04

            region.population = float(
                np.clip(region.population * (1 + growth), 0, region.max_population)
            )

            # Passive tech growth
            if agent_decisions.get(name, {}).get("action") != "research":
                region.tech_level = min(3.0, region.tech_level + 0.002)

            # Collapse check
            if region.population < 5:
                region.is_alive = False
                region.collapse_cycle = self.cycle
                log["collapses"].append(name)
                self.collapse_log.append({"name": name, "cycle": self.cycle})

        # 7. Record history
        self._record(log, agent_decisions)
        return log

    # ─── History Recording ──────────────────────────────────────

    def _record(self, log: dict, decisions: dict):
        res_snap, pop_snap, hap_snap, tech_snap, strat_snap = {}, {}, {}, {}, {}
        for name, region in self.regions.items():
            res_snap[name] = dict(region.resources)
            pop_snap[name] = region.population
            hap_snap[name] = region.happiness
            tech_snap[name] = region.tech_level
            strat_snap[name] = decisions.get(name, {}).get("action", "none")

        self.resource_history.append(res_snap)
        self.population_history.append(pop_snap)
        self.happiness_history.append(hap_snap)
        self.tech_history.append(tech_snap)
        self.trade_count_history.append(len(log["trades"]))
        self.strategy_history.append(strat_snap)
        self.season_history.append(log["season"])

    # ─── Convenience ────────────────────────────────────────────

    def get_summary(self) -> dict:
        alive = [n for n, r in self.regions.items() if r.is_alive]
        dead = [n for n, r in self.regions.items() if not r.is_alive]
        return {
            "cycle": self.cycle,
            "alive_regions": alive,
            "collapsed_regions": dead,
            "total_population": sum(
                r.population for r in self.regions.values() if r.is_alive
            ),
            "total_trades": len(self.trade_system.trade_history),
            "total_events": len(self.event_history),
            "climate_stress": round(self.climate.climate_stress, 4),
        }

    def get_region_names(self) -> List[str]:
        return list(self.regions.keys())

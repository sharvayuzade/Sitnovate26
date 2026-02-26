"""
WorldSim Agents — Reinforcement Learning Module
=================================================
Implements Q-learning agents that autonomously learn resource management,
trade, and survival strategies through interaction with the simulation.

Each agent governs a region and learns without pre-programmed rules.
"""

import numpy as np
import random
from collections import defaultdict
from typing import Dict, List, Tuple

# ════════════════════════════════════════════════════════════════
# ACTION SPACE
# ════════════════════════════════════════════════════════════════

ACTIONS = [
    "focus_water",   # 0 — invest extra production in water
    "focus_food",    # 1 — invest extra production in food
    "focus_energy",  # 2 — invest extra production in energy
    "expand_land",   # 3 — develop / reclaim land
    "conserve",      # 4 — reduce consumption (rationing)
    "trade",         # 5 — engage in bilateral trade
    "research",      # 6 — improve technology level
    "stockpile",     # 7 — expand storage capacity
    "balance",       # 8 — moderate balanced approach
]

ACTION_DESCRIPTIONS = {
    "focus_water":  "Prioritise water production",
    "focus_food":   "Prioritise food production",
    "focus_energy": "Prioritise energy production",
    "expand_land":  "Develop & reclaim land",
    "conserve":     "Ration resources to reduce consumption",
    "trade":        "Negotiate bilateral trades with neighbours",
    "research":     "Invest in technology advancement",
    "stockpile":    "Build reserves & expand storage",
    "balance":      "Balanced moderate approach across all areas",
}

NUM_ACTIONS = len(ACTIONS)


# ════════════════════════════════════════════════════════════════
# Q-LEARNING AGENT
# ════════════════════════════════════════════════════════════════

class QLearningAgent:
    """Tabular Q-learning agent governing a single region.

    State space  : (water_lvl, food_lvl, energy_lvl, land_lvl, pop_bucket, happiness_bucket)
                   each discretised into a small number of bins.
    Action space : 9 discrete actions (see ACTIONS list).
    """

    def __init__(
        self,
        name: str,
        learning_rate: float = 0.15,
        discount_factor: float = 0.95,
        epsilon_start: float = 1.0,
        epsilon_end: float = 0.05,
        epsilon_decay: float = 0.994,
    ):
        self.name = name
        self.lr = learning_rate
        self.gamma = discount_factor
        self.epsilon = epsilon_start
        self.epsilon_end = epsilon_end
        self.epsilon_decay = epsilon_decay

        # Q-table: state tuple -> array of Q-values (one per action)
        self.q_table: Dict[tuple, np.ndarray] = defaultdict(
            lambda: np.zeros(NUM_ACTIONS, dtype=np.float64)
        )

        self.last_state: tuple = None
        self.last_action_idx: int = None

        # Tracking
        self.action_history: List[int] = []
        self.reward_history: List[float] = []
        self.epsilon_history: List[float] = []
        self.total_reward: float = 0.0
        self.states_visited: set = set()

    # ─── Action Selection ───────────────────────────────────────

    def get_action(self, state: tuple) -> dict:
        """Epsilon-greedy action selection."""
        self.states_visited.add(state)

        if random.random() < self.epsilon:
            action_idx = random.randint(0, NUM_ACTIONS - 1)
        else:
            q_vals = self.q_table[state]
            # Break ties randomly
            max_q = np.max(q_vals)
            candidates = np.where(np.abs(q_vals - max_q) < 1e-8)[0]
            action_idx = int(np.random.choice(candidates))

        self.last_state = state
        self.last_action_idx = action_idx
        self.action_history.append(action_idx)
        self.epsilon_history.append(self.epsilon)

        return {"action": ACTIONS[action_idx], "action_idx": action_idx}

    # ─── Learning Update ────────────────────────────────────────

    def update(self, new_state: tuple, reward: float):
        """Standard Q-learning update rule."""
        if self.last_state is not None:
            old_q = self.q_table[self.last_state][self.last_action_idx]
            max_next_q = np.max(self.q_table[new_state])
            td_target = reward + self.gamma * max_next_q
            self.q_table[self.last_state][self.last_action_idx] = (
                old_q + self.lr * (td_target - old_q)
            )

        self.reward_history.append(reward)
        self.total_reward += reward
        self.epsilon = max(self.epsilon_end, self.epsilon * self.epsilon_decay)

    # ─── Analysis Helpers ───────────────────────────────────────

    def strategy_distribution(self, last_n: int = 50) -> Dict[str, float]:
        """Fraction of each action in the last N steps."""
        recent = self.action_history[-last_n:]
        if not recent:
            return {a: 1 / NUM_ACTIONS for a in ACTIONS}
        counts = defaultdict(int)
        for idx in recent:
            counts[ACTIONS[idx]] += 1
        return {a: counts.get(a, 0) / len(recent) for a in ACTIONS}

    def dominant_strategy(self, last_n: int = 50) -> str:
        dist = self.strategy_distribution(last_n)
        return max(dist, key=dist.get)

    def q_table_size(self) -> int:
        return len(self.q_table)

    def avg_reward(self, last_n: int = 50) -> float:
        recent = self.reward_history[-last_n:]
        return float(np.mean(recent)) if recent else 0.0


# ════════════════════════════════════════════════════════════════
# REWARD FUNCTION
# ════════════════════════════════════════════════════════════════

def compute_reward(
    region,
    prev_resources: Dict[str, float],
    prev_population: float,
    prev_happiness: float,
) -> float:
    """Multi-objective reward signal balancing survival, growth,
    resource stability, and happiness."""
    reward = 0.0

    # ── Resource maintenance ────────────────────────────────
    for res in ["water", "food", "energy", "land"]:
        ratio = region.resource_ratio(res)
        if ratio > 0.55:
            reward += 1.5
        elif ratio > 0.35:
            reward += 0.5
        elif ratio > 0.15:
            reward -= 0.8
        else:
            reward -= 3.0  # critical penalty

    # ── Resource improvement bonus ──────────────────────────
    for res in ["water", "food", "energy", "land"]:
        prev_ratio = prev_resources[res] / max(region.max_resources[res], 1)
        curr_ratio = region.resource_ratio(res)
        delta = curr_ratio - prev_ratio
        reward += delta * 5.0  # reward improvement, penalise decline

    # ── Population dynamics ─────────────────────────────────
    pop_change = (region.population - prev_population) / max(prev_population, 1)
    reward += pop_change * 12.0

    # ── Happiness ───────────────────────────────────────────
    reward += (region.happiness - prev_happiness) * 6.0
    reward += region.happiness * 2.0

    # ── Survival / collapse ─────────────────────────────────
    if region.is_alive:
        reward += 1.5
    else:
        reward -= 60.0

    # ── Balance bonus (no single resource critically low) ───
    min_ratio = min(region.resource_ratio(r) for r in ["water", "food", "energy", "land"])
    reward += min_ratio * 4.0

    # ── Technology bonus ────────────────────────────────────
    reward += region.tech_level * 0.3

    return float(reward)


# ════════════════════════════════════════════════════════════════
# AGENT MANAGER
# ════════════════════════════════════════════════════════════════

class AgentManager:
    """Coordinates all Q-learning agents — one per region."""

    def __init__(self, region_names: List[str], seed: int = 42):
        random.seed(seed)
        np.random.seed(seed)
        self.agents: Dict[str, QLearningAgent] = {
            name: QLearningAgent(name) for name in region_names
        }

    def get_decisions(self, world) -> Dict[str, dict]:
        """Query every alive agent for its action this cycle."""
        decisions = {}
        for name, agent in self.agents.items():
            region = world.regions[name]
            if region.is_alive:
                state = region.get_state_tuple()
                decisions[name] = agent.get_action(state)
            else:
                decisions[name] = {"action": "none"}
        return decisions

    def snapshot_states(self, world) -> dict:
        """Capture current region states for reward calculation."""
        return {
            name: {
                "resources": dict(region.resources),
                "population": region.population,
                "happiness": region.happiness,
            }
            for name, region in world.regions.items()
        }

    def update_all(self, world, prev_snap: dict):
        """Compute rewards and update Q-tables for all alive agents."""
        for name, agent in self.agents.items():
            region = world.regions[name]
            prev = prev_snap[name]
            if region.is_alive or region.collapse_cycle == world.cycle:
                new_state = region.get_state_tuple()
                reward = compute_reward(
                    region,
                    prev["resources"],
                    prev["population"],
                    prev["happiness"],
                )
                agent.update(new_state, reward)

    def summary(self) -> Dict[str, dict]:
        """Summary statistics for each agent."""
        return {
            name: {
                "total_reward": round(agent.total_reward, 1),
                "avg_reward_50": round(agent.avg_reward(50), 2),
                "dominant_strategy": agent.dominant_strategy(),
                "epsilon": round(agent.epsilon, 4),
                "q_table_states": agent.q_table_size(),
                "states_visited": len(agent.states_visited),
            }
            for name, agent in self.agents.items()
        }

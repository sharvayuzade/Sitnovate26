"""
WorldSim Visualization — Rich Plotting Module
===============================================
Matplotlib + Plotly visualizations for the evolving world state,
resource dynamics, trade networks, agent strategies, and analysis.

All plots are designed for Jupyter Notebook inline display.
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.patheffects as pe
from matplotlib.gridspec import GridSpec
from matplotlib.colors import LinearSegmentedColormap
import warnings

warnings.filterwarnings("ignore")

# Try optional Plotly import
try:
    import plotly.graph_objects as go
    import plotly.express as px
    from plotly.subplots import make_subplots
    HAS_PLOTLY = True
except ImportError:
    HAS_PLOTLY = False

try:
    import networkx as nx
    HAS_NETWORKX = True
except ImportError:
    HAS_NETWORKX = False


# ════════════════════════════════════════════════════════════════
# COLOUR CONSTANTS
# ════════════════════════════════════════════════════════════════

REGION_COLORS = {
    "Verdantia":  "#27ae60",
    "Aridia":     "#e67e22",
    "Temperalis": "#3498db",
    "Borealis":   "#8e44ad",
    "Glaciera":   "#95a5a6",
    "Maritosa":   "#1abc9c",
    "Montarok":   "#c0392b",
    "Fluviana":   "#2980b9",
}

RESOURCE_COLORS = {
    "water":  "#3498db",
    "food":   "#27ae60",
    "energy": "#f39c12",
    "land":   "#8b6914",
}

BIOME_ICONS = {
    "Tropical Rainforest": "🌴",
    "Arid Desert":         "🏜️",
    "Temperate Plains":    "🌾",
    "Continental Forest":  "🌲",
    "Polar Tundra":        "❄️",
    "Coastal Maritime":    "🌊",
    "Highland Mountains":  "⛰️",
    "River Delta":         "🏞️",
}

ACTION_COLORS = {
    "focus_water":  "#3498db",
    "focus_food":   "#27ae60",
    "focus_energy": "#f39c12",
    "expand_land":  "#8b6914",
    "conserve":     "#95a5a6",
    "trade":        "#e74c3c",
    "research":     "#9b59b6",
    "stockpile":    "#34495e",
    "balance":      "#1abc9c",
}


# ════════════════════════════════════════════════════════════════
# 1. WORLD MAP — Initial State
# ════════════════════════════════════════════════════════════════

def plot_world_map(world, title="WorldSim — Region Map", figsize=(14, 10)):
    """Plot regions on a 2D map with resource bar indicators."""
    fig, ax = plt.subplots(figsize=figsize)
    ax.set_facecolor("#1a1a2e")
    fig.patch.set_facecolor("#16213e")

    for name, region in world.regions.items():
        x, y = region.position
        color = REGION_COLORS.get(name, "#ffffff")
        icon = BIOME_ICONS.get(region.biome.value, "🌍")

        # Region circle
        size = 300 + region.population * 3
        alpha = 1.0 if region.is_alive else 0.3
        ax.scatter(x, y, s=size, c=color, alpha=alpha, edgecolors="white",
                   linewidths=2, zorder=5)

        # Label
        ax.annotate(
            f"{icon} {name}\nPop: {region.population:.0f}",
            (x, y), textcoords="offset points", xytext=(0, -30),
            ha="center", fontsize=9, fontweight="bold",
            color="white",
            path_effects=[pe.withStroke(linewidth=2, foreground="black")],
            zorder=10,
        )

        # Draw neighbor connections
        for nb in region.neighbors:
            if nb in world.regions:
                nx_, ny_ = world.regions[nb].position
                rel = world.trade_system.get_rel(name, nb)
                ax.plot([x, nx_], [y, ny_], color="white", alpha=rel * 0.4,
                        linewidth=rel * 2, zorder=1)

    # Resource mini-bars
    for name, region in world.regions.items():
        x, y = region.position
        bar_w, bar_h = 0.04, 0.008
        bar_y = y + 0.05
        for i, res in enumerate(["water", "food", "energy", "land"]):
            ratio = region.resource_ratio(res)
            bx = x - 0.08 + i * 0.05
            ax.barh(bar_y, ratio * bar_w, height=bar_h,
                    left=bx, color=RESOURCE_COLORS[res], alpha=0.9, zorder=6)
            ax.barh(bar_y, bar_w, height=bar_h, left=bx,
                    color="white", alpha=0.15, zorder=4)

    ax.set_xlim(-0.05, 1.05)
    ax.set_ylim(-0.05, 1.05)
    ax.set_title(title, fontsize=16, fontweight="bold", color="white", pad=15)
    ax.axis("off")

    # Legend
    legend_elements = [
        mpatches.Patch(color=RESOURCE_COLORS[r], label=r.capitalize())
        for r in ["water", "food", "energy", "land"]
    ]
    ax.legend(handles=legend_elements, loc="lower right", fontsize=9,
              facecolor="#16213e", edgecolor="white", labelcolor="white")
    plt.tight_layout()
    return fig


# ════════════════════════════════════════════════════════════════
# 2. RESOURCE TIME SERIES
# ════════════════════════════════════════════════════════════════

def plot_resource_timeseries(world, figsize=(16, 12)):
    """4-panel plot showing each resource across all regions over time."""
    cycles = range(1, len(world.resource_history) + 1)
    fig, axes = plt.subplots(2, 2, figsize=figsize)
    fig.patch.set_facecolor("#f8f9fa")

    for ax, res in zip(axes.flat, ["water", "food", "energy", "land"]):
        for name in world.get_region_names():
            values = [h[name][res] for h in world.resource_history]
            ax.plot(cycles, values, label=name, color=REGION_COLORS[name],
                    linewidth=1.5, alpha=0.85)
        ax.set_title(f"{res.upper()} Levels", fontsize=13, fontweight="bold")
        ax.set_xlabel("Cycle")
        ax.set_ylabel("Units")
        ax.legend(fontsize=7, ncol=2, loc="upper right")
        ax.grid(True, alpha=0.3)
        ax.set_facecolor("#ffffff")

    fig.suptitle("Resource Evolution Over Time", fontsize=16,
                 fontweight="bold", y=1.01)
    plt.tight_layout()
    return fig


# ════════════════════════════════════════════════════════════════
# 3. POPULATION DYNAMICS
# ════════════════════════════════════════════════════════════════

def plot_population(world, figsize=(14, 6)):
    """Population curves for all regions."""
    cycles = range(1, len(world.population_history) + 1)
    fig, ax = plt.subplots(figsize=figsize)
    fig.patch.set_facecolor("#f8f9fa")

    for name in world.get_region_names():
        pops = [h[name] for h in world.population_history]
        ax.plot(cycles, pops, label=name, color=REGION_COLORS[name],
                linewidth=2, alpha=0.85)

        # Mark collapse
        region = world.regions[name]
        if not region.is_alive:
            ax.axvline(x=region.collapse_cycle, color=REGION_COLORS[name],
                       linestyle="--", alpha=0.4)
            ax.annotate(f"☠ {name}", (region.collapse_cycle, 0),
                        fontsize=8, color=REGION_COLORS[name], rotation=90,
                        va="bottom", ha="right")

    ax.set_title("Population Dynamics", fontsize=14, fontweight="bold")
    ax.set_xlabel("Cycle")
    ax.set_ylabel("Population")
    ax.legend(fontsize=9, ncol=2)
    ax.grid(True, alpha=0.3)
    ax.set_facecolor("#ffffff")
    plt.tight_layout()
    return fig


# ════════════════════════════════════════════════════════════════
# 4. TRADE NETWORK GRAPH
# ════════════════════════════════════════════════════════════════

def plot_trade_network(world, figsize=(12, 10)):
    """NetworkX graph showing trade volumes between regions."""
    if not HAS_NETWORKX:
        print("⚠ networkx not installed — skipping trade network plot")
        return None

    G = nx.Graph()
    for name in world.get_region_names():
        G.add_node(name)

    # Aggregate trade volumes
    trade_volumes = {}
    for trade in world.trade_system.trade_history:
        key = tuple(sorted([trade["buyer"], trade["seller"]]))
        trade_volumes[key] = trade_volumes.get(key, 0) + trade["amount"]

    for (r1, r2), vol in trade_volumes.items():
        if vol > 0:
            G.add_edge(r1, r2, weight=vol)

    fig, ax = plt.subplots(figsize=figsize)
    fig.patch.set_facecolor("#1a1a2e")
    ax.set_facecolor("#1a1a2e")

    pos = {name: region.position for name, region in world.regions.items()}

    # Draw edges
    edges = G.edges(data=True)
    if edges:
        weights = [d.get("weight", 1) for _, _, d in edges]
        max_w = max(weights) if weights else 1
        for (u, v, d) in edges:
            w = d.get("weight", 1)
            rel = world.trade_system.get_rel(u, v)
            ax.plot(
                [pos[u][0], pos[v][0]], [pos[u][1], pos[v][1]],
                color="#e74c3c", alpha=min(1, w / max_w * 0.8 + 0.1),
                linewidth=max(1, w / max_w * 6),
                zorder=1,
            )
            # Volume label
            mx = (pos[u][0] + pos[v][0]) / 2
            my = (pos[u][1] + pos[v][1]) / 2
            ax.annotate(
                f"{w:.0f}", (mx, my), fontsize=7, color="#ecf0f1",
                ha="center", va="center",
                bbox=dict(boxstyle="round,pad=0.15", fc="#2c3e50", alpha=0.7),
                zorder=8,
            )

    # Draw nodes
    for name in world.get_region_names():
        x, y = pos[name]
        region = world.regions[name]
        size = 400 + region.population * 2
        alpha = 1.0 if region.is_alive else 0.3
        color = REGION_COLORS.get(name, "#ffffff")
        ax.scatter(x, y, s=size, c=color, alpha=alpha,
                   edgecolors="white", linewidths=2, zorder=5)
        ax.annotate(name, (x, y + 0.04), ha="center", fontsize=10,
                    fontweight="bold", color="white",
                    path_effects=[pe.withStroke(linewidth=2, foreground="black")],
                    zorder=10)

    ax.set_title("Trade Network (edge width ∝ volume)",
                 fontsize=14, fontweight="bold", color="white")
    ax.set_xlim(-0.05, 1.05)
    ax.set_ylim(-0.05, 1.05)
    ax.axis("off")
    plt.tight_layout()
    return fig


# ════════════════════════════════════════════════════════════════
# 5. AGENT STRATEGY EVOLUTION
# ════════════════════════════════════════════════════════════════

def plot_strategy_evolution(agent_manager, world, figsize=(16, 10)):
    """Stacked area chart showing how each agent's strategy mix evolves."""
    from worldsim_agents import ACTIONS

    n_regions = len(world.get_region_names())
    cols = 2
    rows = (n_regions + 1) // 2
    fig, axes = plt.subplots(rows, cols, figsize=figsize)
    fig.patch.set_facecolor("#f8f9fa")
    axes = axes.flat

    window = 20  # rolling window for smoothing

    for idx, name in enumerate(world.get_region_names()):
        ax = axes[idx]
        agent = agent_manager.agents[name]
        history = agent.action_history

        if len(history) < window:
            ax.set_title(f"{name} — insufficient data", fontsize=10)
            continue

        # Compute rolling strategy distribution
        cycles = range(window, len(history) + 1)
        distributions = {a: [] for a in ACTIONS}
        for i in range(window, len(history) + 1):
            chunk = history[i - window:i]
            counts = {a: 0 for a in range(len(ACTIONS))}
            for a in chunk:
                counts[a] += 1
            for j, a in enumerate(ACTIONS):
                distributions[a].append(counts[j] / window)

        # Stacked area
        y_stack = np.array([distributions[a] for a in ACTIONS])
        ax.stackplot(
            list(cycles), *y_stack,
            labels=ACTIONS,
            colors=[ACTION_COLORS[a] for a in ACTIONS],
            alpha=0.85,
        )
        ax.set_title(f"{name}", fontsize=11, fontweight="bold",
                     color=REGION_COLORS.get(name, "black"))
        ax.set_xlim(window, len(history))
        ax.set_ylim(0, 1)
        ax.set_xlabel("Cycle", fontsize=8)
        ax.set_ylabel("Strategy Mix", fontsize=8)
        ax.grid(True, alpha=0.2)

    # Hide unused axes
    for idx in range(n_regions, len(axes)):
        axes[idx].set_visible(False)

    # Shared legend
    handles = [mpatches.Patch(color=ACTION_COLORS[a], label=a.replace("_", " ").title())
               for a in ACTIONS]
    fig.legend(handles=handles, loc="lower center", ncol=5, fontsize=8,
               bbox_to_anchor=(0.5, -0.02))
    fig.suptitle("Agent Strategy Evolution (Rolling Window)",
                 fontsize=15, fontweight="bold")
    plt.tight_layout(rect=[0, 0.03, 1, 0.97])
    return fig


# ════════════════════════════════════════════════════════════════
# 6. HAPPINESS & TECHNOLOGY
# ════════════════════════════════════════════════════════════════

def plot_happiness_tech(world, figsize=(15, 5)):
    """Dual panel: happiness and technology progression."""
    cycles = range(1, len(world.happiness_history) + 1)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=figsize)
    fig.patch.set_facecolor("#f8f9fa")

    for name in world.get_region_names():
        color = REGION_COLORS[name]
        haps = [h[name] for h in world.happiness_history]
        ax1.plot(cycles, haps, label=name, color=color, linewidth=1.5, alpha=0.85)

        techs = [h[name] for h in world.tech_history]
        ax2.plot(cycles, techs, label=name, color=color, linewidth=1.5, alpha=0.85)

    ax1.set_title("Region Happiness", fontsize=13, fontweight="bold")
    ax1.set_xlabel("Cycle")
    ax1.set_ylabel("Happiness (0–1)")
    ax1.legend(fontsize=7, ncol=2)
    ax1.grid(True, alpha=0.3)

    ax2.set_title("Technology Level", fontsize=13, fontweight="bold")
    ax2.set_xlabel("Cycle")
    ax2.set_ylabel("Tech Level")
    ax2.legend(fontsize=7, ncol=2)
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    return fig


# ════════════════════════════════════════════════════════════════
# 7. EVENT TIMELINE
# ════════════════════════════════════════════════════════════════

def plot_event_timeline(world, figsize=(16, 6)):
    """Scatter-style timeline of climate events with severity."""
    if not world.event_history:
        print("No events to plot.")
        return None

    fig, ax = plt.subplots(figsize=figsize)
    fig.patch.set_facecolor("#f8f9fa")

    event_types = list(set(e["type"].value if hasattr(e["type"], 'value') else str(e["type"])
                          for e in world.event_history))
    etype_to_y = {t: i for i, t in enumerate(event_types)}

    positive_events = {"bumper_harvest", "energy_boom", "water_discovery", "technological_leap"}

    for evt in world.event_history:
        etype = evt["type"].value if hasattr(evt["type"], "value") else str(evt["type"])
        cycle = evt["cycle"]
        severity = evt["severity"]
        is_global = evt.get("is_global", False)

        color = "#27ae60" if etype in positive_events else "#e74c3c"
        marker = "D" if is_global else "o"
        size = 30 + severity * 120

        ax.scatter(cycle, etype_to_y[etype], s=size, c=color, marker=marker,
                   alpha=0.6, edgecolors="black", linewidths=0.5, zorder=3)

    ax.set_yticks(range(len(event_types)))
    ax.set_yticklabels([t.replace("_", " ").title() for t in event_types], fontsize=9)
    ax.set_xlabel("Cycle", fontsize=11)
    ax.set_title("Climate & World Events Timeline (size ∝ severity)",
                 fontsize=14, fontweight="bold")
    ax.grid(True, alpha=0.2, axis="x")

    # Legend
    leg = [
        plt.scatter([], [], c="#e74c3c", s=60, label="Negative Event"),
        plt.scatter([], [], c="#27ae60", s=60, label="Positive Event"),
        plt.scatter([], [], c="gray", s=60, marker="D", label="Global Event"),
    ]
    ax.legend(fontsize=9)
    plt.tight_layout()
    return fig


# ════════════════════════════════════════════════════════════════
# 8. TRADE VOLUME OVER TIME
# ════════════════════════════════════════════════════════════════

def plot_trade_volume(world, figsize=(14, 5)):
    """Bar chart of trade counts per cycle."""
    cycles = range(1, len(world.trade_count_history) + 1)
    fig, ax = plt.subplots(figsize=figsize)
    fig.patch.set_facecolor("#f8f9fa")

    ax.bar(cycles, world.trade_count_history, color="#e74c3c", alpha=0.7, width=1.0)
    # Rolling average
    window = 20
    if len(world.trade_count_history) > window:
        rolling = pd.Series(world.trade_count_history).rolling(window).mean()
        ax.plot(cycles, rolling, color="#2c3e50", linewidth=2, label=f"{window}-cycle avg")
        ax.legend()

    ax.set_title("Trade Activity Over Time", fontsize=14, fontweight="bold")
    ax.set_xlabel("Cycle")
    ax.set_ylabel("Trades per Cycle")
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    return fig


# ════════════════════════════════════════════════════════════════
# 9. REWARD CONVERGENCE
# ════════════════════════════════════════════════════════════════

def plot_reward_curves(agent_manager, figsize=(14, 6)):
    """Rolling average reward per agent over training."""
    fig, ax = plt.subplots(figsize=figsize)
    fig.patch.set_facecolor("#f8f9fa")
    window = 30

    for name, agent in agent_manager.agents.items():
        if len(agent.reward_history) < window:
            continue
        rolling = pd.Series(agent.reward_history).rolling(window).mean()
        ax.plot(rolling, label=name, color=REGION_COLORS[name],
                linewidth=1.5, alpha=0.85)

    ax.set_title("Agent Reward Convergence (Rolling Average)",
                 fontsize=14, fontweight="bold")
    ax.set_xlabel("Cycle")
    ax.set_ylabel("Reward")
    ax.legend(fontsize=9, ncol=2)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    return fig


# ════════════════════════════════════════════════════════════════
# 10. FINAL STRATEGY SUMMARY (HEATMAP)
# ════════════════════════════════════════════════════════════════

def plot_strategy_heatmap(agent_manager, figsize=(12, 6)):
    """Heatmap of final learned strategy distributions across agents."""
    from worldsim_agents import ACTIONS

    names = list(agent_manager.agents.keys())
    matrix = []
    for name in names:
        dist = agent_manager.agents[name].strategy_distribution(last_n=80)
        matrix.append([dist[a] for a in ACTIONS])

    matrix = np.array(matrix)
    fig, ax = plt.subplots(figsize=figsize)
    fig.patch.set_facecolor("#f8f9fa")

    im = ax.imshow(matrix, cmap="YlOrRd", aspect="auto", vmin=0, vmax=1)

    ax.set_xticks(range(len(ACTIONS)))
    ax.set_xticklabels([a.replace("_", " ").title() for a in ACTIONS],
                       rotation=45, ha="right", fontsize=9)
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names, fontsize=10)

    # Annotate cells
    for i in range(len(names)):
        for j in range(len(ACTIONS)):
            val = matrix[i, j]
            color = "white" if val > 0.5 else "black"
            ax.text(j, i, f"{val:.0%}", ha="center", va="center",
                    fontsize=8, color=color, fontweight="bold")

    plt.colorbar(im, ax=ax, label="Action Frequency", shrink=0.8)
    ax.set_title("Learned Strategy Distribution (Final 80 Cycles)",
                 fontsize=14, fontweight="bold")
    plt.tight_layout()
    return fig


# ════════════════════════════════════════════════════════════════
# 11. RELATIONSHIP HEATMAP
# ════════════════════════════════════════════════════════════════

def plot_relationship_matrix(world, figsize=(10, 8)):
    """Heatmap of inter-region relationships."""
    names = world.get_region_names()
    n = len(names)
    matrix = np.zeros((n, n))

    for i, r1 in enumerate(names):
        for j, r2 in enumerate(names):
            if i == j:
                matrix[i, j] = 1.0
            else:
                matrix[i, j] = world.trade_system.get_rel(r1, r2)

    fig, ax = plt.subplots(figsize=figsize)
    fig.patch.set_facecolor("#f8f9fa")

    cmap = LinearSegmentedColormap.from_list("rg", ["#e74c3c", "#f39c12", "#27ae60"])
    im = ax.imshow(matrix, cmap=cmap, vmin=0, vmax=1)

    ax.set_xticks(range(n))
    ax.set_xticklabels(names, rotation=45, ha="right", fontsize=9)
    ax.set_yticks(range(n))
    ax.set_yticklabels(names, fontsize=9)

    for i in range(n):
        for j in range(n):
            color = "white" if matrix[i, j] > 0.6 else "black"
            ax.text(j, i, f"{matrix[i,j]:.2f}", ha="center", va="center",
                    fontsize=8, color=color)

    plt.colorbar(im, ax=ax, label="Relationship Score", shrink=0.8)
    ax.set_title("Inter-Region Relationship Matrix",
                 fontsize=14, fontweight="bold")
    plt.tight_layout()
    return fig


# ════════════════════════════════════════════════════════════════
# 12. INTERACTIVE PLOTLY DASHBOARD (optional)
# ════════════════════════════════════════════════════════════════

def plotly_resource_dashboard(world):
    """Interactive Plotly dashboard with resource timeseries + population."""
    if not HAS_PLOTLY:
        print("⚠ Plotly not installed — skipping interactive dashboard")
        return None

    fig = make_subplots(
        rows=3, cols=2,
        subplot_titles=("Water", "Food", "Energy", "Land",
                        "Population", "Trade Volume"),
        vertical_spacing=0.08,
    )

    cycles = list(range(1, len(world.resource_history) + 1))

    for name in world.get_region_names():
        color = REGION_COLORS[name]
        for i, res in enumerate(["water", "food", "energy", "land"]):
            row, col = divmod(i, 2)
            values = [h[name][res] for h in world.resource_history]
            fig.add_trace(
                go.Scatter(x=cycles, y=values, name=name, mode="lines",
                           line=dict(color=color, width=1.5),
                           legendgroup=name, showlegend=(i == 0)),
                row=row + 1, col=col + 1,
            )

        pops = [h[name] for h in world.population_history]
        fig.add_trace(
            go.Scatter(x=cycles, y=pops, name=name, mode="lines",
                       line=dict(color=color, width=2),
                       legendgroup=name, showlegend=False),
            row=3, col=1,
        )

    fig.add_trace(
        go.Bar(x=cycles, y=world.trade_count_history,
               marker_color="#e74c3c", opacity=0.6, name="Trades"),
        row=3, col=2,
    )

    fig.update_layout(
        height=900, width=1100,
        title_text="WorldSim — Interactive Resource Dashboard",
        template="plotly_dark",
        showlegend=True,
        legend=dict(font=dict(size=9)),
    )
    return fig


# ════════════════════════════════════════════════════════════════
# 13. SUSTAINABILITY ANALYSIS CHART
# ════════════════════════════════════════════════════════════════

def plot_sustainability_analysis(world, agent_manager, figsize=(16, 8)):
    """Multi-metric radar-style analysis of each region's sustainability."""
    from worldsim_agents import ACTIONS

    names = world.get_region_names()
    metrics = ["Survival", "Pop Growth", "Resource Balance", "Trade Activity",
               "Happiness", "Technology", "Adaptability"]

    n_cycles = len(world.population_history)
    data = {}

    for name in names:
        region = world.regions[name]
        agent = agent_manager.agents[name]

        # Survival score (0 or 1)
        survival = 1.0 if region.is_alive else region.collapse_cycle / n_cycles

        # Population growth (final / initial, normalised)
        pop_init = world.population_history[0][name]
        pop_final = world.population_history[-1][name]
        pop_growth = min(2.0, pop_final / max(pop_init, 1)) / 2.0

        # Resource balance (min resource ratio at end)
        res_balance = min(region.resource_ratio(r) for r in ["water", "food", "energy", "land"]) if region.is_alive else 0

        # Trade activity
        trades_participated = sum(
            1 for t in world.trade_system.trade_history
            if t["buyer"] == name or t["seller"] == name
        )
        max_possible = n_cycles * 2
        trade_score = min(1.0, trades_participated / max(max_possible * 0.3, 1))

        # Happiness
        happiness = world.happiness_history[-1][name] if world.happiness_history else 0.5

        # Technology
        tech = region.tech_level / 3.0

        # Adaptability (unique strategies used in last 100 cycles)
        recent_actions = agent.action_history[-100:]
        unique_actions = len(set(recent_actions))
        adaptability = min(1.0, unique_actions / 6)

        data[name] = [survival, pop_growth, res_balance, trade_score,
                      happiness, tech, adaptability]

    # Plot as grouped bar chart
    fig, ax = plt.subplots(figsize=figsize)
    fig.patch.set_facecolor("#f8f9fa")

    x = np.arange(len(metrics))
    width = 0.09
    n_regions = len(names)

    for i, name in enumerate(names):
        offset = (i - n_regions / 2) * width + width / 2
        bars = ax.bar(x + offset, data[name], width, label=name,
                      color=REGION_COLORS[name], alpha=0.85, edgecolor="white",
                      linewidth=0.5)

    ax.set_xticks(x)
    ax.set_xticklabels(metrics, fontsize=10, fontweight="bold")
    ax.set_ylabel("Score (0–1)", fontsize=11)
    ax.set_title("Sustainability Analysis — Multi-Metric Comparison",
                 fontsize=15, fontweight="bold")
    ax.legend(fontsize=9, ncol=4, loc="upper right")
    ax.set_ylim(0, 1.15)
    ax.grid(True, alpha=0.2, axis="y")
    plt.tight_layout()
    return fig


# ════════════════════════════════════════════════════════════════
# 14. CLIMATE STRESS PROGRESSION
# ════════════════════════════════════════════════════════════════

def plot_climate_stress(world, figsize=(14, 4)):
    """Show increasing climate stress and seasonal event frequency."""
    cycles = range(1, len(world.resource_history) + 1)
    stress = [0.0008 * c for c in cycles]  # approximate accumulation
    stress = [min(0.45, s) for s in stress]

    fig, ax = plt.subplots(figsize=figsize)
    fig.patch.set_facecolor("#f8f9fa")

    ax.fill_between(cycles, stress, alpha=0.3, color="#e74c3c")
    ax.plot(cycles, stress, color="#e74c3c", linewidth=2, label="Climate Stress")

    # Season bands
    colors_season = ["#27ae60", "#f39c12", "#e67e22", "#3498db"]
    for i, c in enumerate(cycles):
        season = c % 4
        ax.axvspan(c - 0.5, c + 0.5, alpha=0.05, color=colors_season[season])

    ax.set_title("Climate Stress & Seasonal Cycles", fontsize=14, fontweight="bold")
    ax.set_xlabel("Cycle")
    ax.set_ylabel("Stress Level")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    return fig


# ════════════════════════════════════════════════════════════════
# UTILITY — Summary Table
# ════════════════════════════════════════════════════════════════

def print_summary_table(world, agent_manager):
    """Print a formatted summary table of the final world state."""
    print("\n" + "=" * 90)
    print(f"{'WORLDSIM FINAL STATE':^90}")
    print(f"{'Cycle ' + str(world.cycle):^90}")
    print("=" * 90)

    header = f"{'Region':<14} {'Status':<8} {'Pop':>6} {'Water':>7} {'Food':>7} " \
             f"{'Energy':>7} {'Land':>7} {'Happy':>6} {'Tech':>5} {'Strategy':<15}"
    print(header)
    print("-" * 90)

    for name in world.get_region_names():
        region = world.regions[name]
        agent = agent_manager.agents[name]
        status = "✓ Alive" if region.is_alive else "☠ Dead"
        strat = agent.dominant_strategy()

        print(
            f"{name:<14} {status:<8} {region.population:>6.0f} "
            f"{region.resources['water']:>7.0f} {region.resources['food']:>7.0f} "
            f"{region.resources['energy']:>7.0f} {region.resources['land']:>7.0f} "
            f"{region.happiness:>6.2f} {region.tech_level:>5.2f} {strat:<15}"
        )

    print("=" * 90)
    summary = world.get_summary()
    print(f"Total Population: {summary['total_population']:.0f} | "
          f"Trades: {summary['total_trades']} | "
          f"Events: {summary['total_events']} | "
          f"Climate Stress: {summary['climate_stress']:.3f}")
    print(f"Alive: {', '.join(summary['alive_regions'])}")
    if summary['collapsed_regions']:
        print(f"Collapsed: {', '.join(summary['collapsed_regions'])}")
    print("=" * 90)

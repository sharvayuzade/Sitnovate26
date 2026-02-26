"""
WorldSim Dashboard (Gradio)
---------------------------
Professional UI for running the WorldSim simulation and visualizing outcomes.
Includes optional Ollama-powered analysis if `ollama` is installed and running.

Run:
    python worldsim_dashboard.py
"""

from __future__ import annotations

import traceback
from typing import Dict, Any, Optional

import pandas as pd
import gradio as gr

from worldsim_engine import World
from worldsim_agents import AgentManager
from worldsim_viz import (
    plot_world_map,
    plot_population,
    plot_resource_timeseries,
    plot_trade_volume,
    plot_trade_network,
    plot_strategy_heatmap,
)

try:
    import ollama
    HAS_OLLAMA = True
except Exception:
    HAS_OLLAMA = False


APP_CSS = """
:root {
    --bg-0: #030712;
    --bg-1: #0b1220;
    --bg-2: #111827;
    --card: rgba(15, 23, 42, 0.62);
    --card-border: rgba(148, 163, 184, 0.22);
    --txt: #e2e8f0;
    --muted: #94a3b8;
    --accent: #38bdf8;
    --accent-2: #22d3ee;
}

.gradio-container {
    background:
        radial-gradient(1000px 500px at -5% -10%, rgba(14, 165, 233, 0.18), transparent 60%),
        radial-gradient(1000px 500px at 105% 110%, rgba(34, 211, 238, 0.14), transparent 60%),
        linear-gradient(135deg, var(--bg-0), var(--bg-1) 40%, var(--bg-2));
    color: var(--txt);
}

.gr-block, .gr-panel, .gr-box, .gr-accordion, .gr-dataframe, .gr-tabitem {
    background: var(--card) !important;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--card-border) !important;
    border-radius: 16px !important;
}

.gr-button-primary {
    background: linear-gradient(135deg, #0ea5e9, #06b6d4) !important;
    border: none !important;
    box-shadow: 0 6px 22px rgba(6, 182, 212, 0.35);
}

.gr-button-primary:hover {
    filter: brightness(1.08);
}

#intro-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: grid;
    place-items: center;
    background:
        radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.14), transparent 45%),
        radial-gradient(circle at 18% 22%, rgba(14, 116, 144, 0.2), transparent 35%),
        radial-gradient(circle at 80% 76%, rgba(34, 211, 238, 0.18), transparent 35%),
        #020617;
    overflow: hidden;
}

#intro-overlay.hide {
    opacity: 0;
    visibility: hidden;
    transition: opacity 900ms ease, visibility 900ms ease;
}

#intro-stars {
    position: absolute;
    inset: 0;
    background-image:
        radial-gradient(2px 2px at 20% 30%, rgba(255, 255, 255, 0.6), transparent 50%),
        radial-gradient(2px 2px at 70% 40%, rgba(255, 255, 255, 0.5), transparent 50%),
        radial-gradient(1px 1px at 38% 76%, rgba(255, 255, 255, 0.6), transparent 50%),
        radial-gradient(1px 1px at 82% 64%, rgba(255, 255, 255, 0.65), transparent 50%),
        radial-gradient(1px 1px at 58% 22%, rgba(255, 255, 255, 0.6), transparent 50%);
    animation: drift 35s linear infinite;
    opacity: 0.95;
}

.intro-wrap {
    position: relative;
    text-align: center;
    color: #e2e8f0;
    animation: intro-fade 900ms ease;
}

.earth {
    width: 290px;
    height: 290px;
    margin: 0 auto 28px;
    border-radius: 999px;
    position: relative;
    background:
        radial-gradient(circle at 30% 25%, rgba(191, 241, 255, 0.95) 0 12%, rgba(96, 165, 250, 0.95) 18%, rgba(30, 64, 175, 0.96) 60%, rgba(2, 6, 23, 1) 100%);
    box-shadow:
        inset -38px -24px 70px rgba(0, 0, 0, 0.45),
        0 0 80px rgba(56, 189, 248, 0.45),
        0 0 140px rgba(14, 165, 233, 0.22);
    overflow: hidden;
    animation: earth-zoom 6.1s cubic-bezier(.19,.88,.2,1) forwards;
}

.earth::before {
    content: "";
    position: absolute;
    inset: -6%;
    border-radius: 999px;
    background:
        radial-gradient(120px 90px at 25% 35%, rgba(74, 222, 128, 0.70), transparent 60%),
        radial-gradient(140px 90px at 62% 52%, rgba(34, 197, 94, 0.55), transparent 62%),
        radial-gradient(95px 70px at 78% 28%, rgba(101, 163, 13, 0.62), transparent 64%);
    filter: saturate(1.15);
    animation: earth-rotate 14s linear infinite;
}

.earth::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: linear-gradient(120deg, transparent 20%, rgba(255, 255, 255, 0.18) 35%, transparent 55%);
}

.intro-title {
    font-size: clamp(30px, 3.8vw, 54px);
    letter-spacing: 0.08em;
    font-weight: 700;
}

.intro-sub {
    margin-top: 8px;
    color: var(--muted);
    font-size: 15px;
}

.enter-btn {
    margin-top: 16px;
    border: 1px solid rgba(125, 211, 252, 0.48);
    background: rgba(2, 132, 199, 0.18);
    color: #dbeafe;
    padding: 10px 18px;
    border-radius: 999px;
    font-size: 13px;
    cursor: pointer;
}

@keyframes earth-rotate {
    from { transform: rotate(0deg) scale(1.02); }
    to { transform: rotate(360deg) scale(1.02); }
}

@keyframes earth-zoom {
    0% { transform: translateZ(0) scale(0.75) rotate(-6deg); }
    55% { transform: scale(1.02) rotate(3deg); }
    100% { transform: scale(1.45) rotate(0deg); }
}

@keyframes drift {
    from { transform: translateY(0px) translateX(0px); }
    to { transform: translateY(-24px) translateX(-12px); }
}

@keyframes intro-fade {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
}
"""


INTRO_HTML = """
<div id="intro-overlay">
    <div id="intro-stars"></div>
    <div class="intro-wrap">
        <div class="earth"></div>
        <div class="intro-title">WORLDSIM</div>
        <div class="intro-sub">Adaptive Resource Scarcity &amp; Strategy Intelligence</div>
        <button class="enter-btn" onclick="window.worldsimEnter && window.worldsimEnter()">Skip Intro</button>
    </div>
</div>

<script>
(() => {
    if (window.__worldsimIntroBound) return;
    window.__worldsimIntroBound = true;

    const enter = () => {
        const overlay = document.getElementById('intro-overlay');
        if (!overlay) return;
        overlay.classList.add('hide');
        setTimeout(() => overlay.remove(), 1000);
    };

    window.worldsimEnter = enter;
    setTimeout(enter, 6200);
})();
</script>
"""


def run_simulation(seed: int, cycles: int) -> Dict[str, Any]:
    world = World(seed=seed, num_cycles=cycles)
    agent_manager = AgentManager(world.get_region_names(), seed=seed)

    for _ in range(cycles):
        prev_snapshot = agent_manager.snapshot_states(world)
        decisions = agent_manager.get_decisions(world)
        world.step(decisions)
        agent_manager.update_all(world, prev_snapshot)

    summary = world.get_summary()
    agent_stats = agent_manager.summary()

    rows = []
    for name in world.get_region_names():
        region = world.regions[name]
        rows.append(
            {
                "Region": name,
                "Alive": "Yes" if region.is_alive else "No",
                "Population": round(region.population, 1),
                "Water": round(region.resources["water"], 1),
                "Food": round(region.resources["food"], 1),
                "Energy": round(region.resources["energy"], 1),
                "Land": round(region.resources["land"], 1),
                "Happiness": round(region.happiness, 3),
                "Tech": round(region.tech_level, 3),
                "Dominant Strategy": agent_stats[name]["dominant_strategy"],
                "Avg Reward(50)": agent_stats[name]["avg_reward_50"],
            }
        )

    region_table = pd.DataFrame(rows).sort_values(by=["Alive", "Population"], ascending=[False, False])

    report_text = (
        f"Cycle: {summary['cycle']}\n"
        f"Alive Regions: {len(summary['alive_regions'])}/8\n"
        f"Collapsed Regions: {', '.join(summary['collapsed_regions']) if summary['collapsed_regions'] else 'None'}\n"
        f"Total Population: {summary['total_population']:.1f}\n"
        f"Total Trades: {summary['total_trades']}\n"
        f"Total Events: {summary['total_events']}\n"
        f"Climate Stress: {summary['climate_stress']}\n"
    )

    kpis_html = f"""
    <div style='display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:12px;'>
      <div style='padding:12px;border-radius:12px;background:#111827;color:#f9fafb;'>
        <div style='font-size:12px;opacity:.8'>Alive Regions</div>
        <div style='font-size:24px;font-weight:700'>{len(summary['alive_regions'])}/8</div>
      </div>
      <div style='padding:12px;border-radius:12px;background:#111827;color:#f9fafb;'>
        <div style='font-size:12px;opacity:.8'>Population</div>
        <div style='font-size:24px;font-weight:700'>{summary['total_population']:.0f}</div>
      </div>
      <div style='padding:12px;border-radius:12px;background:#111827;color:#f9fafb;'>
        <div style='font-size:12px;opacity:.8'>Trades</div>
        <div style='font-size:24px;font-weight:700'>{summary['total_trades']}</div>
      </div>
      <div style='padding:12px;border-radius:12px;background:#111827;color:#f9fafb;'>
        <div style='font-size:12px;opacity:.8'>Events</div>
        <div style='font-size:24px;font-weight:700'>{summary['total_events']}</div>
      </div>
    </div>
    """

    # Plots
    fig_world = plot_world_map(world, title=f"WorldSim Final State (Cycle {cycles})", figsize=(8, 6))
    fig_pop = plot_population(world, figsize=(10, 4))
    fig_resource = plot_resource_timeseries(world, figsize=(10, 8))
    fig_trade_volume = plot_trade_volume(world, figsize=(10, 4))
    fig_network = plot_trade_network(world, figsize=(8, 6))
    fig_strategy = plot_strategy_heatmap(agent_manager, figsize=(10, 4))

    return {
        "kpis_html": kpis_html,
        "report_text": report_text,
        "region_table": region_table,
        "fig_world": fig_world,
        "fig_pop": fig_pop,
        "fig_resource": fig_resource,
        "fig_trade_volume": fig_trade_volume,
        "fig_network": fig_network,
        "fig_strategy": fig_strategy,
    }


def run_and_render(seed: int, cycles: int):
    try:
        out = run_simulation(seed=seed, cycles=cycles)
        return (
            out["kpis_html"],
            out["report_text"],
            out["region_table"],
            out["fig_world"],
            out["fig_pop"],
            out["fig_resource"],
            out["fig_trade_volume"],
            out["fig_network"],
            out["fig_strategy"],
            out["report_text"],
        )
    except Exception as exc:
        tb = traceback.format_exc()
        err = f"Simulation failed: {exc}\n\n{tb}"
        return (
            "<div style='color:#ef4444;font-weight:600'>Simulation failed.</div>",
            err,
            pd.DataFrame(),
            None,
            None,
            None,
            None,
            None,
            None,
            err,
        )


def ask_ollama(model_name: str, report_text: str, table_df: Optional[pd.DataFrame]):
    if not HAS_OLLAMA:
        return "`ollama` Python package not installed. Run: pip install ollama"

    if not report_text.strip():
        return "Run a simulation first, then generate AI analysis."

    table_preview = ""
    if isinstance(table_df, pd.DataFrame) and not table_df.empty:
        table_preview = table_df.head(8).to_string(index=False)

    prompt = f"""
You are analyzing WorldSim, a multi-agent resource scarcity simulation.

Simulation summary:
{report_text}

Region table preview:
{table_preview}

Task:
1) Give a concise executive summary.
2) Identify likely sustainable strategies and likely fragile ones.
3) Explain 3 real-world parallels in resource geopolitics.
4) Recommend 5 concrete model improvements for a hackathon demo.

Keep it structured and practical.
""".strip()

    try:
        response = ollama.chat(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a strategy analyst for simulation systems."},
                {"role": "user", "content": prompt},
            ],
        )
        return response["message"]["content"]
    except Exception as exc:
        return (
            f"Ollama request failed: {exc}\n"
            f"Check that Ollama is running and model `{model_name}` is pulled."
        )


def build_app():
    with gr.Blocks(theme=gr.themes.Soft(), title="WorldSim Dashboard", css=APP_CSS) as demo:
        gr.HTML(INTRO_HTML)

        gr.Markdown(
            """
            # 🌍 WorldSim Command Center
            High-fidelity simulation interface for adaptive resource scarcity, diplomacy, and emergent agent strategy.
            """
        )

        with gr.Row():
            seed = gr.Slider(1, 9999, value=42, step=1, label="Seed")
            cycles = gr.Slider(50, 1000, value=500, step=10, label="Simulation Cycles")
            run_btn = gr.Button("🚀 Run Simulation", variant="primary")

        kpis = gr.HTML(label="KPIs")
        summary_box = gr.Textbox(label="Run Summary", lines=8)

        with gr.Tab("Regional State"):
            table = gr.Dataframe(label="Final Regional State", interactive=False)

        with gr.Tab("Core Visuals"):
            with gr.Row():
                world_plot = gr.Plot(label="World Map")
                pop_plot = gr.Plot(label="Population")
            with gr.Row():
                trade_plot = gr.Plot(label="Trade Volume")
                strategy_plot = gr.Plot(label="Strategy Heatmap")

        with gr.Tab("Deep Dive"):
            resource_plot = gr.Plot(label="Resource Time Series")
            network_plot = gr.Plot(label="Trade Network")

        with gr.Tab("AI Analyst (Ollama)"):
            gr.Markdown("Use your local Ollama model (e.g., `gemma:4b`) to generate post-run insights.")
            model_name = gr.Textbox(value="gemma:4b", label="Ollama Model")
            ai_btn = gr.Button("🧠 Generate AI Analysis")
            ai_output = gr.Textbox(label="AI Analysis", lines=18)

        hidden_report = gr.Textbox(visible=False)

        run_btn.click(
            fn=run_and_render,
            inputs=[seed, cycles],
            outputs=[
                kpis,
                summary_box,
                table,
                world_plot,
                pop_plot,
                resource_plot,
                trade_plot,
                network_plot,
                strategy_plot,
                hidden_report,
            ],
        )

        ai_btn.click(
            fn=ask_ollama,
            inputs=[model_name, hidden_report, table],
            outputs=[ai_output],
        )

    return demo


if __name__ == "__main__":
    app = build_app()
    app.launch(server_name="127.0.0.1", server_port=7860, inbrowser=True)

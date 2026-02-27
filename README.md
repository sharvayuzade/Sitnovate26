# 🌍 WorldSim — Adaptive Resource Scarcity & Agent Strategy Simulator
<img width="2737" height="1410" alt="image" src="https://github.com/user-attachments/assets/e8308afd-1b1a-4b36-82f9-acb639f9e5ad" />

> **A data-driven simulation of Indian state resource dynamics, inter-state trade, and emergent survival strategies, powered by a 10,000-row synthetic dataset and a FastAPI + React frontend.**

---

## 📌 Overview

WorldSim is a simulation and analytics platform that models **10 Indian states**, each tracked across **120 simulation ticks** in a 10,000-row synthetic dataset. The platform analyses:

- **Resource Dynamics** — per-state supply, generation, and consumption of water, food, and energy
- **Economic Indicators** — state GDP, GDP growth rate, welfare index, and inequality index
- **Trade Activity** — bid/ask order matching, execution rates, and trade volumes by resource type
- **Migration Flows** — inter-state migration in/out, net migration balance
- **Climate Resilience** — impact of heatwaves, droughts, floods, and cyclones on state resources

The **StrategyAnalyzer** classifies each state's dominant behavior pattern (Trade-Heavy, Growth-Focused, Welfare-Priority, etc.) from the dataset, and an optional **Ollama-powered LLM** generates natural-language briefings from the simulation results.

**Simulated states:** Bihar, Gujarat, Karnataka, Madhya Pradesh, Maharashtra, Punjab, Rajasthan, Tamil Nadu, Uttar Pradesh, West Bengal

---

## 🏗️ Architecture

```
Sitnovate26/
├── worldsim_engine.py                       # World data engine: loads CSV, aggregates snapshots & time series
├── worldsim_agents.py                       # StrategyAnalyzer: classifies state strategies from dataset
├── worldsim_api.py                          # FastAPI backend: REST endpoints, MongoDB persistence, Ollama integration
├── worldsim_dashboard.py                    # Gradio dashboard: interactive simulation UI with Ollama AI tab
├── worldsim_viz.py                          # Matplotlib/Plotly visualization: maps, charts, trade networks
├── WorldSim.ipynb                           # Jupyter notebook: exploratory analysis and demos
├── worldsim_synthetic_dataset_10000_rows.csv  # Synthetic dataset: 10 states × 120 ticks × trade orders
└── worldsim-frontend/                       # React + Vite frontend: recharts, react-simple-maps, three.js
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   └── ...
    ├── package.json
    └── vite.config.js
```

---

## 🧠 Ollama Integration (Local LLM)

This project supports local AI briefings through Ollama from the WorldSim API.

### 1) Start Ollama and pull a model (Windows CMD)

```cmd
ollama serve
```

In another CMD window:

```cmd
ollama pull gemma3:4b
ollama run gemma3:4b
```

### 2) Run backend and frontend

Backend:

```cmd
cd Sitnovate26
python -m uvicorn worldsim_api:app --host 127.0.0.1 --port 8000
```

Frontend:

```cmd
cd Sitnovate26/worldsim-frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

### 3) Verify Ollama connectivity

```cmd
curl http://127.0.0.1:8000/api/ollama/status
```

Expected response includes:
- `ok: true`
- `base_url: "http://127.0.0.1:11434"`
- `models: ["gemma3:4b", ...]`

### 4) API endpoints used by the UI

- `GET /api/health` → service health, Ollama reachability, and MongoDB status
- `GET /api/ollama/status` → checks Ollama server and lists pulled models
- `POST /api/simulate` → runs dataset analysis for a tick range; returns state metrics, strategy classifications, time series, bid/ask data, and resource consumption
- `POST /api/ollama/analyze` → generates a strategic AI briefing from simulation data

### 5) Optional: custom Ollama host

Set before starting backend:

```cmd
set OLLAMA_BASE_URL=http://127.0.0.1:11434
```

### 6) Troubleshooting (Quick Fixes)

**A) `uvicorn ... --port 8000` exits immediately / port already in use**

```cmd
powershell -Command "$conn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue; if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }"
python -m uvicorn worldsim_api:app --host 127.0.0.1 --port 8000
```

**B) `npm run dev` exits / port 5173 busy**

```cmd
powershell -Command "$conn = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue; if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }"
cd worldsim-frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

**C) Ollama model not found**

```cmd
ollama pull gemma3:4b
curl http://127.0.0.1:11434/api/tags
```

**D) Ollama analysis timeout on first request**

- First inference can be slower due to model warm-up.
- Keep `ollama serve` running.
- Retry once after model is loaded (`ollama run gemma3:4b`).

**E) Verify end-to-end status quickly**

```cmd
curl http://127.0.0.1:8000/api/health
curl http://127.0.0.1:8000/api/ollama/status
```

---

## 🎯 Key Features

| Feature | Description |
|---|---|
| 🗺️ **10 Indian States** | Bihar, Gujarat, Karnataka, Madhya Pradesh, Maharashtra, Punjab, Rajasthan, Tamil Nadu, Uttar Pradesh, West Bengal |
| 📊 **10,000-Row Synthetic Dataset** | 10 states × 120 ticks × multiple trade orders per tick |
| 📉 **Resource Analytics** | Per-state water, food, and energy supply, generation, and consumption tracked across all ticks |
| 💹 **Trade Order Book** | Bid/ask order matching with execution rates, prices, and volumes broken down by resource type and state |
| 🏛️ **Economic Indicators** | State GDP, GDP growth rate, welfare index, inequality index, and migration flows |
| 🌩️ **Climatic Events** | Heatwave, Drought, Flood, and Cyclone events with per-tick shock intensity scores |
| 🧠 **Strategy Classification** | Data-driven tagging: Trade-Heavy, Resource-Conservative, Growth-Focused, Welfare-Priority, Migration-Attracting, Climate-Resilient |
| 🤖 **AI Briefings** | Optional Ollama LLM integration generates natural-language executive summaries from simulation data |
| 🖥️ **React Frontend** | Interactive dashboard built with React 19, Vite, Recharts, react-simple-maps, and Three.js |
| 📡 **FastAPI Backend** | REST API with optional MongoDB persistence for simulation run history and AI analyses |

---

## ⚙️ Simulation Mechanics

### Dataset Schema

The dataset (`worldsim_synthetic_dataset_10000_rows.csv`) contains the following columns per row:

| Column | Type | Description |
|---|---|---|
| `tick` | int | Simulation time step (1–120) |
| `state` | str | Indian state name |
| `population` | float | State population at this tick |
| `water_supply` / `food_supply` / `energy_supply` | float | Resource stock levels |
| `water_generated` / `food_generated` / `energy_generated` | float | Per-tick resource generation |
| `water_consumed` / `food_consumed` / `energy_consumed` | float | Per-tick resource consumption |
| `state_gdp` | float | State GDP value |
| `gdp_growth_rate` | float | GDP growth rate (%) |
| `welfare_index` | float | Welfare score (0–1) |
| `inequality_index` | float | Inequality score (0–1) |
| `migration_in` / `migration_out` | int | People migrating into/out of the state |
| `order_type` | str | Trade order type: `bid` or `ask` |
| `resource_type` | str | Resource being traded: Water, Food, or Energy |
| `trade_quantity` | float | Quantity in the trade order |
| `trade_price` | float | Price per unit in the trade order |
| `trade_executed` | int | Whether the trade was executed (0 or 1) |
| `climate_event` | str | Climate event at this tick: None, Heatwave, Drought, Flood, Cyclone |
| `shock_intensity` | float | Severity of the climate event (0–1) |

### Resources
Each state tracks three core resources:

| Resource | Depleted By | Generated By |
|---|---|---|
| 💧 Water | Population consumption, agriculture | Rainfall, river systems |
| 🌾 Food | Population consumption | Farming, trade imports |
| ⚡ Energy | Industrial production, heating/cooling | Power generation, trade imports |

### Climatic Events
Events are recorded per tick with a shock intensity score:
- **Heatwave** — spikes energy demand, stresses water supply
- **Drought** — reduces water and food availability
- **Flood** — disrupts food stocks and energy supply
- **Cyclone** — broad resource and infrastructure disruption

### Strategy Classification
The `StrategyAnalyzer` derives dominant strategy tags per state from the dataset:

| Tag | Criterion |
|---|---|
| **Trade-Heavy** | Trade execution rate > 50% |
| **Resource-Conservative** | Total consumption < 85% of total generation |
| **Growth-Focused** | Average GDP growth rate > 3.0% |
| **Welfare-Priority** | Average welfare index > 0.5 |
| **Migration-Attracting** | Positive cumulative net migration |
| **Climate-Resilient** | Welfare > 0.4 despite average shock intensity > 0.4 |

A **resilience score** is computed per state as a weighted composite of welfare (35%), GDP growth (25%), trade execution rate (20%), and equity — defined as `1 - inequality_index` — (20%).

---

## 📊 Visualization (`worldsim_viz.py`)

The visualization module provides rich matplotlib and Plotly charts:

1. **World Map View** — Color-coded regional resource health overview
2. **Resource Time Series** — Per-state historical charts for water, food, and energy
3. **Population & GDP Trends** — State-level population and economic growth over ticks
4. **Trade Network Graph** — Force-directed graph of active trade relationships (NetworkX + Matplotlib)
5. **Trade Volume Chart** — Per-tick bid/ask volumes and price trends
6. **Strategy Heatmap** — State × strategy tag matrix showing classification scores

---

## 🔬 Analysis & Findings

After a simulation run, the API and StrategyAnalyzer provide:

- **Strategy Mix** — Distribution of dominant strategies across all 10 states
- **Resilience Ranking** — States ranked by composite resilience score with strategy tags
- **Trade Analytics** — Execution rates, volumes by resource type and state, bid/ask breakdowns
- **Climate Summary** — Event frequency counts and average shock intensity per event type
- **Global Time Series** — Total population, GDP, welfare, and trade volume aggregated across all states per tick
- **Critical vs Healthy States** — States flagged as critical (welfare < 0.3 or negative GDP growth) at the final tick

---

## 🔄 Software Development Life Cycle (SDLC)

WorldSim follows a structured SDLC to ensure quality, traceability, and iterative improvement throughout the project.

### Phase 1 — 📋 Planning

| Item | Detail |
|---|---|
| **Project Goal** | Build a data-driven simulation to model Indian state resource scarcity and emergent survival strategies |
| **Scope** | Simulation engine, strategy analyzer, trade analytics, visualization dashboard, AI briefings |
| **Timeline** | Sprint-based development aligned with Sitnovate 2026 Hackathon milestones |
| **Team Roles** | Backend Developers, Frontend Developers, Data Engineers, Visualization Developers, QA & Testing |
| **Tools & Stack** | Python 3.10+, FastAPI, React 19, Vite, Recharts, Pandas, NumPy, Matplotlib, Plotly, Gradio, Ollama, MongoDB |
| **Risk Factors** | Dataset quality and coverage, Ollama model availability, MongoDB connectivity, frontend–backend CORS |

---

### Phase 2 — 📝 Requirements Analysis

**Functional Requirements**
- Load and serve a 10,000-row synthetic dataset of 10 Indian states across 120 ticks
- Classify each state's dominant strategy from dataset patterns (trade, growth, welfare, resilience)
- Provide a REST API returning per-state snapshots, time series, trade analytics, and climate summaries
- React frontend displays state metrics, charts, and trade order book data
- Optional Ollama LLM integration generates natural-language briefings from simulation results
- Optional MongoDB persistence stores simulation runs and AI analyses

**Non-Functional Requirements**
- API response for a full simulation must complete within a few seconds on standard hardware
- Dataset loading is deterministic (CSV-backed, not stochastic)
- CORS configured to allow frontend–backend communication on localhost
- Configuration (seed, tick range) is fully parameterized via API request body

---

### Phase 3 — 🏗️ System Design

**High-Level Design**

```
┌──────────────────────────────────────────────────────────┐
│                   FastAPI Backend                        │
│  ┌────────────────┐  ┌──────────────────┐               │
│  │  World Engine  │  │ StrategyAnalyzer │               │
│  │  (CSV loader,  │◄─┤ (classify states,│               │
│  │  aggregation,  │  │  resilience rank)│               │
│  │  time series)  │  └──────────────────┘               │
│  └───────┬────────┘                                      │
│          │  ┌────────────────┐  ┌─────────────────────┐ │
│          └─►│  /api/simulate │  │ /api/ollama/analyze  │ │
│             └───────┬────────┘  └──────────┬──────────┘ │
└─────────────────────┼───────────────────────┼────────────┘
                      │                       │
          ┌───────────┴───────────┐    ┌──────┴──────┐
          ▼                       ▼    ▼             ▼
  ┌──────────────┐        ┌────────────┐   ┌──────────────┐
  │ React/Vite   │        │  MongoDB   │   │ Ollama LLM   │
  │  Frontend    │        │(optional)  │   │ (optional)   │
  └──────────────┘        └────────────┘   └──────────────┘
```

**Component Descriptions**
- `worldsim_engine.py` — `World` class loads CSV, indexes by `(tick, state)`, provides `state_snapshot`, `state_series`, `global_series`, `trade_summary`, and `climate_summary`
- `worldsim_agents.py` — `StrategyAnalyzer` classifies states by tag and computes a composite resilience score
- `worldsim_api.py` — FastAPI app with `/api/health`, `/api/ollama/status`, `/api/simulate`, and `/api/ollama/analyze` endpoints
- `worldsim_dashboard.py` — Gradio-based interactive dashboard with simulation controls and an AI analyst tab
- `worldsim_viz.py` — Matplotlib and Plotly chart functions for all visualizations
- `worldsim-frontend/` — React 19 + Vite SPA consuming the FastAPI backend

---

### Phase 4 — 💻 Implementation

Development is organized into modular sprints:

| Sprint | Focus Area | Key Deliverables |
|---|---|---|
| **Sprint 1** | Dataset & Engine | `worldsim_engine.py` — CSV loader, World class, snapshot and time-series APIs |
| **Sprint 2** | Strategy Analysis | `worldsim_agents.py` — StrategyAnalyzer with tag classification and resilience ranking |
| **Sprint 3** | REST API | `worldsim_api.py` — FastAPI endpoints, bid/ask aggregation, resource consumption, MongoDB persistence |
| **Sprint 4** | Visualization | `worldsim_viz.py` — world map, resource charts, trade network graph, strategy heatmap |
| **Sprint 5** | Gradio Dashboard | `worldsim_dashboard.py` — interactive UI with Ollama AI analyst tab |
| **Sprint 6** | React Frontend | `worldsim-frontend/` — SPA with recharts, react-simple-maps, and three.js globe |
| **Sprint 7** | Ollama Integration | `/api/ollama/analyze` — LLM briefings with state-sanitized output |
| **Sprint 8** | Integration & Polish | End-to-end testing, CORS configuration, documentation |

**Coding Standards**
- PEP 8 style enforced
- Type hints on all public functions
- Docstrings on all modules and classes

---

### Phase 5 — 🧪 Testing

| Test Type | Scope | Tooling |
|---|---|---|
| **Unit Tests** | Engine snapshot aggregation, strategy tag logic, resilience scoring | `pytest` |
| **Integration Tests** | API endpoint responses with sample dataset, MongoDB insert/retrieve | `pytest` |
| **Determinism Tests** | Same seed + tick range produces identical API response | `pytest` |
| **Performance Tests** | Full `/api/simulate` call completes within acceptable time | Manual / CI timer |
| **Frontend Tests** | Dashboard renders without runtime errors on sample API response | Manual smoke test |

---

### Phase 6 — 🚢 Deployment

**Local Deployment**
```bash
git clone https://github.com/sharvayuzade/Sitnovate26.git
cd Sitnovate26
pip install fastapi uvicorn numpy pandas
python -m uvicorn worldsim_api:app --host 127.0.0.1 --port 8000
```

**Frontend Deployment**
```bash
cd worldsim-frontend
npm install
npm run dev
```

**Gradio Dashboard**
```bash
pip install gradio pandas matplotlib plotly networkx
python worldsim_dashboard.py
```

**CI/CD Pipeline (GitHub Actions)**
- On every pull request: run lint check + tests
- Environment: Python 3.10, Node.js 20, Ubuntu latest runner

---

### Phase 7 — 🔧 Maintenance & Iteration

| Activity | Frequency | Owner |
|---|---|---|
| Bug triage and hotfixes | As needed | All team members |
| Dataset refresh and expansion | Per experiment run | Data Engineers |
| New strategy classification tags | Feature sprints | Backend Developers |
| Dashboard UX improvements | Feature sprints | Frontend Developers |
| Dependency upgrades (FastAPI, React, Vite) | Quarterly | Team Lead |
| Post-hackathon community contributions | Open | Community / Contributors |

**Versioning Strategy**: Semantic versioning (`MAJOR.MINOR.PATCH`) tracked via Git tags.  
**Feedback Loop**: Strategy analysis findings feed back into dataset generation parameters and classification thresholds.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- (Optional) [Ollama](https://ollama.com/) for AI briefings
- (Optional) MongoDB for run persistence

### Installation

```bash
git clone https://github.com/sharvayuzade/Sitnovate26.git
cd Sitnovate26
pip install fastapi uvicorn numpy pandas matplotlib plotly networkx
```

> **Note:** The backend requires `worldsim_synthetic_dataset_10000_rows.csv` to be present in the project root directory (included in the repository).

### Running the Backend API

```bash
python -m uvicorn worldsim_api:app --host 127.0.0.1 --port 8000
```

### Running the React Frontend

```bash
cd worldsim-frontend
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173) in your browser.

### Running the Gradio Dashboard

```bash
pip install gradio matplotlib plotly networkx pandas
python worldsim_dashboard.py
```

Open [http://127.0.0.1:7860](http://127.0.0.1:7860) in your browser.

### Running the Jupyter Notebook

```bash
pip install jupyter numpy pandas matplotlib plotly networkx
jupyter notebook WorldSim.ipynb
```

---

## 🛠️ API Reference

### `POST /api/simulate`

**Request body:**
```json
{
  "seed": 42,
  "tick_start": 1,
  "tick_end": 120
}
```

**Response includes:**
- `summary` — final-tick aggregates: total population, GDP, welfare, trade execution rate, climate events
- `states` — per-state snapshot with dominant strategy, strategy tags, and scores
- `strategy_mix` — count of each dominant strategy across all states
- `resilience_ranking` — states ranked by composite resilience score
- `trade` — global trade analytics (execution rate, volume by resource/state)
- `climate` — event frequency counts and average shock intensity
- `series` — global time series (population, GDP, welfare, trade volume per tick)
- `state_series` — per-state time series
- `bid_ask_by_state` — bid and ask order counts per state
- `bid_ask_over_time` — per-tick bid/ask volumes and average prices
- `resource_consumption` — per-state resource consumed vs generated at final tick

---

## 📈 Evaluation Metrics

| Metric | Description |
|---|---|
| **Trade Execution Rate** | Fraction of trade orders successfully executed |
| **Welfare Index** | Average welfare score across all states (0–1) |
| **Inequality Index** | Average inequality score across all states (0–1) |
| **GDP Growth Rate** | Average state GDP growth rate (%) |
| **Net Migration** | Cumulative migration balance per state |
| **Climate Resilience Score** | Composite score: welfare × 0.35 + GDP growth × 0.25 + trade rate × 0.2 + equity × 0.2 |
| **Critical States** | States with welfare < 0.3 or negative GDP growth at the final tick |

---

## 🤝 Team & Contributions

This project is developed for **Sitnovate 2026** Hackathon.

To contribute:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙏 Acknowledgements

- Inspired by research in multi-agent systems, resource economics, and climate adaptation modeling
- Backend powered by [FastAPI](https://fastapi.tiangolo.com/) and [Uvicorn](https://www.uvicorn.org/)
- Frontend built with [React](https://react.dev/), [Vite](https://vitejs.dev/), [Recharts](https://recharts.org/), and [Three.js](https://threejs.org/)
- Visualization powered by [Matplotlib](https://matplotlib.org/) and [Plotly](https://plotly.com/)
- Dashboard UI via [Gradio](https://www.gradio.app/)
- AI briefings via [Ollama](https://ollama.com/)

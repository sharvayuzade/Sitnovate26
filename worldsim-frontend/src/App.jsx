import { useEffect, useMemo, useState } from 'react'
import './App.css'
import GlobeIntro from './components/GlobeIntro'
import FantasyMap from './components/FantasyMap'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

function App() {
  const [introDone, setIntroDone] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const [seed, setSeed] = useState(42)
  const [cycles, setCycles] = useState(500)
  const [loading, setLoading] = useState(false)
  const [simResult, setSimResult] = useState(null)
  const [error, setError] = useState('')
  const [model, setModel] = useState('gemma:4b')
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const slides = useMemo(
    () => [
      {
        title: 'Climate Shock Engine',
        subtitle: 'Dynamic droughts, floods, energy crises, and global disruptions in a living world model.',
      },
      {
        title: 'Autonomous Strategy Learning',
        subtitle: 'Region-level AI agents discover survival, growth, trade, and adaptation policies over cycles.',
      },
      {
        title: 'Conflict, Cooperation & Diplomacy',
        subtitle: 'Emergent resource geopolitics with evolving trust, exchange routes, and collapse thresholds.',
      },
    ],
    [],
  )

  useEffect(() => {
    if (!introDone) return
    const id = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 3600)
    return () => clearInterval(id)
  }, [introDone, slides.length])

  const runSimulation = async () => {
    setLoading(true)
    setError('')
    setAiText('')
    try {
      const response = await fetch(`${API_BASE}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: Number(seed), cycles: Number(cycles) }),
      })
      if (!response.ok) {
        throw new Error(`Simulation failed (${response.status})`)
      }
      const data = await response.json()
      setSimResult(data)
    } catch (err) {
      setError(err.message || 'Failed to run simulation')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    if (!simResult) return
    const blob = new Blob([JSON.stringify(simResult, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `worldsim-report-seed-${seed}-cycles-${cycles}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const generateInsight = async () => {
    if (!simResult) {
      setError('Run a scenario first, then generate AI insight.')
      return
    }

    setAiLoading(true)
    setError('')
    try {
      const summaryText = [
        `Cycle: ${simResult.summary.cycle}`,
        `Alive Regions: ${simResult.summary.alive_regions.length}/8`,
        `Collapsed: ${simResult.summary.collapsed_regions.join(', ') || 'None'}`,
        `Population: ${simResult.summary.total_population}`,
        `Trades: ${simResult.summary.total_trades}`,
        `Events: ${simResult.summary.total_events}`,
        `Climate Stress: ${simResult.summary.climate_stress}`,
      ].join('\n')

      const response = await fetch(`${API_BASE}/api/ollama/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          summary: summaryText,
          region_table: simResult.regions,
        }),
      })
      if (!response.ok) {
        throw new Error(`Ollama analysis failed (${response.status})`)
      }
      const data = await response.json()
      setAiText(data.analysis || '')
    } catch (err) {
      setError(err.message || 'Failed to generate insight')
    } finally {
      setAiLoading(false)
    }
  }

  const kpis = simResult?.summary
    ? [
        ['Regions Alive', `${simResult.summary.alive_regions.length} / 8`, simResult.summary.collapsed_regions.length ? `Collapsed: ${simResult.summary.collapsed_regions.join(', ')}` : 'No collapse'],
        ['Active Trades', `${simResult.summary.total_trades}`, 'Total bilateral exchanges'],
        ['Population Index', `${Math.round(simResult.summary.total_population)}`, 'End-state total population'],
        ['Climate Stress', `${simResult.summary.climate_stress}`, 'Accumulated global stress'],
      ]
    : [
        ['Regions Alive', '—', 'Run scenario to compute'],
        ['Active Trades', '—', 'Run scenario to compute'],
        ['Population Index', '—', 'Run scenario to compute'],
        ['Climate Stress', '—', 'Run scenario to compute'],
      ]

  return (
    <div className="app-shell">
      {!introDone && <GlobeIntro onComplete={() => setIntroDone(true)} />}

      <div className={`dashboard ${introDone ? 'dashboard-visible' : ''}`}>
        <header className="topbar glass">
          <div className="brand">
            <span className="brand-dot" />
            <div>
              <h1>WorldSim Nexus</h1>
              <p>Adaptive Resource Scarcity Intelligence Platform</p>
            </div>
          </div>
          <div className="top-actions">
            <button className="btn btn-outline" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Command Center
            </button>
            <button className="btn btn-primary" onClick={runSimulation} disabled={loading}>
              {loading ? 'Running...' : 'Run Scenario'}
            </button>
          </div>
        </header>

        <main className="layout">
          <section className="hero glass">
            <div className="hero-content">
              <p className="eyebrow">Cinematic Command Dashboard</p>
              <h2>{slides[activeSlide].title}</h2>
              <p>{slides[activeSlide].subtitle}</p>
              <div className="slide-dots">
                {slides.map((slide, idx) => (
                  <button
                    key={slide.title}
                    className={`dot ${idx === activeSlide ? 'active' : ''}`}
                    onClick={() => setActiveSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
            <div className="hero-orbit" />
          </section>

          <section className="kpi-grid">
            {kpis.map(([label, value, meta]) => (
              <article className="kpi glass" key={label}>
                <p>{label}</p>
                <h3>{value}</h3>
                <span>{meta}</span>
              </article>
            ))}
          </section>

          <section className="panel-row">
            <article className="panel panel-large glass">
              <div className="panel-head">
                <h4>Simulation Control</h4>
                <span>Scenario presets + real-time execution</span>
              </div>
              <div className="control-grid">
                <label>
                  Seed
                  <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} min={1} />
                </label>
                <label>
                  Cycles
                  <input type="number" value={cycles} onChange={(e) => setCycles(e.target.value)} min={20} max={2000} />
                </label>
                <label>
                  Regions
                  <input type="text" value="8 Biome Regions" readOnly />
                </label>
                <label>
                  Engine
                  <input type="text" value="Multi-Agent Q-Learning" readOnly />
                </label>
              </div>
              <div className="control-actions">
                <button className="btn btn-primary" onClick={runSimulation} disabled={loading}>
                  {loading ? 'Running...' : 'Launch Full Run'}
                </button>
                <button className="btn btn-outline" onClick={exportReport} disabled={!simResult}>
                  Export Report
                </button>
              </div>
              {error && <p className="error-text">{error}</p>}
            </article>

            <article className="panel glass">
              <div className="panel-head">
                <h4>Ollama Analyst</h4>
                <span>Gemma-based strategic briefings</span>
              </div>
              <label className="model-input">
                Model
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} />
              </label>
              <div className="pill">API: {API_BASE}</div>
              <p className="ai-summary">
                {aiText || 'Generate a live strategic briefing from your local Ollama model after running the simulation.'}
              </p>
              <button className="btn btn-primary" onClick={generateInsight} disabled={aiLoading || !simResult}>
                {aiLoading ? 'Generating...' : 'Generate Insight'}
              </button>
            </article>
          </section>

          <section className="panel-row">
            <article className="panel panel-large glass">
              <div className="panel-head">
                <h4>Regional Outcomes</h4>
                <span>Live backend response table</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Region</th>
                      <th>Status</th>
                      <th>Population</th>
                      <th>Strategy</th>
                      <th>Happiness</th>
                      <th>Tech</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(simResult?.regions || []).map((region) => (
                      <tr key={region.region}>
                        <td>{region.region}</td>
                        <td>{region.alive ? 'Alive' : 'Collapsed'}</td>
                        <td>{Math.round(region.population)}</td>
                        <td>{region.dominant_strategy}</td>
                        <td>{region.happiness}</td>
                        <td>{region.tech}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel glass">
              <div className="panel-head">
                <h4>Strategy Mix</h4>
                <span>Dominant actions this run</span>
              </div>
              <ul className="mix-list">
                {(simResult?.strategy_mix || []).map((entry) => (
                  <li key={entry.strategy}>
                    <span>{entry.strategy}</span>
                    <strong>{entry.count}</strong>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="panel-row">
            <article className="panel panel-large glass">
              <div className="panel-head">
                <h4>Fantasy Strategy Map</h4>
                <span>Hover kingdoms to inspect world-state details</span>
              </div>
              <FantasyMap regions={simResult?.regions || []} />
            </article>

            <article className="panel glass">
              <div className="panel-head">
                <h4>Map Legend</h4>
                <span>Realm health by marker color</span>
              </div>
              <ul className="mix-list">
                <li><span>🟢 Stable</span><strong>Happiness ≥ 0.8</strong></li>
                <li><span>🔵 Balanced</span><strong>0.6 – 0.79</strong></li>
                <li><span>🟠 Strained</span><strong>0.4 – 0.59</strong></li>
                <li><span>🔴 Critical</span><strong>&lt; 0.4 or collapsed</strong></li>
              </ul>
            </article>
          </section>

          <section className="footer-note glass">
            <p>
              Connected to Python API. Start backend with: <code>uvicorn worldsim_api:app --reload --port 8000</code>
            </p>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App

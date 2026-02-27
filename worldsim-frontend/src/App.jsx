import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import GlobeIntro from './components/GlobeIntro'
import IndiaStateMap from './components/IndiaStateMap'
import {
  GdpPieChart, GdpLineChart,
  ResourceBarChart, ResourceGenVsConChart,
  BidAskChart, BidAskStateChart,
  WelfareTrendChart, PopulationTrendChart,
  TradeVolumeChart,
} from './components/Charts'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

/* ── Scroll-reveal hook (IntersectionObserver) ── */
function useReveal(threshold = 0.12) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); io.unobserve(el) } },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return ref
}

function RevealSection({ children, className = '', delay = 0, ...props }) {
  const ref = useReveal()
  return (
    <section ref={ref} className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}s` }} {...props}>
      {children}
    </section>
  )
}

function App() {
  const [introDone, setIntroDone] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const [seed, setSeed] = useState(42)
  const [tickStart, setTickStart] = useState(1)
  const [tickEnd, setTickEnd] = useState(120)
  const [loading, setLoading] = useState(false)
  const [simResult, setSimResult] = useState(null)
  const [error, setError] = useState('')
  const [model, setModel] = useState('gemma3:4b')
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState({ ok: false, models: [], error: '' })
  const [ollamaLoading, setOllamaLoading] = useState(false)
  const [slideKey, setSlideKey] = useState(0)

  const monitoredStates = useMemo(() => simResult?.states || [], [simResult])
  const healthyCount = simResult?.summary?.healthy_states?.length || 0
  const criticalCount = simResult?.summary?.critical_states?.length || 0

  const stateNames = useMemo(() => monitoredStates.filter(s => s.alive !== false).map(s => s.state), [monitoredStates])
  const stateSeries = simResult?.state_series || {}
  const bidAskOverTime = simResult?.bid_ask_over_time || []
  const bidAskByState = simResult?.bid_ask_by_state || {}
  const resourceConsumption = simResult?.resource_consumption || []

  const slides = useMemo(
    () => [
      {
        title: 'Indian State Resource Intelligence',
        subtitle: '10 states, 120 ticks, 10,000 data rows — real-time resource, GDP, welfare & trade monitoring.',
      },
      {
        title: 'Climate Resilience Analysis',
        subtitle: 'Droughts, floods, cyclones, heatwaves — track shock intensity and state-level impact.',
      },
      {
        title: 'Strategy Classification Engine',
        subtitle: 'AI-derived strategy labels: Trade-Heavy, Growth-Focused, Climate-Resilient, Welfare-Priority.',
      },
    ],
    [],
  )

  useEffect(() => {
    if (!introDone) return
    const id = setInterval(() => {
      setActiveSlide((p) => (p + 1) % slides.length)
      setSlideKey((k) => k + 1)
    }, 4200)
    return () => clearInterval(id)
  }, [introDone, slides.length])

  const refreshOllamaStatus = async () => {
    setOllamaLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/ollama/status`)
      if (!res.ok) throw new Error(`Ollama status failed (${res.status})`)
      const data = await res.json()
      setOllamaStatus({
        ok: !!data.ok,
        models: data.models || [],
        error: data.error || '',
      })
      if (!model && data.models?.length) {
        setModel(data.models[0])
      }
    } catch (err) {
      setOllamaStatus({ ok: false, models: [], error: err.message || 'Unable to reach Ollama status endpoint' })
    } finally {
      setOllamaLoading(false)
    }
  }

  useEffect(() => {
    refreshOllamaStatus()
  }, [])

  const runSimulation = async () => {
    setLoading(true)
    setError('')
    setAiText('')
    try {
      const res = await fetch(`${API_BASE}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: Number(seed), tick_start: Number(tickStart), tick_end: Number(tickEnd) }),
      })
      if (!res.ok) throw new Error(`Simulation failed (${res.status})`)
      setSimResult(await res.json())
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
    a.download = `india-resource-report-tick${tickStart}-${tickEnd}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const generateInsight = async () => {
    if (!simResult) { setError('Run analysis first.'); return }
    if (!ollamaStatus.ok) {
      setError('Ollama is offline. Start Ollama and pull a model (example: ollama pull gemma3:4b).')
      return
    }
    setAiLoading(true)
    setError('')
    try {
      const s = simResult.summary
      const summaryText = [
        `Tick Range: ${s.tick_range?.[0]}–${s.tick_range?.[1]}`,
        `Healthy States: ${healthyCount}/10`,
        `Critical: ${s.critical_states?.join(', ') || 'None'}`,
        `Population: ${s.total_population?.toLocaleString()}`,
        `GDP: ₹${s.total_gdp}Cr`,
        `Avg Welfare: ${s.avg_welfare}`,
        `Avg Inequality: ${s.avg_inequality}`,
        `Trades Executed: ${s.total_trades_executed} (${(s.trade_execution_rate * 100).toFixed(1)}%)`,
        `Data Rows: ${s.total_data_rows}`,
      ].join('\n')

      const res = await fetch(`${API_BASE}/api/ollama/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, summary: summaryText, state_table: monitoredStates }),
      })
      if (!res.ok) throw new Error(`Ollama analysis failed (${res.status})`)
      const data = await res.json()
      setAiText(data.analysis || '')
    } catch (err) {
      setError(err.message || 'Failed to generate insight')
    } finally {
      setAiLoading(false)
    }
  }

  const s = simResult?.summary
  const kpis = s
    ? [
        ['Healthy States', `${healthyCount} / 10`, `Critical: ${criticalCount}`],
        ['Total GDP', `₹${s.total_gdp?.toLocaleString()}Cr`, `Avg Welfare: ${s.avg_welfare}`],
        ['Population', `${Math.round(s.total_population).toLocaleString()}`, `Inequality: ${s.avg_inequality}`],
        ['Trades Executed', `${s.total_trades_executed}`, `Rate: ${(s.trade_execution_rate * 100).toFixed(1)}%`],
      ]
    : [
        ['Healthy States', '—', 'Run analysis to compute'],
        ['Total GDP', '—', 'Run analysis to compute'],
        ['Population', '—', 'Run analysis to compute'],
        ['Trades Executed', '—', 'Run analysis to compute'],
      ]

  return (
    <div className="app-shell">
      {!introDone && <GlobeIntro onComplete={() => setIntroDone(true)} />}

      <div className={`dashboard ${introDone ? 'dashboard-visible' : ''}`}>
        <header className="topbar glass">
          <div className="brand">
            <span className="brand-dot" />
            <div>
              <h1>India Resource Nexus</h1>
              <p>10-State Adaptive Resource &amp; Economic Intelligence Platform</p>
            </div>
          </div>
          <div className="top-actions">
            <button className="btn btn-outline" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Command Center
            </button>
            <button className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} onClick={runSimulation} disabled={loading}>
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </header>

        <main className="layout">
          {/* Hero slideshow with crossfade key */}
          <RevealSection className="hero glass" delay={0}>
            <div className="hero-content">
              <p className="eyebrow">Dataset-Driven Intelligence Dashboard</p>
              <h2 key={`title-${slideKey}`}>{slides[activeSlide].title}</h2>
              <p key={`sub-${slideKey}`}>{slides[activeSlide].subtitle}</p>
              <div className="slide-dots">
                {slides.map((slide, idx) => (
                  <button key={slide.title} className={`dot ${idx === activeSlide ? 'active' : ''}`}
                    onClick={() => { setActiveSlide(idx); setSlideKey((k) => k + 1) }} aria-label={`Slide ${idx + 1}`} />
                ))}
              </div>
            </div>
          </RevealSection>

          {/* Staggered KPIs */}
          <RevealSection className="kpi-grid" delay={0.08}>
            {kpis.map(([label, value, meta], i) => (
              <article className={`kpi glass stagger-${i + 1}`} key={label}
                style={{ animationDelay: `${0.12 + i * 0.08}s` }}>
                <p>{label}</p>
                <h3>{value}</h3>
                <span>{meta}</span>
              </article>
            ))}
          </RevealSection>

          <RevealSection className="panel-row" delay={0.12}>
            <article className="panel panel-large glass">
              <div className="panel-head">
                <h4>Dataset Analysis Control</h4>
                <span>10,000-row CSV · 10 states · 120 ticks</span>
              </div>
              <div className="control-grid">
                <label>
                  Seed
                  <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} min={1} />
                </label>
                <label>
                  Tick Start
                  <input type="number" value={tickStart} onChange={(e) => setTickStart(e.target.value)} min={1} max={120} />
                </label>
                <label>
                  Tick End
                  <input type="number" value={tickEnd} onChange={(e) => setTickEnd(e.target.value)} min={1} max={120} />
                </label>
                <label>
                  Engine
                  <input type="text" value="CSV Dataset + Strategy Analyzer" readOnly />
                </label>
              </div>
              <div className="control-actions">
                <button className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} onClick={runSimulation} disabled={loading}>
                  {loading ? 'Analyzing...' : 'Launch Analysis'}
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
                <span>Local AI strategic briefings</span>
              </div>
              <label className="model-input">
                Model
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} list="ollama-models" />
                <datalist id="ollama-models">
                  {ollamaStatus.models.map((modelName) => (
                    <option key={modelName} value={modelName} />
                  ))}
                </datalist>
              </label>
              <div className="pill">API: {API_BASE}</div>
              <div className="pill" style={{ marginTop: '0.35rem' }}>
                Ollama: {ollamaLoading ? 'checking…' : ollamaStatus.ok ? '● connected' : '○ offline'}
              </div>
              {!!ollamaStatus.models.length && (
                <div className="pill" style={{ marginTop: '0.35rem' }}>
                  Models: {ollamaStatus.models.join(', ')}
                </div>
              )}
              {!ollamaStatus.ok && ollamaStatus.error && (
                <p className="error-text" style={{ marginTop: '0.6rem' }}>{ollamaStatus.error}</p>
              )}
              <p className="ai-summary">
                {aiLoading ? (
                  <span className="shimmer shimmer-text" style={{ display: 'block', width: '80%' }} />
                ) : (
                  aiText || 'Generate a strategic briefing from your local Ollama model after running analysis.'
                )}
              </p>
              <div className="control-actions" style={{ marginTop: '0.6rem' }}>
                <button className="btn btn-outline" onClick={refreshOllamaStatus} disabled={ollamaLoading}>
                  {ollamaLoading ? 'Checking...' : 'Refresh Ollama'}
                </button>
                <button className={`btn btn-primary ${aiLoading ? 'btn-loading' : ''}`} onClick={generateInsight} disabled={aiLoading || !simResult || !ollamaStatus.ok}>
                  {aiLoading ? 'Generating...' : 'Generate Insight'}
                </button>
              </div>
            </article>
          </RevealSection>

          {/* === State Metrics Table === */}
          <RevealSection className="panel-row" delay={0.06}>
            <article className="panel panel-large glass">
              <div className="panel-head">
                <h4>State Economic &amp; Resource Dashboard</h4>
                <span>Final-tick snapshot from CSV dataset</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>State</th>
                      <th>Pop</th>
                      <th>GDP (₹Cr)</th>
                      <th>Growth%</th>
                      <th>Welfare</th>
                      <th>Inequality</th>
                      <th>Water</th>
                      <th>Food</th>
                      <th>Energy</th>
                      <th>Net Migr</th>
                      <th>Trades</th>
                      <th>Climate</th>
                      <th>Strategy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monitoredStates.map((st) => (
                      <tr key={st.state} className={st.welfare_index < 0.3 || st.gdp_growth_rate < 0 ? 'row-critical' : ''}>
                        <td>{st.state}</td>
                        <td>{Math.round(st.population).toLocaleString()}</td>
                        <td>{(st.state_gdp || 0).toFixed(1)}</td>
                        <td className={st.gdp_growth_rate < 0 ? 'text-red' : 'text-green'}>{(st.gdp_growth_rate || 0).toFixed(1)}%</td>
                        <td>{(st.welfare_index || 0).toFixed(3)}</td>
                        <td>{(st.inequality_index || 0).toFixed(3)}</td>
                        <td>{Math.round(st.water_supply || 0)}</td>
                        <td>{Math.round(st.food_supply || 0)}</td>
                        <td>{Math.round(st.energy_supply || 0)}</td>
                        <td className={(st.net_migration || 0) < 0 ? 'text-red' : 'text-green'}>{(st.net_migration || 0).toLocaleString()}</td>
                        <td>{st.executed_trades || 0}/{st.total_orders || 0}</td>
                        <td>{st.climate_event || '—'}</td>
                        <td><span className="strategy-tag">{st.dominant_strategy || '—'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel glass">
              <div className="panel-head">
                <h4>Strategy Classification</h4>
                <span>Dominant behavioral patterns</span>
              </div>
              <ul className="mix-list">
                {(simResult?.strategy_mix || []).map((entry) => (
                  <li key={entry.strategy}>
                    <span>{entry.strategy}</span>
                    <strong>{entry.count} states</strong>
                  </li>
                ))}
              </ul>
              {simResult?.resilience_ranking && (
                <>
                  <div className="panel-head" style={{ marginTop: '1rem' }}>
                    <h4>Resilience Ranking</h4>
                  </div>
                  <ul className="mix-list">
                    {simResult.resilience_ranking.slice(0, 5).map((r, idx) => (
                      <li key={r.state}>
                        <span>#{idx + 1} {r.state}</span>
                        <strong>{r.resilience_score}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </article>
          </RevealSection>

          {/* === CHARTS SECTION === */}

          <RevealSection className="panel-row" delay={0.06}>
            <article className="panel panel-large glass chart-panel">
              <div className="panel-head">
                <h4>GDP Share by State</h4>
                <span>Pie chart — proportional GDP contribution</span>
              </div>
              <GdpPieChart states={monitoredStates} />
            </article>
            <article className="panel glass chart-panel">
              <div className="panel-head">
                <h4>GDP Trend Over Ticks</h4>
                <span>Line chart — per-state GDP evolution</span>
              </div>
              <GdpLineChart stateSeries={stateSeries} stateNames={stateNames} />
            </article>
          </RevealSection>

          <RevealSection className="panel-row" delay={0.06}>
            <article className="panel panel-large glass chart-panel">
              <div className="panel-head">
                <h4>Resource Consumption by State</h4>
                <span>Water · Food · Energy consumed at final tick</span>
              </div>
              <ResourceBarChart resourceConsumption={resourceConsumption} />
            </article>
            <article className="panel glass chart-panel">
              <div className="panel-head">
                <h4>Generation vs Consumption</h4>
                <span>Resource production vs usage comparison</span>
              </div>
              <ResourceGenVsConChart resourceConsumption={resourceConsumption} />
            </article>
          </RevealSection>

          <RevealSection className="panel-row" delay={0.06}>
            <article className="panel panel-large glass chart-panel">
              <div className="panel-head">
                <h4>Bid vs Ask Negotiations Over Time</h4>
                <span>Order flow + average bid/ask price per tick</span>
              </div>
              <BidAskChart bidAskOverTime={bidAskOverTime} />
            </article>
            <article className="panel glass chart-panel">
              <div className="panel-head">
                <h4>Bid vs Ask Per State</h4>
                <span>Horizontal bar — order distribution</span>
              </div>
              <BidAskStateChart bidAskByState={bidAskByState} />
            </article>
          </RevealSection>

          <RevealSection className="panel-row" delay={0.06}>
            <article className="panel panel-large glass chart-panel">
              <div className="panel-head">
                <h4>Welfare Index Trend</h4>
                <span>Per-state welfare trajectory across all ticks</span>
              </div>
              <WelfareTrendChart stateSeries={stateSeries} stateNames={stateNames} />
            </article>
            <article className="panel glass chart-panel">
              <div className="panel-head">
                <h4>Population Trend</h4>
                <span>Stacked area — state populations over time</span>
              </div>
              <PopulationTrendChart stateSeries={stateSeries} stateNames={stateNames} />
            </article>
          </RevealSection>

          <RevealSection className="panel-row" delay={0.06}>
            <article className="panel panel-large glass chart-panel">
              <div className="panel-head">
                <h4>Trade Execution by State</h4>
                <span>Executed vs pending orders per state</span>
              </div>
              <TradeVolumeChart states={monitoredStates} />
            </article>
            <article className="panel glass">
              <div className="panel-head">
                <h4>Climate Events</h4>
                <span>Distribution across dataset</span>
              </div>
              <ul className="mix-list">
                {simResult?.climate
                  ? Object.entries(simResult.climate.event_counts || {}).map(([evt, count]) => (
                      <li key={evt}>
                        <span>{evt}</span>
                        <strong>{count} ({(simResult.climate.avg_shock_by_event?.[evt] || 0).toFixed(2)} avg shock)</strong>
                      </li>
                    ))
                  : <li><span>Run analysis to see climate data</span></li>}
              </ul>
            </article>
          </RevealSection>

          <RevealSection className="panel-row" delay={0.06}>
            <article className="panel glass">
              <div className="panel-head">
                <h4>Trade Analytics</h4>
                <span>Resource-wise execution summary</span>
              </div>
              <ul className="mix-list">
                {simResult?.trade
                  ? Object.entries(simResult.trade.by_resource || {}).map(([res, count]) => (
                      <li key={res}>
                        <span>{res}</span>
                        <strong>{count} trades · Vol: {Math.round(simResult.trade.volume_by_resource?.[res] || 0)}</strong>
                      </li>
                    ))
                  : <li><span>Run analysis to see trade data</span></li>}
              </ul>
            </article>
          </RevealSection>

          {/* === India Map === */}
          <RevealSection className="panel-row" delay={0.08}>
            <article className="panel panel-large glass">
              <div className="panel-head">
                <h4>India State Resource Map</h4>
                <span>Hover states for GDP, welfare, resources, trade &amp; climate intel</span>
              </div>
              <IndiaStateMap states={monitoredStates} />
            </article>

            <article className="panel glass">
              <div className="panel-head">
                <h4>Map Legend</h4>
                <span>State health by welfare index</span>
              </div>
              <ul className="mix-list">
                <li><span>🟢 Prosperous</span><strong>Welfare ≥ 0.8</strong></li>
                <li><span>🔵 Stable</span><strong>0.6 – 0.79</strong></li>
                <li><span>🟠 Strained</span><strong>0.4 – 0.59</strong></li>
                <li><span>🔴 Critical</span><strong>&lt; 0.4 or negative GDP growth</strong></li>
              </ul>
              {s && (
                <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <p>Dataset: 10,000 rows · {s.total_data_rows} in range</p>
                  <p>Tick range: {s.tick_range?.[0]}–{s.tick_range?.[1]}</p>
                </div>
              )}
            </article>
          </RevealSection>

          <section className="footer-note glass">
            <p>
              India Resource Nexus · Powered by Government of India datasets from data.gov.in, India-WRIS &amp; NITI Aayog NDAP
            </p>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App

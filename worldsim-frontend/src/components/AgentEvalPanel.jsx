import { useMemo } from 'react'

/* ──────────────────────────────────────────────────────────────
   AgentEvalPanel — Live Agent Evaluation Parameters
   Shows real-time per-state agent metrics with visual gauges,
   strategy tags, and composite performance scores.
   ────────────────────────────────────────────────────────────── */

const METRIC_DEFS = [
  { key: 'avg_welfare',           label: 'Welfare Index',       max: 1,   fmt: v => v.toFixed(3),   better: 'high' },
  { key: 'avg_gdp_growth',       label: 'GDP Growth',          max: 15,  fmt: v => `${v.toFixed(1)}%`, better: 'high' },
  { key: 'trade_execution_rate', label: 'Trade Efficiency',    max: 1,   fmt: v => `${(v * 100).toFixed(1)}%`, better: 'high' },
  { key: 'resource_surplus_ratio',label:'Resource Surplus',    max: 2,   fmt: v => `${v.toFixed(2)}×`, better: 'high' },
  { key: 'avg_inequality',       label: 'Inequality',          max: 1,   fmt: v => v.toFixed(3),   better: 'low' },
  { key: 'net_migration',        label: 'Net Migration',       max: 500, fmt: v => v.toLocaleString(), better: 'high' },
]

const STRATEGY_COLORS = {
  'Trade-Heavy':           '#00d4aa',
  'Resource-Conservative': '#4488cc',
  'Growth-Focused':        '#76b900',
  'Welfare-Priority':      '#d4a017',
  'Migration-Attracting':  '#cc66ff',
  'Climate-Resilient':     '#ff6644',
  'Balanced':              '#888',
}

function getAgentGrade(resilience) {
  if (resilience >= 0.75) return { grade: 'S', cls: 'grade-s' }
  if (resilience >= 0.60) return { grade: 'A', cls: 'grade-a' }
  if (resilience >= 0.45) return { grade: 'B', cls: 'grade-b' }
  if (resilience >= 0.30) return { grade: 'C', cls: 'grade-c' }
  return { grade: 'D', cls: 'grade-d' }
}

function MiniBar({ value, max, better }) {
  const pct = Math.min(Math.max((better === 'low' ? (max - value) : value) / max, 0), 1) * 100
  const hue = better === 'low'
    ? (1 - Math.min(value / max, 1)) * 120  // green when low
    : Math.min(value / max, 1) * 120         // green when high
  return (
    <div className="ae-bar-track">
      <div className="ae-bar-fill" style={{ width: `${pct}%`, background: `hsl(${hue}, 75%, 45%)` }} />
    </div>
  )
}

function AgentCard({ state, scores, strategy, tags, resilience }) {
  const { grade, cls } = getAgentGrade(resilience)
  return (
    <div className="ae-card glass">
      <div className="ae-card-header">
        <div className="ae-name-row">
          <span className={`ae-grade ${cls}`}>{grade}</span>
          <div>
            <h5 className="ae-state-name">{state}</h5>
            <span className="ae-strategy-badge" style={{ color: STRATEGY_COLORS[strategy] || '#aaa' }}>
              {strategy}
            </span>
          </div>
        </div>
        <div className="ae-resilience">
          <svg viewBox="0 0 36 36" className="ae-ring">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.8" />
            <circle cx="18" cy="18" r="15.9" fill="none"
              stroke="var(--accent)"
              strokeWidth="2.8"
              strokeDasharray={`${resilience * 100} ${100 - resilience * 100}`}
              strokeDashoffset="25"
              strokeLinecap="round"
            />
          </svg>
          <span className="ae-ring-label">{(resilience * 100).toFixed(0)}</span>
        </div>
      </div>

      <div className="ae-metrics">
        {METRIC_DEFS.map(m => {
          const v = scores?.[m.key] ?? 0
          return (
            <div className="ae-metric-row" key={m.key}>
              <span className="ae-metric-label">{m.label}</span>
              <MiniBar value={Math.abs(v)} max={m.max} better={m.better} />
              <span className="ae-metric-val">{m.fmt(v)}</span>
            </div>
          )
        })}
      </div>

      {tags.length > 0 && (
        <div className="ae-tags">
          {tags.map(t => (
            <span key={t} className="ae-tag" style={{ borderColor: STRATEGY_COLORS[t] || '#555' }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AgentEvalPanel({ states, resilienceRanking }) {
  /* merge resilience scores into state data */
  const agents = useMemo(() => {
    if (!states?.length) return []
    const resMap = {}
    ;(resilienceRanking || []).forEach(r => { resMap[r.state] = r.resilience_score })
    return states.map(st => ({
      state: st.state,
      scores: st.scores || {},
      strategy: st.dominant_strategy || 'Balanced',
      tags: st.strategy_tags || [],
      resilience: resMap[st.state] ?? 0,
    })).sort((a, b) => b.resilience - a.resilience)
  }, [states, resilienceRanking])

  /* aggregate stats */
  const agg = useMemo(() => {
    if (!agents.length) return null
    const avgRes = agents.reduce((s, a) => s + a.resilience, 0) / agents.length
    const topStrat = agents.reduce((acc, a) => { acc[a.strategy] = (acc[a.strategy] || 0) + 1; return acc }, {})
    const dominant = Object.entries(topStrat).sort((a, b) => b[1] - a[1])[0]
    const avgWelfare = agents.reduce((s, a) => s + (a.scores.avg_welfare || 0), 0) / agents.length
    const avgTrade = agents.reduce((s, a) => s + (a.scores.trade_execution_rate || 0), 0) / agents.length
    return { avgRes, dominant: dominant?.[0] || '—', avgWelfare, avgTrade }
  }, [agents])

  if (!agents.length) {
    return (
      <div className="ae-empty">
        <div className="ae-empty-icon">⚡</div>
        <p>Run analysis to activate agent evaluation parameters</p>
      </div>
    )
  }

  return (
    <div className="ae-panel">
      {/* Aggregate summary strip */}
      <div className="ae-summary-strip">
        <div className="ae-summary-item">
          <span className="ae-summary-label">Avg Resilience</span>
          <span className="ae-summary-value">{(agg.avgRes * 100).toFixed(1)}%</span>
        </div>
        <div className="ae-summary-item">
          <span className="ae-summary-label">Dominant Strategy</span>
          <span className="ae-summary-value" style={{ color: STRATEGY_COLORS[agg.dominant] || '#aaa' }}>{agg.dominant}</span>
        </div>
        <div className="ae-summary-item">
          <span className="ae-summary-label">Avg Welfare</span>
          <span className="ae-summary-value">{agg.avgWelfare.toFixed(3)}</span>
        </div>
        <div className="ae-summary-item">
          <span className="ae-summary-label">Avg Trade Efficiency</span>
          <span className="ae-summary-value">{(agg.avgTrade * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Agent cards grid */}
      <div className="ae-grid">
        {agents.map(a => <AgentCard key={a.state} {...a} />)}
      </div>
    </div>
  )
}

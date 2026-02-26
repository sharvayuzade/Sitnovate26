import { useMemo, useState } from 'react'

const STATE_LAYOUT = {
  Punjab: { x: 34, y: 21 },
  Rajasthan: { x: 29, y: 33 },
  Gujarat: { x: 25, y: 48 },
  UttarPradesh: { x: 44, y: 30 },
  MadhyaPradesh: { x: 40, y: 42 },
  Maharashtra: { x: 36, y: 56 },
  WestBengal: { x: 55, y: 40 },
  Assam: { x: 66, y: 35 },
  Karnataka: { x: 38, y: 72 },
  TamilNadu: { x: 44, y: 84 },
}

const STATE_KEY = {
  Punjab: 'Punjab',
  Rajasthan: 'Rajasthan',
  Gujarat: 'Gujarat',
  UttarPradesh: 'Uttar Pradesh',
  MadhyaPradesh: 'Madhya Pradesh',
  Maharashtra: 'Maharashtra',
  WestBengal: 'West Bengal',
  Assam: 'Assam',
  Karnataka: 'Karnataka',
  TamilNadu: 'Tamil Nadu',
}

function stateColor(state) {
  if (!state) return '#64748b'
  if (!state.alive) return '#ef4444'
  if (state.happiness >= 0.8) return '#22c55e'
  if (state.happiness >= 0.6) return '#38bdf8'
  if (state.happiness >= 0.4) return '#f59e0b'
  return '#f97316'
}

export default function IndiaStateMap({ states = [] }) {
  const [hovered, setHovered] = useState(null)

  const stateMap = useMemo(() => {
    const map = {}
    for (const state of states) {
      map[state.state] = state
    }
    return map
  }, [states])

  const hoveredState = hovered ? stateMap[hovered] : null

  return (
    <div className="india-map-wrap">
      <div className="india-map-bg" />
      <svg viewBox="0 0 100 100" className="india-map-svg" preserveAspectRatio="none">
        <defs>
          <filter id="indiaGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M34,10 L41,12 L48,20 L55,24 L60,31 L63,40 L61,48 L56,56 L54,63 L58,72 L55,86 L48,90 L43,85 L40,73 L34,66 L29,57 L25,48 L20,44 L17,37 L19,30 L24,24 L28,16 Z"
          className="india-land"
        />

        <path d="M33,17 L41,22 L45,31 L42,42 L38,53 L36,67" className="india-river" />
        <path d="M47,27 L53,35 L54,46 L50,58 L50,72" className="india-river" />

        {Object.entries(STATE_LAYOUT).map(([key, point]) => {
          const label = STATE_KEY[key]
          const liveState = stateMap[label]
          const fill = stateColor(liveState)
          const size = hovered === label ? 2.2 : 1.7

          return (
            <g
              key={label}
              className="india-point"
              transform={`translate(${point.x} ${point.y})`}
              onMouseEnter={() => setHovered(label)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle r={size + 1.1} fill="rgba(15,23,42,0.68)" />
              <circle r={size} fill={fill} filter="url(#indiaGlow)" />
              <text x="2.6" y="-2" className="india-label">
                {label}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="india-overlay-title">
        <h5>India Resource Command Map</h5>
        <p>10 monitored states · live hover intelligence</p>
      </div>

      <div className="india-hover-card">
        {hoveredState ? (
          <>
            <h6>{hoveredState.state}</h6>
            <p>Status: {hoveredState.alive ? 'Stable' : 'Critical'}</p>
            <p>Population Index: {Math.round(hoveredState.population || 0)}</p>
            <p>Dominant Strategy: {hoveredState.dominant_strategy || '—'}</p>
            <p>
              Resources: W {Math.round(hoveredState.water || 0)} · F {Math.round(hoveredState.food || 0)} · E{' '}
              {Math.round(hoveredState.energy || 0)} · L {Math.round(hoveredState.land || 0)}
            </p>
            <p>
              Happiness: {(hoveredState.happiness || 0).toFixed(2)} · Tech: {(hoveredState.tech || 0).toFixed(2)}
            </p>
            <p>Source Region: {hoveredState.source_region}</p>
          </>
        ) : (
          <>
            <h6>Hover for State Intel</h6>
            <p>Move on any state marker to view status, resources, strategy, and source mapping.</p>
          </>
        )}
      </div>
    </div>
  )
}

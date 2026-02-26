import { useMemo, useState } from 'react'

const REGION_LAYOUT = {
  Verdantia: { x: 18, y: 22 },
  Aridia: { x: 56, y: 18 },
  Temperalis: { x: 38, y: 42 },
  Borealis: { x: 66, y: 48 },
  Glaciera: { x: 80, y: 8 },
  Maritosa: { x: 14, y: 58 },
  Montarok: { x: 84, y: 62 },
  Fluviana: { x: 50, y: 70 },
}

const DEFAULT_REGIONS = [
  'Verdantia',
  'Aridia',
  'Temperalis',
  'Borealis',
  'Glaciera',
  'Maritosa',
  'Montarok',
  'Fluviana',
]

function regionColor(region) {
  if (!region) return '#64748b'
  if (!region.alive) return '#ef4444'
  if (region.happiness >= 0.8) return '#22c55e'
  if (region.happiness >= 0.6) return '#38bdf8'
  if (region.happiness >= 0.4) return '#f59e0b'
  return '#f97316'
}

export default function FantasyMap({ regions = [] }) {
  const [hovered, setHovered] = useState(null)

  const regionMap = useMemo(() => {
    const map = {}
    for (const region of regions) {
      map[region.region] = region
    }
    return map
  }, [regions])

  const hoveredRegion = hovered ? regionMap[hovered] : null

  return (
    <div className="fantasy-map-wrap">
      <div className="fantasy-map-bg" />
      <svg viewBox="0 0 100 80" className="fantasy-map-svg" preserveAspectRatio="none">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d="M3,13 C14,4 26,4 38,8 C50,12 57,9 66,14 C75,18 82,18 94,25 L94,74 L7,76 C5,70 8,64 6,57 C4,46 1,37 3,13 Z"
          className="map-continent"
        />

        <path d="M8,61 C14,58 20,57 26,60" className="map-river" />
        <path d="M25,54 C34,50 44,49 53,52" className="map-river" />
        <path d="M58,55 C66,54 76,55 86,60" className="map-river" />

        {DEFAULT_REGIONS.map((name) => {
          const p = REGION_LAYOUT[name]
          const liveRegion = regionMap[name]
          const fill = regionColor(liveRegion)
          const size = hovered === name ? 2.35 : 1.75
          return (
            <g
              key={name}
              className="map-point"
              transform={`translate(${p.x} ${p.y})`}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle r={size + 1.2} fill="rgba(15,23,42,0.65)" />
              <circle r={size} fill={fill} filter="url(#glow)" />
              <text x="2.8" y="-2" className="map-label">
                {name}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="map-overlay-title">
        <h5>WorldSim Fantasy Atlas</h5>
        <p>Hover a realm to inspect live regional intelligence</p>
      </div>

      <div className="map-hover-card">
        {hoveredRegion ? (
          <>
            <h6>{hoveredRegion.region}</h6>
            <p>Status: {hoveredRegion.alive ? 'Alive' : 'Collapsed'}</p>
            <p>Population: {Math.round(hoveredRegion.population || 0)}</p>
            <p>Dominant Strategy: {hoveredRegion.dominant_strategy || '—'}</p>
            <p>
              Resources: W {Math.round(hoveredRegion.water || 0)} · F {Math.round(hoveredRegion.food || 0)} · E{' '}
              {Math.round(hoveredRegion.energy || 0)} · L {Math.round(hoveredRegion.land || 0)}
            </p>
            <p>
              Happiness: {hoveredRegion.happiness ?? '—'} · Tech: {hoveredRegion.tech ?? '—'}
            </p>
          </>
        ) : (
          <>
            <h6>Hover for Region Intel</h6>
            <p>Move over a kingdom marker to see survival, resources, and strategy.</p>
          </>
        )}
      </div>
    </div>
  )
}

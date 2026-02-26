import { useMemo, useState, memo, useCallback } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps'

const INDIA_TOPO_URL =
  'https://gist.githubusercontent.com/jbrobst/56c13bbbf9d97d187fea01ca62ea5112/raw/e388c4cae20aa53cb5090210a42ebb9b765c0a36/india_states.geojson'

/* 10 states we track in the dataset */
const TRACKED_STATES = new Set([
  'Punjab',
  'Rajasthan',
  'Gujarat',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Maharashtra',
  'West Bengal',
  'Bihar',
  'Karnataka',
  'Tamil Nadu',
])

/* Map GeoJSON ST_NM names to our dataset names (most match 1-to-1) */
function geoNameToDataset(geoName) {
  const map = {
    Punjab: 'Punjab',
    Rajasthan: 'Rajasthan',
    Gujarat: 'Gujarat',
    'Uttar Pradesh': 'Uttar Pradesh',
    'Madhya Pradesh': 'Madhya Pradesh',
    Maharashtra: 'Maharashtra',
    'West Bengal': 'West Bengal',
    Bihar: 'Bihar',
    Karnataka: 'Karnataka',
    'Tamil Nadu': 'Tamil Nadu',
  }
  return map[geoName] || null
}

function stateColor(state) {
  if (!state) return 'rgba(100,116,139,0.18)' /* untracked — dim */
  if (!state.alive) return '#dc2626'
  const w = state.welfare_index ?? 0
  if (w >= 0.8) return '#22c55e'
  if (w >= 0.6) return '#38bdf8'
  if (w >= 0.4) return '#f59e0b'
  return '#f97316'
}

const MemoGeography = memo(function MemoGeo({
  geo,
  dataState,
  onMouseEnter,
  onMouseLeave,
}) {
  const isTracked = !!dataState || TRACKED_STATES.has(geo.properties.ST_NM || geo.properties.st_nm || '')
  return (
    <Geography
      geography={geo}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        default: {
          fill: stateColor(dataState),
          stroke: isTracked ? 'rgba(148,163,184,0.55)' : 'rgba(148,163,184,0.18)',
          strokeWidth: isTracked ? 0.65 : 0.3,
          outline: 'none',
          transition: 'fill 0.25s ease',
        },
        hover: {
          fill: dataState
            ? stateColor(dataState)
            : 'rgba(100,116,139,0.35)',
          stroke: '#e0f2fe',
          strokeWidth: 1.1,
          outline: 'none',
          cursor: dataState ? 'pointer' : 'default',
          filter: dataState ? 'brightness(1.25)' : 'none',
        },
        pressed: {
          fill: stateColor(dataState),
          stroke: '#e0f2fe',
          strokeWidth: 1.1,
          outline: 'none',
        },
      }}
    />
  )
})

export default function IndiaStateMap({ states = [] }) {
  const [hovered, setHovered] = useState(null)

  const stateMap = useMemo(() => {
    const map = {}
    for (const st of states) {
      map[st.state] = st
    }
    return map
  }, [states])

  const hoveredState = hovered ? stateMap[hovered] : null

  const handleMouseEnter = useCallback(
    (datasetName) => () => {
      if (datasetName) setHovered(datasetName)
    },
    []
  )

  const handleMouseLeave = useCallback(() => setHovered(null), [])

  return (
    <div className="india-map-wrap">
      <div className="india-map-bg" />

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 1000,
          center: [82.5, 22],
        }}
        className="india-map-composed"
        width={600}
        height={620}
      >
        <ZoomableGroup center={[82.5, 22]} zoom={1}>
          <Geographies geography={INDIA_TOPO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const geoName = geo.properties.ST_NM || geo.properties.st_nm || ''
                const datasetName = geoNameToDataset(geoName)
                const dataState = datasetName ? stateMap[datasetName] : null
                return (
                  <MemoGeography
                    key={geo.rsmKey}
                    geo={geo}
                    dataState={dataState}
                    onMouseEnter={handleMouseEnter(datasetName)}
                    onMouseLeave={handleMouseLeave}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Title */}
      <div className="india-overlay-title">
        <h5>India State Resource Map</h5>
        <p>10 monitored states · hover for live data</p>
      </div>

      {/* Legend */}
      <div className="india-legend">
        <span><i style={{ background: '#22c55e' }} /> Welfare ≥ 0.8</span>
        <span><i style={{ background: '#38bdf8' }} /> ≥ 0.6</span>
        <span><i style={{ background: '#f59e0b' }} /> ≥ 0.4</span>
        <span><i style={{ background: '#f97316' }} /> &lt; 0.4</span>
        <span><i style={{ background: '#dc2626' }} /> Critical</span>
      </div>

      {/* Hover card */}
      <div className="india-hover-card">
        {hoveredState ? (
          <>
            <h6>
              {hoveredState.state}
              <span
                className="hover-badge"
                style={{
                  background: hoveredState.alive ? '#22c55e22' : '#dc262622',
                  color: hoveredState.alive ? '#86efac' : '#fca5a5',
                }}
              >
                {hoveredState.alive ? 'Stable' : 'Critical'}
              </span>
            </h6>
            <div className="hover-grid">
              <div>
                <label>Population</label>
                <strong>{Math.round(hoveredState.population || 0).toLocaleString()}</strong>
              </div>
              <div>
                <label>GDP</label>
                <strong>₹{(hoveredState.state_gdp || 0).toFixed(1)}Cr</strong>
              </div>
              <div>
                <label>GDP Growth</label>
                <strong className={(hoveredState.gdp_growth_rate || 0) >= 0 ? 'text-green' : 'text-red'}>
                  {(hoveredState.gdp_growth_rate || 0).toFixed(1)}%
                </strong>
              </div>
              <div>
                <label>Welfare</label>
                <strong>{(hoveredState.welfare_index || 0).toFixed(3)}</strong>
              </div>
              <div>
                <label>Water</label>
                <strong>{Math.round(hoveredState.water_supply || 0)}</strong>
              </div>
              <div>
                <label>Food</label>
                <strong>{Math.round(hoveredState.food_supply || 0)}</strong>
              </div>
              <div>
                <label>Energy</label>
                <strong>{Math.round(hoveredState.energy_supply || 0)}</strong>
              </div>
              <div>
                <label>Inequality</label>
                <strong>{(hoveredState.inequality_index || 0).toFixed(3)}</strong>
              </div>
              <div>
                <label>Net Migration</label>
                <strong>{(hoveredState.net_migration || 0).toLocaleString()}</strong>
              </div>
              <div>
                <label>Trades</label>
                <strong>{hoveredState.executed_trades || 0}/{hoveredState.total_orders || 0}</strong>
              </div>
              <div>
                <label>Climate</label>
                <strong>{hoveredState.climate_event || 'None'}</strong>
              </div>
              <div>
                <label>Shock</label>
                <strong>{(hoveredState.shock_intensity || 0).toFixed(2)}</strong>
              </div>
            </div>
            {hoveredState.dominant_strategy && (
              <div className="hover-strategy">
                Strategy: <span>{hoveredState.dominant_strategy}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <h6>Hover any state for intel</h6>
            <p className="hover-hint">
              Coloured states are monitored. Hover to see GDP, welfare, resources, trade &amp; climate data.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

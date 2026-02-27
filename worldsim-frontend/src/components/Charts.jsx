/**
 * Charts.jsx — Live data visualisation panels for WorldSim India dashboard
 * =========================================================================
 * 1. GDP Comparison    – Pie chart (share) + multi-line chart (GDP over ticks)
 * 2. Resource Usage    – Grouped bar chart (water / food / energy consumed per state)
 * 3. Bid vs Ask        – Dual-axis area chart (order counts + avg prices over ticks)
 * 4. Welfare Trend     – Multi-line chart (welfare_index per state over ticks)
 * 5. Population Trend  – Area chart (stacked population over ticks)
 * 6. Trade Volume      – Bar chart (trade volume per state)
 */

import { useMemo, Component } from 'react'
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
  AreaChart, Area,
  ComposedChart,
} from 'recharts'

/* ---- Error Boundary for individual chart panels ---- */
class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMsg: '' }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error?.message || 'Unknown chart error' }
  }
  render() {
    if (this.state.hasError) {
      return (
        <p className="chart-empty" style={{ color: '#f87171' }}>
          Chart render error: {this.state.errorMsg}
        </p>
      )
    }
    return this.props.children
  }
}

/* ---- palette (NVIDIA green spectrum) ---- */
const STATE_COLORS = [
  '#76b900', '#00d4aa', '#4ade80', '#22d3ee', '#a3e635',
  '#facc15', '#f97316', '#34d399', '#06b6d4', '#94a3b8',
]

const RESOURCE_COLORS = { water: '#22d3ee', food: '#4ade80', energy: '#facc15' }

/* small custom tooltip wrapper */
const GlassTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  try {
    return (
      <div className="chart-tooltip">
        {label !== undefined && label !== null && <p className="chart-tooltip-label">{String(label)}</p>}
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || '#f1f5f9', margin: 0, fontSize: '0.72rem' }}>
            {p.name ?? 'Value'}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(p.value ?? '—')}</strong>
          </p>
        ))}
      </div>
    )
  } catch {
    return null
  }
}

/* ====================================================================
   1. GDP PIE CHART — share of total GDP per state
   ==================================================================== */
export function GdpPieChart({ states = [] }) {
  const data = useMemo(
    () =>
      states
        .filter((s) => s.alive !== false)
        .map((s) => ({ name: s.state, value: Math.round(s.state_gdp || 0) })),
    [states],
  )
  if (!data.length) return <p className="chart-empty">Run analysis to see GDP share</p>

  return (
    <ChartErrorBoundary>
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={110}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: '#64748b' }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={STATE_COLORS[i % STATE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<GlassTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '0.72rem', color: '#94a3b8' }}
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
    </ChartErrorBoundary>
  )
}

/* ====================================================================
   2. GDP LINE CHART — per-state GDP over ticks
   ==================================================================== */
export function GdpLineChart({ stateSeries = {}, stateNames = [] }) {
  const data = useMemo(() => {
    if (!stateNames.length) return []
    const firstState = stateNames[0]
    const ticks = stateSeries[firstState]?.ticks || []
    return ticks.map((t, idx) => {
      const point = { tick: t }
      stateNames.forEach((sn) => {
        point[sn] = stateSeries[sn]?.state_gdp?.[idx] ?? 0
      })
      return point
    })
  }, [stateSeries, stateNames])

  if (!data.length) return <p className="chart-empty">Run analysis to see GDP trend</p>

  return (
    <ChartErrorBoundary>
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
        <XAxis dataKey="tick" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Tick', position: 'insideBottomRight', offset: -2, fill: '#64748b', fontSize: 11 }} />
        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'GDP (₹Cr)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
        <Tooltip content={<GlassTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.72rem' }} iconSize={8} />
        {stateNames.map((sn, i) => (
          <Line
            key={sn}
            type="monotone"
            dataKey={sn}
            stroke={STATE_COLORS[i % STATE_COLORS.length]}
            strokeWidth={1.8}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
    </ChartErrorBoundary>
  )
}

/* ====================================================================
   3. RESOURCE CONSUMPTION BAR CHART — water / food / energy per state
   ==================================================================== */
export function ResourceBarChart({ resourceConsumption = [] }) {
  if (!resourceConsumption.length) return <p className="chart-empty">Run analysis to see resource data</p>

  return (
    <ChartErrorBoundary>
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={resourceConsumption} barCategoryGap="18%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
        <XAxis dataKey="state" stroke="#64748b" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Consumed', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
        <Tooltip content={<GlassTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.72rem' }} iconSize={8} />
        <Bar dataKey="water_consumed" name="Water" fill={RESOURCE_COLORS.water} radius={[3, 3, 0, 0]} />
        <Bar dataKey="food_consumed" name="Food" fill={RESOURCE_COLORS.food} radius={[3, 3, 0, 0]} />
        <Bar dataKey="energy_consumed" name="Energy" fill={RESOURCE_COLORS.energy} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
    </ChartErrorBoundary>
  )
}

/* ====================================================================
   4. RESOURCE GENERATION vs CONSUMPTION — grouped bar
   ==================================================================== */
export function ResourceGenVsConChart({ resourceConsumption = [] }) {
  const data = useMemo(
    () =>
      resourceConsumption.map((r) => ({
        state: r.state,
        'Water Gen': r.water_generated,
        'Water Con': r.water_consumed,
        'Food Gen': r.food_generated,
        'Food Con': r.food_consumed,
        'Energy Gen': r.energy_generated,
        'Energy Con': r.energy_consumed,
      })),
    [resourceConsumption],
  )
  if (!data.length) return <p className="chart-empty">Run analysis to see resource gen vs consumption</p>

  return (
    <ChartErrorBoundary>
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} barCategoryGap="12%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
        <XAxis dataKey="state" stroke="#64748b" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
        <Tooltip content={<GlassTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.7rem' }} iconSize={8} />
        <Bar dataKey="Water Gen" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Water Con" fill="#0369a1" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Food Gen" fill="#10b981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Food Con" fill="#166534" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Energy Gen" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Energy Con" fill="#a16207" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
    </ChartErrorBoundary>
  )
}

/* ====================================================================
   5. BID vs ASK NEGOTIATIONS — area chart over ticks
   ==================================================================== */
export function BidAskChart({ bidAskOverTime = [] }) {
  if (!bidAskOverTime.length) return <p className="chart-empty">Run analysis to see bid/ask data</p>

  return (
    <ChartErrorBoundary>
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={bidAskOverTime}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
        <XAxis dataKey="tick" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Tick', position: 'insideBottomRight', offset: -2, fill: '#64748b', fontSize: 11 }} />
        <YAxis yAxisId="count" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Orders', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
        <YAxis yAxisId="price" orientation="right" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Avg Price', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 11 }} />
        <Tooltip content={<GlassTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.72rem' }} iconSize={8} />
        <Area yAxisId="count" type="monotone" dataKey="bids" name="Bid Orders" stroke="#10b981" fill="rgba(16,185,129,0.12)" strokeWidth={2} />
        <Area yAxisId="count" type="monotone" dataKey="asks" name="Ask Orders" stroke="#ef4444" fill="rgba(239,68,68,0.12)" strokeWidth={2} />
        <Line yAxisId="price" type="monotone" dataKey="avg_bid_price" name="Avg Bid Price" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
        <Line yAxisId="price" type="monotone" dataKey="avg_ask_price" name="Avg Ask Price" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
    </ChartErrorBoundary>
  )
}

/* ====================================================================
   6. BID vs ASK PER STATE — horizontal bar
   ==================================================================== */
export function BidAskStateChart({ bidAskByState = {} }) {
  const data = useMemo(
    () =>
      Object.entries(bidAskByState).map(([state, counts]) => ({
        state,
        Bids: counts?.bid || 0,
        Asks: counts?.ask || 0,
      })),
    [bidAskByState],
  )
  if (!data.length) return <p className="chart-empty">Run analysis to see bid/ask per state</p>

  return (
    <ChartErrorBoundary>
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" barCategoryGap="16%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
        <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
        <YAxis dataKey="state" type="category" stroke="#64748b" tick={{ fontSize: 10 }} width={100} />
        <Tooltip content={<GlassTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.72rem' }} iconSize={8} />
        <Bar dataKey="Bids" fill="#10b981" radius={[0, 3, 3, 0]} />
        <Bar dataKey="Asks" fill="#ef4444" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
    </ChartErrorBoundary>
  )
}

/* ====================================================================
   7. WELFARE TREND — multi-line chart per state over ticks
   ==================================================================== */
export function WelfareTrendChart({ stateSeries = {}, stateNames = [] }) {
  const data = useMemo(() => {
    if (!stateNames.length) return []
    const firstState = stateNames[0]
    const ticks = stateSeries[firstState]?.ticks || []
    return ticks.map((t, idx) => {
      const point = { tick: t }
      stateNames.forEach((sn) => {
        point[sn] = stateSeries[sn]?.welfare_index?.[idx] ?? 0
      })
      return point
    })
  }, [stateSeries, stateNames])

  if (!data.length) return <p className="chart-empty">Run analysis to see welfare trend</p>

  return (
    <ChartErrorBoundary>
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
        <XAxis dataKey="tick" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Tick', position: 'insideBottomRight', offset: -2, fill: '#64748b', fontSize: 11 }} />
        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 1]} label={{ value: 'Welfare Index', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
        <Tooltip content={<GlassTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.72rem' }} iconSize={8} />
        {stateNames.map((sn, i) => (
          <Line
            key={sn}
            type="monotone"
            dataKey={sn}
            stroke={STATE_COLORS[i % STATE_COLORS.length]}
            strokeWidth={1.8}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
    </ChartErrorBoundary>
  )
}

/* ====================================================================
   8. POPULATION TREND — stacked area chart
   ==================================================================== */
export function PopulationTrendChart({ stateSeries = {}, stateNames = [] }) {
  const data = useMemo(() => {
    if (!stateNames.length) return []
    const firstState = stateNames[0]
    const ticks = stateSeries[firstState]?.ticks || []
    return ticks.map((t, idx) => {
      const point = { tick: t }
      stateNames.forEach((sn) => {
        point[sn] = stateSeries[sn]?.population?.[idx] ?? 0
      })
      return point
    })
  }, [stateSeries, stateNames])

  if (!data.length) return <p className="chart-empty">Run analysis to see population trend</p>

  return (
    <ChartErrorBoundary>
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
        <XAxis dataKey="tick" stroke="#64748b" tick={{ fontSize: 11 }} />
        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
        <Tooltip content={<GlassTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.72rem' }} iconSize={8} />
        {stateNames.map((sn, i) => (
          <Area
            key={sn}
            type="monotone"
            dataKey={sn}
            stackId="pop"
            stroke={STATE_COLORS[i % STATE_COLORS.length]}
            fill={STATE_COLORS[i % STATE_COLORS.length]}
            fillOpacity={0.25}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
    </ChartErrorBoundary>
  )
}

/* ====================================================================
   9. TRADE VOLUME BAR CHART — per state
   ==================================================================== */
export function TradeVolumeChart({ states = [] }) {
  const data = useMemo(
    () =>
      states
        .filter((s) => s.alive !== false)
        .map((s) => ({
          state: s.state,
          executed: s.executed_trades || 0,
          pending: (s.total_orders || 0) - (s.executed_trades || 0),
          volume: Math.round(s.trade_volume || 0),
        })),
    [states],
  )
  if (!data.length) return <p className="chart-empty">Run analysis to see trade volume</p>

  return (
    <ChartErrorBoundary>
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} barCategoryGap="18%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
        <XAxis dataKey="state" stroke="#64748b" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
        <Tooltip content={<GlassTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.72rem' }} iconSize={8} />
        <Bar dataKey="executed" name="Executed Trades" fill="#10b981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="pending" name="Pending Orders" fill="#f87171" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
    </ChartErrorBoundary>
  )
}

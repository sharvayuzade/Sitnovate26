import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions, ActivityIndicator, TextInput, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from './src/config';
import Svg, { Path, Circle, Text as SvgText, G } from 'react-native-svg';
import { geoMercator, geoPath } from 'd3-geo';

const { width } = Dimensions.get('window');

const MOCK_SIMULATION_DATA = {
  summary: {
    total_states: 10,
    total_data_points: 10000,
    avg_welfare_index: 72.8,
    dominant_strategy: 'Balanced Growth',
  },
  strategy_mix: {
    'Balanced Growth': 4,
    'Export Push': 2,
    'Green Transition': 2,
    'Welfare First': 2,
  },
  resilience_ranking: [
    { state: 'Maharashtra', resilience_score: 86.2 },
    { state: 'Karnataka', resilience_score: 83.7 },
    { state: 'Tamil Nadu', resilience_score: 81.9 },
    { state: 'Gujarat', resilience_score: 79.8 },
    { state: 'Telangana', resilience_score: 78.1 },
  ],
  states: [
    { state: 'Maharashtra', grade: 'S', resilience_score: 86.2, welfare_index: 78.6, avg_gdp_growth: 9.2, trade_efficiency: 0.89, strategy: 'Balanced Growth', net_migration: 162000, inequality_index: 0.34 },
    { state: 'Karnataka', grade: 'A', resilience_score: 83.7, welfare_index: 76.8, avg_gdp_growth: 8.7, trade_efficiency: 0.86, strategy: 'Export Push', net_migration: 138000, inequality_index: 0.33 },
    { state: 'Tamil Nadu', grade: 'A', resilience_score: 81.9, welfare_index: 75.4, avg_gdp_growth: 8.4, trade_efficiency: 0.84, strategy: 'Balanced Growth', net_migration: 119000, inequality_index: 0.32 },
    { state: 'Gujarat', grade: 'A', resilience_score: 79.8, welfare_index: 73.6, avg_gdp_growth: 8.1, trade_efficiency: 0.87, strategy: 'Export Push', net_migration: 103000, inequality_index: 0.35 },
    { state: 'Telangana', grade: 'B', resilience_score: 78.1, welfare_index: 72.7, avg_gdp_growth: 7.9, trade_efficiency: 0.81, strategy: 'Green Transition', net_migration: 94000, inequality_index: 0.31 },
    { state: 'Delhi', grade: 'B', resilience_score: 76.4, welfare_index: 74.1, avg_gdp_growth: 7.5, trade_efficiency: 0.8, strategy: 'Welfare First', net_migration: 88000, inequality_index: 0.36 },
    { state: 'West Bengal', grade: 'B', resilience_score: 74.9, welfare_index: 70.8, avg_gdp_growth: 7.1, trade_efficiency: 0.77, strategy: 'Balanced Growth', net_migration: 61000, inequality_index: 0.34 },
    { state: 'Rajasthan', grade: 'C', resilience_score: 72.2, welfare_index: 69.3, avg_gdp_growth: 6.8, trade_efficiency: 0.74, strategy: 'Green Transition', net_migration: 42000, inequality_index: 0.37 },
    { state: 'Uttar Pradesh', grade: 'C', resilience_score: 69.8, welfare_index: 66.5, avg_gdp_growth: 6.4, trade_efficiency: 0.71, strategy: 'Welfare First', net_migration: 15000, inequality_index: 0.39 },
    { state: 'Bihar', grade: 'D', resilience_score: 64.6, welfare_index: 62.1, avg_gdp_growth: 5.8, trade_efficiency: 0.65, strategy: 'Balanced Growth', net_migration: -12000, inequality_index: 0.41 },
  ],
};

const INDIA_GEO_URL =
  'https://gist.githubusercontent.com/jbrobst/56c13bbbf9d97d187fea01ca62ea5112/raw/e388c4cae20aa53cb5090210a42ebb9b765c0a36/india_states.geojson';

const TRACKED_STATES = new Set([
  'Rajasthan',
  'Gujarat',
  'Uttar Pradesh',
  'Maharashtra',
  'West Bengal',
  'Bihar',
  'Karnataka',
  'Tamil Nadu',
  'Telangana',
  'Delhi',
]);

function geoNameToDataset(geoName) {
  const map = {
    Rajasthan: 'Rajasthan',
    Gujarat: 'Gujarat',
    'Uttar Pradesh': 'Uttar Pradesh',
    Maharashtra: 'Maharashtra',
    'West Bengal': 'West Bengal',
    Bihar: 'Bihar',
    Karnataka: 'Karnataka',
    'Tamil Nadu': 'Tamil Nadu',
    Telangana: 'Telangana',
    Delhi: 'Delhi',
    'NCT of Delhi': 'Delhi',
  };
  return map[geoName] || null;
}

/* ───────────────────── SPLASH SCREEN ───────────────────── */
function SplashView({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [slide, setSlide] = useState(0);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const SLIDES = [
    'Initializing planetary neural mesh…',
    'Mapping resource flow tensors…',
    'Calibrating autonomous state agents…',
    'Launching India Resource Nexus',
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 1000, useNativeDriver: false }),
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: false }),
    ]).start();
    const start = Date.now();
    const dur = 5000;
    const pt = setInterval(() => {
      const p = Math.min(((Date.now() - start) / dur) * 100, 100);
      setProgress(p);
      if (p >= 100) { clearInterval(pt); onDone(); }
    }, 50);
    const st = setInterval(() => setSlide(p => (p + 1) % SLIDES.length), 1500);
    return () => { clearInterval(pt); clearInterval(st); };
  }, []);

  return (
    <View style={s.splashWrap}>
      {/* Stars */}
      {Array.from({ length: 50 }).map((_, i) => (
        <View key={i} style={[s.star, {
          left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          width: 1 + Math.random() * 2, height: 1 + Math.random() * 2,
          opacity: 0.3 + Math.random() * 0.7,
        }]} />
      ))}
      <Animated.View style={{ opacity: fadeIn, transform: [{ scale }], alignItems: 'center' }}>
        <Text style={{ fontSize: 72, marginBottom: 8 }}>🌍</Text>
        <Text style={s.splashTag}>INDIA RESOURCE NEXUS</Text>
        <Text style={s.splashTitle}>Planetary Strategy{'\n'}Intelligence</Text>
        <Text style={s.splashSlide}>{SLIDES[slide]}</Text>
      </Animated.View>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress}%` }]} />
      </View>
      <TouchableOpacity style={s.skipBtn} onPress={onDone}>
        <Text style={s.skipText}>Skip →</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ───────────────────── DASHBOARD TAB ───────────────────── */
function DashboardTab({ onSimulationData }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [seed, setSeed] = useState('42');

  const runSim = async () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      setData(MOCK_SIMULATION_DATA);
      onSimulationData(MOCK_SIMULATION_DATA);
      setLoading(false);
    }, 700);
  };

  return (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.sectionTitle}>🚀 Simulation Dashboard</Text>
      <Text style={s.desc}>Run the WorldSim engine on your Indian state dataset (10,000 rows, 10 states, 120 ticks).</Text>

      <View style={s.heroCard}>
        <Text style={s.heroTitle}>Mobile Control Center</Text>
        <Text style={s.heroSub}>Launch simulation, monitor resilience, and inspect state agents from one screen.</Text>
        <View style={s.heroStats}>
          <View style={s.heroStatPill}><Text style={s.heroStatLabel}>States</Text><Text style={s.heroStatValue}>{data?.summary?.total_states || 10}</Text></View>
          <View style={s.heroStatPill}><Text style={s.heroStatLabel}>Ticks</Text><Text style={s.heroStatValue}>120</Text></View>
          <View style={s.heroStatPill}><Text style={s.heroStatLabel}>Agents</Text><Text style={s.heroStatValue}>{data?.states?.length || 0}</Text></View>
        </View>
      </View>

      <IndiaMiniMap states={data?.states} />

      <View style={s.card}>
        <Text style={s.cardLabel}>Seed</Text>
        <TextInput style={s.input} value={seed} onChangeText={setSeed} keyboardType="numeric" placeholderTextColor={COLORS.textMuted} />
        <TouchableOpacity style={[s.btn, loading && { opacity: 0.5 }]} onPress={runSim} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.btnText}>▶  Launch Simulation</Text>}
        </TouchableOpacity>
      </View>

      {error && <View style={s.errorBox}><Text style={s.errorText}>⚠  {error}</Text></View>}

      {data && (
        <>
          {/* KPI Cards */}
          <Text style={s.sectionTitle}>📊 Key Performance Indicators</Text>
          <View style={s.kpiRow}>
            <KPI label="States" value={data.summary?.total_states || '—'} icon="🏛️" />
            <KPI label="Data Points" value={data.summary?.total_data_points?.toLocaleString() || '—'} icon="📈" />
          </View>
          <View style={s.kpiRow}>
            <KPI label="Avg Welfare" value={data.summary?.avg_welfare_index?.toFixed(2) || '—'} icon="❤️" />
            <KPI label="Top Strategy" value={data.summary?.dominant_strategy || '—'} icon="🎯" />
          </View>

          {/* Resilience Ranking */}
          <Text style={s.sectionTitle}>🏆 Resilience Ranking</Text>
          {data.resilience_ranking?.slice(0, 5).map((r, i) => (
            <View key={i} style={s.rankRow}>
              <Text style={s.rankNum}>#{i + 1}</Text>
              <Text style={s.rankState}>{r.state}</Text>
              <View style={s.rankBar}>
                <View style={[s.rankFill, { width: `${(r.resilience_score / 100) * 100}%` }]} />
              </View>
              <Text style={s.rankScore}>{r.resilience_score?.toFixed(1)}</Text>
            </View>
          ))}

          {/* Strategy Mix */}
          <Text style={s.sectionTitle}>🎯 Strategy Mix</Text>
          {data.strategy_mix && Object.entries(data.strategy_mix).map(([strat, count]) => (
            <View key={strat} style={s.stratRow}>
              <View style={s.stratDot} />
              <Text style={s.stratName}>{strat}</Text>
              <Text style={s.stratCount}>{count} states</Text>
            </View>
          ))}

          {/* State Table */}
          <Text style={s.sectionTitle}>📋 State Breakdown</Text>
          {data.states?.map((st, i) => (
            <View key={i} style={s.stateCard}>
              <View style={s.stateHeader}>
                <Text style={s.stateName}>{st.state}</Text>
                <View style={[s.gradeBadge, { backgroundColor: gradeColor(st.grade) }]}>
                  <Text style={s.gradeText}>{st.grade}</Text>
                </View>
              </View>
              <View style={s.metricRow}>
                <Metric label="Welfare" val={st.welfare_index?.toFixed(2)} />
                <Metric label="GDP Growth" val={st.avg_gdp_growth?.toFixed(2) + '%'} />
                <Metric label="Trade Eff." val={st.trade_efficiency?.toFixed(2)} />
              </View>
              <Text style={s.stratTag}>Strategy: {st.strategy}</Text>
            </View>
          ))}
        </>
      )}

      {!data && !loading && (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 40 }]}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🌐</Text>
          <Text style={[s.desc, { textAlign: 'center' }]}>Press "Launch Simulation" to begin.{'\n'}Demo dashboard data will load instantly.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function KPI({ label, value, icon }) {
  return (
    <View style={s.kpiCard}>
      <Text style={{ fontSize: 24, marginBottom: 4 }}>{icon}</Text>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

function IndiaMiniMap({ states }) {
  const mapStates = states?.length ? states : MOCK_SIMULATION_DATA.states;
  const [geoData, setGeoData] = useState(null);
  const [hoveredStateName, setHoveredStateName] = useState('');

  useEffect(() => {
    let ignore = false;
    fetch(INDIA_GEO_URL)
      .then((response) => response.json())
      .then((json) => {
        if (!ignore) setGeoData(json);
      })
      .catch(() => {
        if (!ignore) setGeoData(null);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const stateMap = useMemo(() => {
    const mapped = {};
    for (const state of mapStates) {
      mapped[state.state] = state;
    }
    return mapped;
  }, [mapStates]);

  const geoShapes = useMemo(() => {
    if (!geoData?.features?.length) return [];
    const projection = geoMercator();
    projection.fitSize([320, 330], geoData);
    const pathBuilder = geoPath(projection);

    return geoData.features
      .map((feature) => {
        const geoName = feature?.properties?.ST_NM || feature?.properties?.st_nm || '';
        const datasetName = geoNameToDataset(geoName);
        const stateData = datasetName ? stateMap[datasetName] : null;
        const isTracked = datasetName ? TRACKED_STATES.has(datasetName) : false;
        const path = pathBuilder(feature);
        if (!path) return null;
        return {
          key: `${geoName}-${feature?.id || ''}`,
          path,
          geoName,
          stateData,
          isTracked,
          centroid: pathBuilder.centroid(feature),
        };
      })
      .filter(Boolean);
  }, [geoData, stateMap]);

  const hoveredState = hoveredStateName ? stateMap[hoveredStateName] : null;

  return (
    <View style={s.mapCard}>
      <View style={s.mapHeaderRow}>
        <Text style={s.cardLabel}>India Agent Map</Text>
        <Text style={s.mapHint}>Web-style state boundaries</Text>
      </View>

      <View style={s.mapWrap}>
        {!geoShapes.length ? (
          <View style={{ paddingVertical: 18, alignItems: 'center' }}>
            <Text style={s.mapHint}>Loading map geometry…</Text>
          </View>
        ) : (
          <Svg width="100%" height="230" viewBox="0 0 320 330">
            {geoShapes.map((shape) => {
              const wRaw = shape.stateData?.welfare_index ?? 0;
              const welfare = wRaw > 1 ? wRaw / 100 : wRaw;
              let fill = 'rgba(100,116,139,0.12)';
              if (shape.stateData) {
                if (welfare >= 0.8) fill = '#76b900';
                else if (welfare >= 0.6) fill = '#00d4aa';
                else if (welfare >= 0.4) fill = '#facc15';
                else fill = '#f97316';
              }

              return (
                <Path
                  key={shape.key}
                  d={shape.path}
                  fill={fill}
                  stroke={shape.isTracked ? 'rgba(148,163,184,0.55)' : 'rgba(148,163,184,0.2)'}
                  strokeWidth={shape.isTracked ? 0.7 : 0.4}
                  onPress={() => {
                    const name = geoNameToDataset(shape.geoName);
                    if (name) setHoveredStateName(name);
                  }}
                />
              );
            })}

            {geoShapes
              .filter((shape) => shape.stateData)
              .map((shape) => (
                <G key={`${shape.key}-label`}>
                  <Circle cx={shape.centroid[0]} cy={shape.centroid[1]} r="2.4" fill="#0a0a0a" opacity="0.75" />
                  <SvgText x={shape.centroid[0] + 4} y={shape.centroid[1] + 3} fill="#d4d4d4" fontSize="6.4" fontWeight="700">
                    {shape.stateData.state}
                  </SvgText>
                </G>
              ))}
          </Svg>
        )}

        {!!hoveredState && (
          <View style={s.mapHoverCard}>
            <Text style={s.mapHoverTitle}>{hoveredState.state}</Text>
            <Text style={s.mapHoverText}>Welfare: {(hoveredState.welfare_index ?? 0).toFixed(2)}</Text>
            <Text style={s.mapHoverText}>GDP Growth: {(hoveredState.avg_gdp_growth ?? 0).toFixed(1)}%</Text>
            <Text style={s.mapHoverText}>Strategy: {hoveredState.strategy || '—'}</Text>
          </View>
        )}
      </View>

      <View style={s.mapLegendRow}>
        <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#76b900' }]} /><Text style={s.legendText}>≥ 0.8</Text></View>
        <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#00d4aa' }]} /><Text style={s.legendText}>≥ 0.6</Text></View>
        <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#facc15' }]} /><Text style={s.legendText}>≥ 0.4</Text></View>
        <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#f97316' }]} /><Text style={s.legendText}>{'< 0.4'}</Text></View>
      </View>
    </View>
  );
}

function Metric({ label, val }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={s.metricVal}>{val}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function gradeColor(g) {
  const m = { S: '#76b900', A: '#00d4aa', B: '#4488cc', C: '#ffab00', D: '#ff4444' };
  return m[g] || '#666';
}

/* ───────────────────── AGENTS TAB ───────────────────── */
function AgentsTab({ simulationData, onSimulationData }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAgents = async () => {
    setLoading(true);
    setError('');
    setTimeout(() => {
      onSimulationData(MOCK_SIMULATION_DATA);
      setLoading(false);
    }, 500);
  };

  const states = simulationData?.states || [];

  return (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.sectionTitle}>🧠 Agent Evaluation</Text>
      <Text style={s.desc}>State agents ka live performance yaha dikhega: grade, resilience, welfare, trade efficiency, strategy.</Text>

      <View style={s.card}>
        <Text style={s.cardLabel}>Agent Data</Text>
        <Text style={s.desc}>Frontend demo simulation source active.</Text>
        <TouchableOpacity style={[s.btn, loading && { opacity: 0.5 }]} onPress={loadAgents} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.btnText}>🔄 Load Agent Data</Text>}
        </TouchableOpacity>
        {error ? <Text style={[s.errorText, { marginTop: 10 }]}>⚠  {error}</Text> : null}
      </View>

      {!states.length && !loading ? (
        <View style={s.card}>
          <Text style={s.desc}>Abhi agent data empty hai. "Load Agent Data" press karo ya Dashboard me simulation run karo.</Text>
        </View>
      ) : null}

      {states.map((agent, idx) => (
        <View key={`${agent.state}-${idx}`} style={s.agentCard}>
          <View style={s.agentHeader}>
            <Text style={s.stateName}>{agent.state}</Text>
            <View style={[s.gradeBadge, { backgroundColor: gradeColor(agent.grade) }]}>
              <Text style={s.gradeText}>{agent.grade}</Text>
            </View>
          </View>

          <View style={s.agentMetaRow}>
            <Text style={s.agentMetaText}>Migration: {agent.net_migration || 0}</Text>
            <Text style={s.agentMetaText}>Inequality: {agent.inequality_index?.toFixed?.(2) ?? '0.00'}</Text>
          </View>

          <View style={s.metricRow}>
            <Metric label="Resilience" val={agent.resilience_score?.toFixed(1)} />
            <Metric label="Welfare" val={agent.welfare_index?.toFixed(2)} />
            <Metric label="Trade Eff." val={agent.trade_efficiency?.toFixed(2)} />
          </View>

          <View style={s.agentBarTrack}>
            <View style={[s.agentBarFill, { width: `${Math.max(0, Math.min(100, agent.resilience_score || 0))}%` }]} />
          </View>
          <Text style={s.stratTag}>Strategy: {agent.strategy}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

/* ───────────────────── AI TAB ───────────────────── */
function AITab({ simulationData }) {
  const [model, setModel] = useState('gemma3:4b');
  const [briefing, setBriefing] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const runAnalysis = async () => {
    setAnalyzing(true); setBriefing('');
    const simData = simulationData || MOCK_SIMULATION_DATA;
    const topState = simData?.resilience_ranking?.[0]?.state || 'Maharashtra';
    const avgWelfare = simData?.summary?.avg_welfare_index || 72.8;
    const domStrategy = simData?.summary?.dominant_strategy || 'Balanced Growth';
    const alertState = simData?.states?.find((st) => (st.grade || '').toUpperCase() === 'D')?.state || 'Bihar';

    const localBriefing = [
      `Model: ${model} (Demo Frontend Mode)`,
      `National welfare trend remains stable at ${avgWelfare.toFixed(1)} with ${domStrategy} emerging as the dominant policy mix.`,
      `${topState} is currently leading the resilience index and can be used as a benchmark governance profile.`,
      `Priority intervention should focus on ${alertState} through targeted welfare buffers, trade corridor expansion, and migration balancing.`,
      'Recommendation: maintain balanced growth in top states while deploying corrective social and infra packages in low-grade clusters.',
    ].join('\n\n');

    setTimeout(() => {
      setBriefing(localBriefing);
      setAnalyzing(false);
    }, 850);
  };

  return (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.sectionTitle}>🤖 AI Strategic Advisor</Text>
      <Text style={s.desc}>Frontend-only AI briefing generator for hackathon presentation mode.</Text>

      <View style={s.card}>
        <Text style={s.cardLabel}>AI Mode</Text>
        <Text style={s.desc}>Local briefing synthesis active. No backend/database dependency.</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>Model</Text>
        <TextInput style={s.input} value={model} onChangeText={setModel} placeholderTextColor={COLORS.textMuted} />
        <TouchableOpacity style={[s.btn, analyzing && { opacity: 0.5 }]} onPress={runAnalysis} disabled={analyzing}>
          {analyzing ? <ActivityIndicator color="#000" size="small" /> : <Text style={s.btnText}>🧠 Generate Strategic Briefing</Text>}
        </TouchableOpacity>
      </View>

      {briefing ? (
        <View style={s.card}>
          <Text style={s.cardLabel}>AI Briefing</Text>
          <Text style={s.briefingText}>{briefing}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

/* ───────────────────── SETTINGS TAB ───────────────────── */
function SettingsTab() {

  return (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.sectionTitle}>⚙️ Settings & Status</Text>

      <View style={s.card}>
        <Text style={s.cardLabel}>Mode</Text>
        <Text style={s.desc}>Frontend Only Demo Mode</Text>
        <View style={s.statusGrid}>
          <StatusRow label="Backend" ok={false} detail="Disabled" />
          <StatusRow label="Database" ok={false} detail="Disabled" />
          <StatusRow label="Demo Data" ok={true} detail="Active" />
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>About</Text>
        <Text style={s.desc}>WorldSim — India Resource Nexus</Text>
        <Text style={s.desc}>10-state autonomous agent simulation</Text>
        <Text style={s.desc}>Built for SITnovate '26 Hackathon</Text>
        <Text style={[s.desc, { color: COLORS.accent, marginTop: 8 }]}>Version 1.0.0</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>Setup Instructions</Text>
        <Text style={s.code}>1. Open app in Expo Go{'\n\n'}2. Tap Launch Simulation (loads local demo data){'\n\n'}3. Use Agents + AI tabs for presentation flow{'\n\n'}4. No backend/database needed</Text>
      </View>
    </ScrollView>
  );
}

function StatusRow({ label, ok, detail }) {
  return (
    <View style={s.statusRow}>
      <Text style={{ color: ok ? COLORS.success : COLORS.danger, fontSize: 16, width: 24 }}>{ok ? '●' : '○'}</Text>
      <Text style={s.statusLabel}>{label}</Text>
      {detail && <Text style={s.statusDetail}>{detail}</Text>}
    </View>
  );
}

/* ───────────────────── MAIN APP ───────────────────── */
const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'agents', label: 'Agents', icon: '🧠' },
  { key: 'ai', label: 'AI', icon: '🤖' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [simulationData, setSimulationData] = useState(null);

  if (showSplash) return <SplashView onDone={() => setShowSplash(false)} />;

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerIcon}>🌍</Text>
          <View>
            <Text style={s.headerTitle}>WorldSim</Text>
            <Text style={s.headerSub}>India Resource Nexus</Text>
          </View>
        </View>
        <View style={s.headerBadge}>
          <Text style={s.headerBadgeText}>{activeTab.toUpperCase()}</Text>
        </View>
      </View>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab onSimulationData={setSimulationData} />}
      {activeTab === 'agents' && <AgentsTab simulationData={simulationData} onSimulationData={setSimulationData} />}
      {activeTab === 'ai' && <AITab simulationData={simulationData} />}
      {activeTab === 'settings' && <SettingsTab />}

      {/* Bottom Tab Bar */}
      <View style={s.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[s.tab, activeTab === t.key && s.tabActive]} onPress={() => setActiveTab(t.key)}>
            <Text style={[s.tabIcon, activeTab === t.key && s.tabIconActive]}>{t.icon}</Text>
            <Text style={[s.tabLabel, activeTab === t.key && s.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ───────────────────── STYLES ───────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'web' ? 16 : 50, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { fontSize: 28, marginRight: 12 },
  headerTitle: { color: COLORS.accent, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  headerSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },
  headerBadge: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: COLORS.accentDim, borderRadius: 99, borderWidth: 1, borderColor: COLORS.cardBorder },
  headerBadgeText: { color: COLORS.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  /* Tab Bar */
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.cardBorder, paddingBottom: Platform.OS === 'web' ? 10 : 22, paddingTop: 8, paddingHorizontal: 6 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, marginHorizontal: 2 },
  tabActive: { backgroundColor: COLORS.accentDim },
  tabIcon: { fontSize: 20, opacity: 0.5, marginBottom: 3 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700' },
  tabLabelActive: { color: COLORS.accent },

  /* Content */
  tabContent: { flex: 1, paddingHorizontal: 12, paddingTop: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  desc: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 8 },

  /* Hero */
  heroCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.cardBorder },
  heroTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  heroSub: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  heroStats: { flexDirection: 'row', gap: 6 },
  heroStatPill: { flex: 1, backgroundColor: COLORS.card, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  heroStatLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700' },
  heroStatValue: { color: COLORS.accent, fontSize: 15, fontWeight: '800', marginTop: 2 },

  /* India Map */
  mapCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.cardBorder },
  mapHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mapHint: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  mapWrap: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, paddingTop: 6, paddingHorizontal: 4, paddingBottom: 8 },
  mapLegendRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  mapHoverCard: { marginTop: 6, backgroundColor: 'rgba(10,10,10,0.7)', borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 8, padding: 8 },
  mapHoverTitle: { color: COLORS.accent, fontSize: 12, fontWeight: '800', marginBottom: 2 },
  mapHoverText: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 16 },

  /* Card */
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.cardBorder },
  cardLabel: { color: COLORS.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },

  /* Input */
  input: { backgroundColor: COLORS.bg, borderRadius: 8, padding: 12, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: 12 },

  /* Buttons */
  btn: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  btnOutline: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 12 },
  btnOutlineText: { color: COLORS.accent, fontWeight: '600', fontSize: 13 },

  /* Error */
  errorBox: { backgroundColor: 'rgba(255,68,68,0.1)', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.danger },
  errorText: { color: COLORS.danger, fontSize: 13 },

  /* KPI */
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  kpiCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  kpiValue: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: 2 },
  kpiLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },

  /* Ranking */
  rankRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  rankNum: { color: COLORS.accent, fontWeight: '800', fontSize: 14, width: 30 },
  rankState: { color: COLORS.text, fontWeight: '600', fontSize: 12, width: 96 },
  rankBar: { flex: 1, height: 8, backgroundColor: COLORS.bg, borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  rankFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 4 },
  rankScore: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', width: 36, textAlign: 'right' },

  /* Strategy */
  stratRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingHorizontal: 4 },
  stratDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginRight: 10 },
  stratName: { color: COLORS.text, fontSize: 13, fontWeight: '600', flex: 1 },
  stratCount: { color: COLORS.textMuted, fontSize: 12 },

  /* State Card */
  stateCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.cardBorder },
  stateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  stateName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  gradeBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  gradeText: { color: '#000', fontWeight: '800', fontSize: 13 },
  metricRow: { flexDirection: 'row', marginBottom: 8 },
  metricVal: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  metricLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  stratTag: { color: COLORS.accentSecondary, fontSize: 12, fontWeight: '600' },

  /* Agents */
  agentCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.cardBorder },
  agentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  agentMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  agentMetaText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  agentBarTrack: { width: '100%', height: 8, borderRadius: 99, backgroundColor: COLORS.bg, marginTop: 2, marginBottom: 8, overflow: 'hidden' },
  agentBarFill: { height: '100%', backgroundColor: COLORS.accent },

  /* AI */
  statusBox: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 8 },
  briefingText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },

  /* Settings */
  statusGrid: { marginTop: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statusLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginLeft: 8, flex: 1 },
  statusDetail: { color: COLORS.textMuted, fontSize: 12 },
  code: { color: COLORS.accent, fontSize: 12, fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', lineHeight: 20, backgroundColor: COLORS.bg, padding: 12, borderRadius: 8 },

  /* Splash */
  splashWrap: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  star: { position: 'absolute', backgroundColor: '#fff', borderRadius: 1 },
  splashTag: { color: COLORS.accent, fontSize: 12, fontWeight: '800', letterSpacing: 3, marginBottom: 6 },
  splashTitle: { color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', lineHeight: 36, marginBottom: 16 },
  splashSlide: { color: COLORS.textSecondary, fontSize: 13, fontStyle: 'italic', height: 20 },
  progressTrack: { position: 'absolute', bottom: 60, left: 40, right: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 2 },
  skipBtn: { position: 'absolute', bottom: 80, right: 30 },
  skipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
});

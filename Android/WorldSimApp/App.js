import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions, ActivityIndicator, TextInput, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, API_BASE } from './src/config';

const { width } = Dimensions.get('window');

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
function DashboardTab({ apiBase, onSimulationData }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [seed, setSeed] = useState('42');

  const runSim = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${apiBase}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: parseInt(seed) || 42, tick_start: 1, tick_end: 120 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      setData(payload);
      onSimulationData(payload);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.sectionTitle}>🚀 Simulation Dashboard</Text>
      <Text style={s.desc}>Run the WorldSim engine on your Indian state dataset (10,000 rows, 10 states, 120 ticks).</Text>

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
          <Text style={[s.desc, { textAlign: 'center' }]}>Press "Launch Simulation" to begin.{'\n'}Make sure the FastAPI backend is running on port 8000.</Text>
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
function AgentsTab({ apiBase, simulationData, onSimulationData }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAgents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: 42, tick_start: 1, tick_end: 120 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      onSimulationData(payload);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const states = simulationData?.states || [];

  return (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.sectionTitle}>🧠 Agent Evaluation</Text>
      <Text style={s.desc}>State agents ka live performance yaha dikhega: grade, resilience, welfare, trade efficiency, strategy.</Text>

      <View style={s.card}>
        <Text style={s.cardLabel}>Agent Source</Text>
        <Text style={s.desc}>Backend: {apiBase}</Text>
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
function AITab({ apiBase, simulationData }) {
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const [model, setModel] = useState('gemma3:4b');
  const [briefing, setBriefing] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const checkOllama = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${apiBase}/api/ollama/status`);
      const d = await res.json();
      setStatus(d);
    } catch (e) { setStatus({ status: 'error', message: e.message }); }
    setChecking(false);
  };

  const runAnalysis = async () => {
    setAnalyzing(true); setBriefing('');
    try {
      const simData = simulationData || await (async () => {
        const simRes = await fetch(`${apiBase}/api/simulate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seed: 42, tick_start: 1, tick_end: 120 }),
        });
        return simRes.json();
      })();

      const aiRes = await fetch(`${apiBase}/api/ollama/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, summary: simData.summary, state_table: simData.states }),
      });
      const aiData = await aiRes.json();
      setBriefing(aiData.briefing || 'No response');
    } catch (e) { setBriefing('Error: ' + e.message); }
    setAnalyzing(false);
  };

  return (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.sectionTitle}>🤖 AI Strategic Advisor</Text>
      <Text style={s.desc}>Connect to Ollama for AI-powered geopolitical analysis of simulation results.</Text>

      <View style={s.card}>
        <Text style={s.cardLabel}>Ollama Status</Text>
        <TouchableOpacity style={s.btnOutline} onPress={checkOllama} disabled={checking}>
          <Text style={s.btnOutlineText}>{checking ? 'Checking…' : '🔍 Check Connection'}</Text>
        </TouchableOpacity>
        {status && (
          <View style={[s.statusBox, { borderColor: status.status === 'connected' ? COLORS.success : COLORS.danger }]}>
            <Text style={{ color: status.status === 'connected' ? COLORS.success : COLORS.danger, fontWeight: '700' }}>
              {status.status === 'connected' ? '✅ Connected' : '❌ ' + (status.message || 'Disconnected')}
            </Text>
          </View>
        )}
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
function SettingsTab({ apiBase, onChangeApiBase }) {
  const [health, setHealth] = useState(null);
  const [apiInput, setApiInput] = useState(apiBase);

  useEffect(() => {
    setApiInput(apiBase);
  }, [apiBase]);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${apiBase}/api/health`);
      setHealth(await res.json());
    } catch (e) { setHealth({ error: e.message }); }
  };

  useEffect(() => { checkHealth(); }, []);

  return (
    <ScrollView style={s.tabContent} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={s.sectionTitle}>⚙️ Settings & Status</Text>

      <View style={s.card}>
        <Text style={s.cardLabel}>Backend Status</Text>
        <Text style={s.desc}>API: {apiBase}</Text>
        <TextInput
          style={s.input}
          value={apiInput}
          onChangeText={setApiInput}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="http://192.168.x.x:8000"
          placeholderTextColor={COLORS.textMuted}
        />
        <TouchableOpacity
          style={s.btnOutline}
          onPress={() => onChangeApiBase(apiInput.trim() || apiBase)}
        >
          <Text style={s.btnOutlineText}>📡 Save Mobile Backend URL</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnOutline} onPress={checkHealth}>
          <Text style={s.btnOutlineText}>🔄 Refresh</Text>
        </TouchableOpacity>
        {health && !health.error && (
          <View style={s.statusGrid}>
            <StatusRow label="API" ok={true} />
            <StatusRow label="Ollama" ok={health.ollama === 'connected'} />
            <StatusRow label="Dataset" ok={!!health.dataset_rows} detail={`${health.dataset_rows} rows`} />
          </View>
        )}
        {health?.error && <Text style={s.errorText}>⚠  {health.error}</Text>}
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
        <Text style={s.code}>1. Start backend:{'\n'}   python -m uvicorn worldsim_api:app --host 0.0.0.0 --port 8000{'\n\n'}2. Phone + laptop same WiFi pe rakho{'\n\n'}3. Settings me API URL set karo:{'\n'}   http://YOUR_LAPTOP_IP:8000{'\n\n'}4. Expo Go me QR scan karke run karo</Text>
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
  const [apiBase, setApiBase] = useState(API_BASE);
  const [simulationData, setSimulationData] = useState(null);

  if (showSplash) return <SplashView onDone={() => setShowSplash(false)} />;

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerIcon}>🌍</Text>
        <View>
          <Text style={s.headerTitle}>WorldSim</Text>
          <Text style={s.headerSub}>India Resource Nexus</Text>
        </View>
      </View>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab apiBase={apiBase} onSimulationData={setSimulationData} />}
      {activeTab === 'agents' && <AgentsTab apiBase={apiBase} simulationData={simulationData} onSimulationData={setSimulationData} />}
      {activeTab === 'ai' && <AITab apiBase={apiBase} simulationData={simulationData} />}
      {activeTab === 'settings' && <SettingsTab apiBase={apiBase} onChangeApiBase={setApiBase} />}

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
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'web' ? 16 : 50, paddingBottom: 12, paddingHorizontal: 20, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  headerIcon: { fontSize: 28, marginRight: 12 },
  headerTitle: { color: COLORS.accent, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  headerSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },

  /* Tab Bar */
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.cardBorder, paddingBottom: Platform.OS === 'web' ? 8 : 24, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabActive: {},
  tabIcon: { fontSize: 20, opacity: 0.4, marginBottom: 2 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  tabLabelActive: { color: COLORS.accent },

  /* Content */
  tabContent: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  desc: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 8 },

  /* Card */
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.cardBorder },
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
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  kpiValue: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: 2 },
  kpiLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },

  /* Ranking */
  rankRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  rankNum: { color: COLORS.accent, fontWeight: '800', fontSize: 14, width: 30 },
  rankState: { color: COLORS.text, fontWeight: '600', fontSize: 13, width: 110 },
  rankBar: { flex: 1, height: 8, backgroundColor: COLORS.bg, borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  rankFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 4 },
  rankScore: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', width: 36, textAlign: 'right' },

  /* Strategy */
  stratRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingHorizontal: 4 },
  stratDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginRight: 10 },
  stratName: { color: COLORS.text, fontSize: 13, fontWeight: '600', flex: 1 },
  stratCount: { color: COLORS.textMuted, fontSize: 12 },

  /* State Card */
  stateCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.cardBorder },
  stateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  stateName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  gradeBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  gradeText: { color: '#000', fontWeight: '800', fontSize: 13 },
  metricRow: { flexDirection: 'row', marginBottom: 8 },
  metricVal: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  metricLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  stratTag: { color: COLORS.accentSecondary, fontSize: 12, fontWeight: '600' },

  /* Agents */
  agentCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.cardBorder },
  agentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
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

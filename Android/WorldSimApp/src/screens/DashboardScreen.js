import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { COLORS } from '../config';
import api from '../api';

export default function DashboardScreen() {
  const [seed, setSeed] = useState('42');
  const [tickStart, setTickStart] = useState('1');
  const [tickEnd, setTickEnd] = useState('120');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const runSim = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.simulate(
        parseInt(seed) || 42,
        parseInt(tickStart) || 1,
        parseInt(tickEnd) || 120,
      );
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [seed, tickStart, tickEnd]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await runSim();
    setRefreshing(false);
  }, [runSim]);

  const s = result?.summary;
  const healthyCount = s?.healthy_states?.length || 0;
  const criticalCount = s?.critical_states?.length || 0;

  const kpis = s ? [
    { label: 'Healthy States', value: `${healthyCount}/10`, sub: `Critical: ${criticalCount}`, color: COLORS.success },
    { label: 'Total GDP', value: `₹${(s.total_gdp || 0).toLocaleString()}Cr`, sub: `Welfare: ${s.avg_welfare}`, color: COLORS.accent },
    { label: 'Population', value: `${Math.round(s.total_population).toLocaleString()}`, sub: `Inequality: ${s.avg_inequality}`, color: COLORS.accentSecondary },
    { label: 'Trades', value: `${s.total_trades_executed}`, sub: `Rate: ${((s.trade_execution_rate || 0) * 100).toFixed(1)}%`, color: COLORS.blue },
  ] : [];

  const resilience = result?.resilience_ranking?.slice(0, 5) || [];
  const strategyMix = result?.strategy_mix || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandDot} />
          <View>
            <Text style={styles.brandTitle}>India Resource Nexus</Text>
            <Text style={styles.brandSub}>10-State Adaptive Resource Intelligence</Text>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dataset Analysis Control</Text>
        <Text style={styles.cardSub}>10,000-row CSV · 10 states · 120 ticks</Text>
        <View style={styles.controlRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Seed</Text>
            <TextInput style={styles.input} value={seed} onChangeText={setSeed}
              keyboardType="numeric" placeholderTextColor={COLORS.textMuted} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Start</Text>
            <TextInput style={styles.input} value={tickStart} onChangeText={setTickStart}
              keyboardType="numeric" placeholderTextColor={COLORS.textMuted} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>End</Text>
            <TextInput style={styles.input} value={tickEnd} onChangeText={setTickEnd}
              keyboardType="numeric" placeholderTextColor={COLORS.textMuted} />
          </View>
        </View>
        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={runSim} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Launch Analysis</Text>}
        </TouchableOpacity>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* KPIs */}
      {kpis.length > 0 && (
        <View style={styles.kpiGrid}>
          {kpis.map((k, i) => (
            <View key={i} style={styles.kpiCard}>
              <View style={[styles.kpiAccent, { backgroundColor: k.color }]} />
              <Text style={styles.kpiLabel}>{k.label}</Text>
              <Text style={styles.kpiValue}>{k.value}</Text>
              <Text style={styles.kpiSub}>{k.sub}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Strategy Mix */}
      {strategyMix.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Strategy Classification</Text>
          <Text style={styles.cardSub}>Dominant behavioral patterns</Text>
          {strategyMix.map((entry) => (
            <View key={entry.strategy} style={styles.listRow}>
              <Text style={styles.listLabel}>{entry.strategy}</Text>
              <Text style={styles.listValue}>{entry.count} states</Text>
            </View>
          ))}
        </View>
      )}

      {/* Resilience Ranking */}
      {resilience.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resilience Ranking</Text>
          <Text style={styles.cardSub}>Top 5 composite score</Text>
          {resilience.map((r, idx) => (
            <View key={r.state} style={styles.resRow}>
              <View style={styles.resRank}>
                <Text style={styles.resRankText}>#{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resState}>{r.state}</Text>
                <Text style={styles.resTags}>{r.tags?.join(' · ') || '—'}</Text>
              </View>
              <View style={styles.resScoreBadge}>
                <Text style={styles.resScore}>{(r.resilience_score * 100).toFixed(0)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Climate Events */}
      {result?.climate && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Climate Events</Text>
          {Object.entries(result.climate.event_counts || {}).map(([evt, count]) => (
            <View key={evt} style={styles.listRow}>
              <Text style={styles.listLabel}>{evt}</Text>
              <Text style={styles.listValue}>
                {count} ({(result.climate.avg_shock_by_event?.[evt] || 0).toFixed(2)} shock)
              </Text>
            </View>
          ))}
        </View>
      )}

      {!result && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚡</Text>
          <Text style={styles.emptyText}>Tap "Launch Analysis" to load simulation data</Text>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 20 },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent },
  brandTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  brandSub: { color: COLORS.textSecondary, fontSize: 11 },
  card: {
    margin: 12,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardSub: { color: COLORS.textMuted, fontSize: 11, marginBottom: 12 },
  controlRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 8 },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    gap: 8,
    marginTop: 4,
  },
  kpiCard: {
    width: '47%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginLeft: 4,
  },
  kpiAccent: { width: 28, height: 3, borderRadius: 2, marginBottom: 8 },
  kpiLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  kpiValue: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginVertical: 2 },
  kpiSub: { color: COLORS.textSecondary, fontSize: 11 },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  listLabel: { color: COLORS.textSecondary, fontSize: 13 },
  listValue: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  resRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    gap: 10,
  },
  resRank: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resRankText: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
  resState: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  resTags: { color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  resScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.accentDim,
  },
  resScore: { color: COLORS.accent, fontSize: 14, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 13 },
});

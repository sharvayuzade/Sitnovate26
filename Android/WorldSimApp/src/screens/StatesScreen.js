import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { COLORS } from '../config';
import api from '../api';

const STRATEGY_COLORS = {
  'Trade-Heavy': '#00d4aa',
  'Resource-Conservative': '#4488cc',
  'Growth-Focused': '#76b900',
  'Welfare-Priority': '#d4a017',
  'Migration-Attracting': '#cc66ff',
  'Climate-Resilient': '#ff6644',
  'Balanced': '#888',
};

function getGrade(score) {
  if (score >= 0.75) return { g: 'S', c: '#76b900' };
  if (score >= 0.60) return { g: 'A', c: '#00d4aa' };
  if (score >= 0.45) return { g: 'B', c: '#4488cc' };
  if (score >= 0.30) return { g: 'C', c: '#d4a017' };
  return { g: 'D', c: '#ff4444' };
}

export default function StatesScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [expandedState, setExpandedState] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.simulate(42, 1, 120);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const states = result?.states || [];
  const resMap = {};
  (result?.resilience_ranking || []).forEach(r => { resMap[r.state] = r.resilience_score; });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={fetchData} tintColor={COLORS.accent} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>State Agent Evaluation</Text>
        <Text style={styles.headerSub}>Per-state autonomous agent performance metrics</Text>
      </View>

      {states.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>Load state data to view agent evaluations</Text>
          <TouchableOpacity style={styles.loadBtn} onPress={fetchData} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadBtnText}>Load Data</Text>}
          </TouchableOpacity>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      )}

      {states.map((st) => {
        const res = resMap[st.state] ?? 0;
        const { g, c } = getGrade(res);
        const scores = st.scores || {};
        const isExpanded = expandedState === st.state;
        const strategy = st.dominant_strategy || 'Balanced';
        const stratColor = STRATEGY_COLORS[strategy] || '#888';

        return (
          <TouchableOpacity
            key={st.state}
            style={styles.stateCard}
            onPress={() => setExpandedState(isExpanded ? null : st.state)}
            activeOpacity={0.7}
          >
            {/* Header Row */}
            <View style={styles.stateHeader}>
              <View style={[styles.gradeBadge, { backgroundColor: c + '22' }]}>
                <Text style={[styles.gradeText, { color: c }]}>{g}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stateName}>{st.state}</Text>
                <Text style={[styles.strategyLabel, { color: stratColor }]}>{strategy}</Text>
              </View>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreText}>{(res * 100).toFixed(0)}</Text>
                <Text style={styles.scoreLabel}>RES</Text>
              </View>
            </View>

            {/* Quick stats */}
            <View style={styles.quickStats}>
              <View style={styles.quickItem}>
                <Text style={styles.quickVal}>{Math.round(st.population || 0).toLocaleString()}</Text>
                <Text style={styles.quickLabel}>Pop</Text>
              </View>
              <View style={styles.quickItem}>
                <Text style={[styles.quickVal, { color: (st.gdp_growth_rate || 0) < 0 ? COLORS.danger : COLORS.success }]}>
                  {(st.gdp_growth_rate || 0).toFixed(1)}%
                </Text>
                <Text style={styles.quickLabel}>GDP Growth</Text>
              </View>
              <View style={styles.quickItem}>
                <Text style={styles.quickVal}>{(st.welfare_index || 0).toFixed(3)}</Text>
                <Text style={styles.quickLabel}>Welfare</Text>
              </View>
              <View style={styles.quickItem}>
                <Text style={styles.quickVal}>{st.climate_event || '—'}</Text>
                <Text style={styles.quickLabel}>Climate</Text>
              </View>
            </View>

            {/* Expanded detail */}
            {isExpanded && (
              <View style={styles.expanded}>
                <View style={styles.divider} />
                {[
                  { label: 'GDP Growth', val: `${(scores.avg_gdp_growth || 0).toFixed(1)}%`, pct: Math.min((scores.avg_gdp_growth || 0) / 15, 1) },
                  { label: 'Welfare', val: (scores.avg_welfare || 0).toFixed(3), pct: scores.avg_welfare || 0 },
                  { label: 'Trade Efficiency', val: `${((scores.trade_execution_rate || 0) * 100).toFixed(1)}%`, pct: scores.trade_execution_rate || 0 },
                  { label: 'Resource Surplus', val: `${(scores.resource_surplus_ratio || 0).toFixed(2)}×`, pct: Math.min((scores.resource_surplus_ratio || 0) / 2, 1) },
                  { label: 'Inequality', val: (scores.avg_inequality || 0).toFixed(3), pct: 1 - (scores.avg_inequality || 0) },
                  { label: 'Net Migration', val: (scores.net_migration || 0).toLocaleString(), pct: Math.min(Math.max((scores.net_migration || 0) / 500, 0), 1) },
                ].map(m => (
                  <View key={m.label} style={styles.metricRow}>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.max(m.pct * 100, 2)}%`, backgroundColor: `hsl(${m.pct * 120}, 70%, 45%)` }]} />
                    </View>
                    <Text style={styles.metricVal}>{m.val}</Text>
                  </View>
                ))}
                {(st.strategy_tags || []).length > 0 && (
                  <View style={styles.tagsRow}>
                    {st.strategy_tags.map(t => (
                      <View key={t} style={[styles.tag, { borderColor: STRATEGY_COLORS[t] || '#555' }]}>
                        <Text style={styles.tagText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.resourceGrid}>
                  <Text style={styles.resourceTitle}>Resources (Supply)</Text>
                  <View style={styles.resourceRow}>
                    <Text style={styles.resourceItem}>💧 {Math.round(st.water_supply || 0)}</Text>
                    <Text style={styles.resourceItem}>🍞 {Math.round(st.food_supply || 0)}</Text>
                    <Text style={styles.resourceItem}>⚡ {Math.round(st.energy_supply || 0)}</Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={styles.expandHint}>{isExpanded ? '▲ Collapse' : '▼ Tap for details'}</Text>
          </TouchableOpacity>
        );
      })}

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
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  headerSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 13, marginBottom: 16 },
  loadBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  loadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 12 },
  stateCard: {
    margin: 10,
    marginBottom: 4,
    padding: 14,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  stateHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gradeBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: { fontSize: 16, fontWeight: '800' },
  stateName: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  strategyLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  scoreCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { color: COLORS.accent, fontSize: 14, fontWeight: '800', lineHeight: 16 },
  scoreLabel: { color: COLORS.textMuted, fontSize: 7, fontWeight: '600', letterSpacing: 0.5 },
  quickStats: { flexDirection: 'row', marginTop: 10, gap: 4 },
  quickItem: { flex: 1, alignItems: 'center' },
  quickVal: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  quickLabel: { color: COLORS.textMuted, fontSize: 8, marginTop: 1, textTransform: 'uppercase' },
  expanded: { marginTop: 10 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 10 },
  metricRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  metricLabel: { color: COLORS.textSecondary, fontSize: 11, width: 100 },
  barTrack: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  metricVal: { color: COLORS.text, fontSize: 11, fontWeight: '600', width: 55, textAlign: 'right' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  tagText: { color: COLORS.textSecondary, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.3 },
  resourceGrid: { marginTop: 10 },
  resourceTitle: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  resourceRow: { flexDirection: 'row', gap: 14 },
  resourceItem: { color: COLORS.textSecondary, fontSize: 12 },
  expandHint: { color: COLORS.textMuted, fontSize: 9, textAlign: 'center', marginTop: 8 },
});

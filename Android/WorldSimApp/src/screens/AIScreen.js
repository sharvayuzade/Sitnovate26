import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { COLORS } from '../config';
import api from '../api';

export default function AIScreen() {
  const [model, setModel] = useState('gemma3:4b');
  const [ollamaOk, setOllamaOk] = useState(false);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [ollamaError, setOllamaError] = useState('');
  const [checkingOllama, setCheckingOllama] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const checkOllama = useCallback(async () => {
    setCheckingOllama(true);
    try {
      const data = await api.ollamaStatus();
      setOllamaOk(!!data.ok);
      setOllamaModels(data.models || []);
      setOllamaError(data.error || '');
      if (data.models?.length && !model) setModel(data.models[0]);
    } catch (e) {
      setOllamaOk(false);
      setOllamaError(e.message);
    } finally {
      setCheckingOllama(false);
    }
  }, [model]);

  useEffect(() => { checkOllama(); }, []);

  const runSim = useCallback(async () => {
    setSimLoading(true);
    setError('');
    try {
      const data = await api.simulate(42, 1, 120);
      setSimResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSimLoading(false);
    }
  }, []);

  const generateInsight = useCallback(async () => {
    if (!simResult) { setError('Run analysis first.'); return; }
    if (!ollamaOk) { setError('Ollama is offline.'); return; }
    setAiLoading(true);
    setError('');
    try {
      const sm = simResult.summary;
      const summaryText = [
        `Tick Range: ${sm.tick_range?.[0] ?? '?'}–${sm.tick_range?.[1] ?? '?'}`,
        `Healthy States: ${sm.healthy_states?.length || 0}/10`,
        `Critical: ${sm.critical_states?.join(', ') || 'None'}`,
        `Population: ${(sm.total_population || 0).toLocaleString()}`,
        `GDP: ₹${sm.total_gdp ?? 0}Cr`,
        `Avg Welfare: ${sm.avg_welfare ?? 0}`,
        `Trades: ${sm.total_trades_executed ?? 0} (${((sm.trade_execution_rate ?? 0) * 100).toFixed(1)}%)`,
      ].join('\n');
      const data = await api.analyze(model, summaryText, simResult.states || []);
      setAiText(data.analysis || 'No analysis returned.');
    } catch (e) {
      setError(e.message);
    } finally {
      setAiLoading(false);
    }
  }, [simResult, ollamaOk, model]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Strategic Analyst</Text>
        <Text style={styles.headerSub}>Local Ollama-powered intelligence briefings</Text>
      </View>

      {/* Ollama Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ollama Connection</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: ollamaOk ? COLORS.success : COLORS.danger }]} />
          <Text style={styles.statusText}>
            {checkingOllama ? 'Checking...' : ollamaOk ? 'Connected' : 'Offline'}
          </Text>
        </View>
        {ollamaModels.length > 0 && (
          <Text style={styles.modelsText}>Models: {ollamaModels.join(', ')}</Text>
        )}
        {!!ollamaError && <Text style={styles.errorSmall}>{ollamaError}</Text>}
        <TouchableOpacity style={styles.btnOutline} onPress={checkOllama} disabled={checkingOllama}>
          <Text style={styles.btnOutlineText}>{checkingOllama ? 'Checking...' : 'Refresh Status'}</Text>
        </TouchableOpacity>
      </View>

      {/* Model input */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Model Configuration</Text>
        <Text style={styles.inputLabel}>Model Name</Text>
        <TextInput
          style={styles.input}
          value={model}
          onChangeText={setModel}
          placeholder="e.g. gemma3:4b"
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      {/* Data Loading */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Simulation Data</Text>
        <Text style={styles.cardSub}>
          {simResult ? `✓ Loaded — ${simResult.states?.length || 0} states, tick ${simResult.summary?.tick_range?.[0]}–${simResult.summary?.tick_range?.[1]}` : 'No data loaded yet'}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={runSim} disabled={simLoading}>
          {simLoading ? <ActivityIndicator color="#fff" size="small" /> : (
            <Text style={styles.btnText}>{simResult ? 'Reload Data' : 'Load Simulation'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Generate Insight */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Generate Strategic Briefing</Text>
        <TouchableOpacity
          style={[styles.btnAccent, (!simResult || !ollamaOk || aiLoading) && styles.btnDisabled]}
          onPress={generateInsight}
          disabled={!simResult || !ollamaOk || aiLoading}
        >
          {aiLoading ? <ActivityIndicator color="#fff" size="small" /> : (
            <Text style={styles.btnAccentText}>⚡ Generate AI Insight</Text>
          )}
        </TouchableOpacity>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* AI Output */}
      {!!aiText && (
        <View style={styles.aiCard}>
          <Text style={styles.aiCardTitle}>Strategic Briefing</Text>
          <View style={styles.aiDivider} />
          <Text style={styles.aiText}>{aiText}</Text>
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
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  headerSub: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  card: {
    margin: 12,
    marginBottom: 4,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardSub: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  modelsText: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 8 },
  errorSmall: { color: COLORS.danger, fontSize: 10, marginBottom: 8 },
  inputLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  btn: {
    backgroundColor: COLORS.blue,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnOutline: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnOutlineText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 12 },
  btnAccent: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnAccentText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.4 },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 8 },
  aiCard: {
    margin: 12,
    padding: 16,
    backgroundColor: '#0d1a0d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(118,185,0,0.2)',
  },
  aiCardTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  aiDivider: { height: 1, backgroundColor: 'rgba(118,185,0,0.15)', marginVertical: 10 },
  aiText: { color: COLORS.text, fontSize: 13, lineHeight: 20 },
});

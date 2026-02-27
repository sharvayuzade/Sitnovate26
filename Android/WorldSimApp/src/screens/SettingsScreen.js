import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS, API_BASE } from '../config';
import api from '../api';

export default function SettingsScreen() {
  const [healthData, setHealthData] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const data = await api.health();
      setHealthData(data);
    } catch (e) {
      setHealthData({ ok: false, error: e.message });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { checkHealth(); }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings & Status</Text>
        <Text style={styles.headerSub}>Backend connectivity and app configuration</Text>
      </View>

      {/* App Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>India Resource Nexus</Text>
        <Text style={styles.cardSub}>Mobile Companion App</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Platform</Text>
          <Text style={styles.infoValue}>React Native (Expo)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>API Endpoint</Text>
          <Text style={styles.infoValue}>{API_BASE}</Text>
        </View>
      </View>

      {/* Backend Health */}
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>Backend Health</Text>
          <TouchableOpacity onPress={checkHealth} disabled={checking}>
            <Text style={styles.refreshText}>{checking ? '⟳' : '↻ Refresh'}</Text>
          </TouchableOpacity>
        </View>
        {checking && !healthData && <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 20 }} />}
        {healthData && (
          <>
            <View style={styles.statusBanner}>
              <View style={[styles.statusDot, { backgroundColor: healthData.ok ? COLORS.success : COLORS.danger }]} />
              <Text style={[styles.statusBannerText, { color: healthData.ok ? COLORS.success : COLORS.danger }]}>
                {healthData.ok ? 'API Online' : 'API Offline'}
              </Text>
            </View>
            {healthData.ok && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Service</Text>
                  <Text style={styles.infoValue}>{healthData.service || '—'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>API Version</Text>
                  <Text style={styles.infoValue}>{healthData.version || '—'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Dataset</Text>
                  <Text style={styles.infoValue}>{healthData.dataset || '—'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>States</Text>
                  <Text style={styles.infoValue}>{healthData.states || '—'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Ticks</Text>
                  <Text style={styles.infoValue}>{healthData.ticks || '—'}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Ollama Server</Text>
                  <View style={styles.statusInline}>
                    <View style={[styles.statusDotSm, { backgroundColor: healthData.ollama_server_reachable ? COLORS.success : COLORS.danger }]} />
                    <Text style={styles.infoValue}>
                      {healthData.ollama_server_reachable ? 'Reachable' : 'Unreachable'}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>MongoDB</Text>
                  <View style={styles.statusInline}>
                    <View style={[styles.statusDotSm, { backgroundColor: healthData.mongo_connected ? COLORS.success : COLORS.warning }]} />
                    <Text style={styles.infoValue}>
                      {healthData.mongo_connected ? 'Connected' : 'Not connected'}
                    </Text>
                  </View>
                </View>
              </>
            )}
            {healthData.error && <Text style={styles.errorText}>{healthData.error}</Text>}
          </>
        )}
      </View>

      {/* Instructions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Setup Instructions</Text>
        <Text style={styles.instructions}>
          1. Start FastAPI backend:{'\n'}
          {'   '}uvicorn worldsim_api:app --host 0.0.0.0{'\n\n'}
          2. For local Ollama AI:{'\n'}
          {'   '}ollama serve{'\n'}
          {'   '}ollama pull gemma3:4b{'\n\n'}
          3. For MongoDB (optional):{'\n'}
          {'   '}mongod --dbpath ./data{'\n\n'}
          4. If using physical device, update IP in:{'\n'}
          {'   '}src/config.js → API_BASE
        </Text>
      </View>

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
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardSub: { color: COLORS.textMuted, fontSize: 11, marginBottom: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  refreshText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(118,185,0,0.06)',
    marginBottom: 10,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusBannerText: { fontSize: 14, fontWeight: '700' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  infoLabel: { color: COLORS.textSecondary, fontSize: 12 },
  infoValue: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  statusInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDotSm: { width: 6, height: 6, borderRadius: 3 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 6 },
  errorText: { color: COLORS.danger, fontSize: 11, marginTop: 8 },
  instructions: { color: COLORS.textSecondary, fontSize: 11.5, lineHeight: 19, fontFamily: 'monospace' },
});

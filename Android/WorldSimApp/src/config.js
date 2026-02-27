import { Platform } from 'react-native';

// API Configuration — point to the same FastAPI backend
// Android emulator: 10.0.2.2 | Web/iOS: localhost | Physical device: your LAN IP
export const API_BASE = Platform.select({
  android: 'http://10.0.2.2:8000',
  web: 'http://127.0.0.1:8000',
  default: 'http://127.0.0.1:8000',
});

export const COLORS = {
  bg: '#0a0a0a',
  surface: '#111111',
  card: '#161616',
  cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#76b900',
  accentDim: 'rgba(118,185,0,0.12)',
  accentSecondary: '#00d4aa',
  text: '#f5f5f5',
  textSecondary: '#a3a3a3',
  textMuted: '#6b6b6b',
  danger: '#ff4444',
  success: '#76b900',
  warning: '#ffab00',
  blue: '#4488cc',
};

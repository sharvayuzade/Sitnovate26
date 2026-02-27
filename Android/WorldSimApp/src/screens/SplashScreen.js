import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity,
} from 'react-native';
import { COLORS } from '../config';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  'Initializing planetary neural mesh...',
  'Mapping resource flow tensors...',
  'Calibrating autonomous state agents...',
  'Launching India Resource Nexus',
];

export default function SplashScreen({ navigation }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const startTime = useRef(Date.now());
  const DURATION = 8000;

  useEffect(() => {
    // Fade in + scale globe
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.timing(textFade, { toValue: 1, duration: 1500, delay: 600, useNativeDriver: true }),
    ]).start();

    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Slide text rotation
    const slideT = setInterval(() => setSlideIdx(p => (p + 1) % SLIDES.length), 1800);
    // Progress bar
    const progT = setInterval(() => {
      setProgress(Math.min(((Date.now() - startTime.current) / DURATION) * 100, 100));
    }, 50);
    // Auto-navigate
    const navT = setTimeout(() => navigation.replace('Main'), DURATION);

    return () => { clearInterval(slideT); clearInterval(progT); clearTimeout(navT); };
  }, []);

  return (
    <View style={styles.container}>
      {/* Stars */}
      {Array.from({ length: 60 }).map((_, i) => (
        <View key={i} style={[styles.star, {
          left: Math.random() * width,
          top: Math.random() * height,
          width: 1 + Math.random() * 2,
          height: 1 + Math.random() * 2,
          opacity: 0.3 + Math.random() * 0.7,
        }]} />
      ))}

      {/* Globe representation */}
      <Animated.View style={[styles.globeContainer, {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }]}>
        <Animated.View style={[styles.globeGlow, {
          opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.4] }),
        }]} />
        <View style={styles.globe}>
          <View style={styles.globeInner}>
            <Text style={styles.globeEmoji}>🌍</Text>
          </View>
          {/* Grid lines */}
          {[-30, 0, 30].map(deg => (
            <View key={`h${deg}`} style={[styles.gridLineH, { top: `${50 + deg}%` }]} />
          ))}
          {[-30, 0, 30].map(deg => (
            <View key={`v${deg}`} style={[styles.gridLineV, { left: `${50 + deg}%` }]} />
          ))}
        </View>
      </Animated.View>

      {/* Text */}
      <Animated.View style={[styles.textContainer, { opacity: textFade }]}>
        <Text style={styles.tag}>India Resource Nexus</Text>
        <Text style={styles.title}>Planetary Strategy{'\n'}Intelligence</Text>
        <Text style={styles.slide} key={slideIdx}>{SLIDES[slideIdx]}</Text>
      </Animated.View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.replace('Main')}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  globeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  globeGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.accent,
  },
  globe: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#0c3d7a',
    borderWidth: 2,
    borderColor: 'rgba(100,180,255,0.3)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  globeInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  globeEmoji: {
    fontSize: 80,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(100,180,255,0.12)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(100,180,255,0.12)',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  tag: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  slide: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    minHeight: 20,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  progressFill: {
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 1.5,
  },
  skipBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(18,18,18,0.7)',
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});

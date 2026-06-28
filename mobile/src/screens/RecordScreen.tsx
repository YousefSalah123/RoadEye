import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCameraPermissions, useMicrophonePermissions, CameraView } from 'expo-camera';
import {
  Eye, MapPin, Navigation, Play, Square, ChevronRight, Satellite, Timer, Gauge,
} from 'lucide-react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';
import { InfoBanner } from '../components/InfoBanner';
import { LocationPoint, GPSLogPoint, getCurrentLocationPoint, requestLocationPermissions } from '../services/locationSync';
import { saveTripCSV, saveTripVideo, saveTripMetaJSON, saveGpsLogJSON, TripMeta } from '../utils/fileManager';
import { getProfile } from '../services/profile';

type Phase = 'setup' | 'dashcam';

const RecordScreen = () => {
  // ─── Phase management ───
  const [phase, setPhase] = useState<Phase>('setup');

  // ─── Trip setup form ───
  const [driverName, setDriverName] = useState('');
  const [region, setRegion] = useState('');
  const [streetName, setStreetName] = useState('');

  // ─── Permissions ───
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [hasLocationPerm, setHasLocationPerm] = useState(false);

  // ─── Recording state ───
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [hasGps, setHasGps] = useState(false);
  const [saved, setSaved] = useState(false);

  const cameraRef = useRef<any>(null);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pointsRef = useRef<LocationPoint[]>([]);
  const gpsLogRef = useRef<GPSLogPoint[]>([]);
  const startTimeRef = useRef<number>(0);

  // ─── Load profile defaults ───
  useEffect(() => {
    (async () => {
      const p = await getProfile();
      if (p.driverName) setDriverName(p.driverName);
      if (p.region) setRegion(p.region);
      if (p.defaultStreet) setStreetName(p.defaultStreet);
    })();
  }, []);

  // ─── Request perms when entering dashcam ───
  useEffect(() => {
    if (phase === 'dashcam') {
      (async () => {
        if (!cameraPermission?.granted) await requestCameraPermission();
        if (!micPermission?.granted) await requestMicPermission();
        const loc = await requestLocationPermissions();
        setHasLocationPerm(loc);
      })();
    }
  }, [phase]);

  // ─── Cleanup on blur ───
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (isRecording) stopRecording();
      };
    }, [isRecording])
  );

  // ─── Recording Logic ───
  const startRecording = async () => {
    if (!cameraRef.current) return;
    setSaved(false);
    setIsRecording(true);
    setDuration(0);
    pointsRef.current = [];
    gpsLogRef.current = [];
    startTimeRef.current = Date.now();

    cameraRef.current.recordAsync().then(async (result: any) => {
      if (result?.uri) await processAndSave(result.uri);
    });

    timerIntervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);

    gpsIntervalRef.current = setInterval(async () => {
      const pt = await getCurrentLocationPoint();
      if (pt) {
        pointsRef.current.push(pt);
        // Build time_offset_sec-indexed GPS point for backend pipeline
        const timeOffsetSec = (Date.now() - startTimeRef.current) / 1000;
        gpsLogRef.current.push({
          time_offset_sec: parseFloat(timeOffsetSec.toFixed(1)),
          lat: pt.latitude,
          lng: pt.longitude,
        });
        setCurrentSpeed(pt.speed);
        setHasGps(true);
      } else {
        setHasGps(false);
      }
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    cameraRef.current?.stopRecording();
  };

  const processAndSave = async (videoUri: string) => {
    try {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const base = `trip_${ts}`;
      const meta: TripMeta = { driverName, region, streetName };

      if (pointsRef.current.length > 0) {
        saveTripCSV(pointsRef.current, base + '.csv', meta);
      }
      // Save GPS log in JSON format for backend upload
      if (gpsLogRef.current.length > 0) {
        saveGpsLogJSON(gpsLogRef.current, base + '.gps.json');
      }
      saveTripVideo(videoUri, base + '.mp4');
      saveTripMetaJSON(base + '.json', {
        ...meta,
        duration,
        pointCount: pointsRef.current.length,
        createdAt: now.toISOString(),
      });
      setSaved(true);
    } catch (e) {
      console.error('Save failed:', e);
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  };

  // ═══════════════════════════════════════════
  // PHASE 1 — Trip Setup Form
  // ═══════════════════════════════════════════
  if (phase === 'setup') {
    return (
      <View style={styles.screen}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.formHeader}>
              <View style={styles.logoBadge}>
                <Eye size={22} color={Colors.white} />
              </View>
              <Text style={styles.formTitle}>New Trip Setup</Text>
            </View>

            <InfoBanner text="Fill in the details below before recording. This info will be included in your upload to the backend." />

            {/* Form Fields */}
            <Text style={styles.label}>Driver Name</Text>
            <TextInput
              style={styles.input}
              value={driverName}
              onChangeText={setDriverName}
              placeholder="e.g. Ahmed Ali"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Region / City</Text>
            <TextInput
              style={styles.input}
              value={region}
              onChangeText={setRegion}
              placeholder="e.g. Cairo, Giza"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Street Name</Text>
            <TextInput
              style={styles.input}
              value={streetName}
              onChangeText={setStreetName}
              placeholder="e.g. El-Nasr Road"
              placeholderTextColor={Colors.textMuted}
            />

            {/* Start Button */}
            <TouchableOpacity
              style={[styles.startBtn, (!driverName || !streetName) && styles.startBtnDisabled]}
              onPress={() => setPhase('dashcam')}
              disabled={!driverName || !streetName}
              activeOpacity={0.8}
            >
              <Navigation size={20} color={Colors.white} />
              <Text style={styles.startBtnText}>Open Dashcam</Text>
              <ChevronRight size={18} color={Colors.white} />
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ═══════════════════════════════════════════
  // PHASE 2 — Dashcam UI
  // ═══════════════════════════════════════════
  const permissionsReady = cameraPermission?.granted && micPermission?.granted && hasLocationPerm;

  if (!permissionsReady) {
    return (
      <View style={styles.permScreen}>
        <Satellite size={48} color={Colors.warning} />
        <Text style={styles.permTitle}>Permissions Required</Text>
        <Text style={styles.permSub}>Camera, Microphone, and Location access are needed.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={async () => {
          await requestCameraPermission();
          await requestMicPermission();
          const l = await requestLocationPermissions();
          setHasLocationPerm(l);
        }}>
          <Text style={styles.permBtnText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.dashScreen}>
      {/* Camera fills the screen */}
      <CameraView style={StyleSheet.absoluteFillObject} ref={cameraRef} mode="video" facing="back" />

      {/* Dark overlay for contrast */}
      <View style={styles.overlay} />

      {/* Watermark */}
      <View style={styles.watermark}>
        <Eye size={14} color={Colors.white + '60'} />
        <Text style={styles.watermarkText}>RoadEye Pro</Text>
      </View>

      {/* Top HUD */}
      <View style={styles.hud}>
        <View style={styles.hudPill}>
          <View style={[styles.gpsDot, { backgroundColor: hasGps ? Colors.success : Colors.danger }]} />
          <Satellite size={14} color={hasGps ? Colors.success : Colors.danger} />
          <Text style={[styles.hudText, { color: hasGps ? Colors.success : Colors.danger }]}>
            {hasGps ? 'GPS ACTIVE' : 'SEARCHING'}
          </Text>
        </View>

        {isRecording && (
          <View style={[styles.hudPill, { borderColor: Colors.danger + '60' }]}>
            <View style={[styles.gpsDot, { backgroundColor: Colors.danger, opacity: duration % 2 === 0 ? 1 : 0.4 }]} />
            <Timer size={14} color={Colors.danger} />
            <Text style={[styles.hudText, { color: Colors.danger }]}>{fmt(duration)}</Text>
          </View>
        )}
      </View>

      {/* Trip Info Pill */}
      <View style={styles.tripPill}>
        <MapPin size={12} color={Colors.primaryLight} />
        <Text style={styles.tripPillText} numberOfLines={1}>{streetName} — {region}</Text>
      </View>

      {/* Speedometer */}
      <View style={styles.speedo}>
        <Gauge size={20} color={Colors.textMuted} />
        <Text style={styles.speedVal}>{Math.round(currentSpeed * 3.6)}</Text>
        <Text style={styles.speedUnit}>km/h</Text>
      </View>

      {/* Saved Toast */}
      {saved && (
        <View style={styles.savedToast}>
          <Text style={styles.savedToastText}>✅ Trip saved! Check History.</Text>
        </View>
      )}

      {/* Bottom Record/Stop Button */}
      <View style={styles.bottomBar}>
        {!isRecording && (
          <TouchableOpacity style={styles.backBtn} onPress={() => { setPhase('setup'); setSaved(false); }}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.recBtnOuter}
          onPress={isRecording ? stopRecording : startRecording}
          activeOpacity={0.75}
        >
          <View style={isRecording ? styles.recBtnStop : styles.recBtnStart}>
            {isRecording ? (
              <Square size={28} color={Colors.white} fill={Colors.white} />
            ) : (
              <Play size={32} color={Colors.white} fill={Colors.white} style={{ marginLeft: 4 }} />
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.recLabel}>{isRecording ? 'TAP TO STOP' : 'TAP TO RECORD'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ── Setup Form ──
  screen: { flex: 1, backgroundColor: Colors.bg },
  formScroll: { padding: Spacing.xl, paddingTop: 60, paddingBottom: 40 },
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  logoBadge: {
    width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  formTitle: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginTop: Spacing.lg },
  input: {
    backgroundColor: Colors.bgCard, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, color: Colors.text, fontSize: FontSize.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
  },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.success, borderRadius: Radius.lg, paddingVertical: 16,
    marginTop: Spacing.xxxl,
  },
  startBtnDisabled: { backgroundColor: Colors.surfaceLight },
  startBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '800', marginHorizontal: Spacing.sm },

  // ── Permissions ──
  permScreen: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: 40 },
  permTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700', marginTop: Spacing.lg },
  permSub: { color: Colors.textMuted, fontSize: FontSize.md, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl },
  permBtn: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: Radius.lg },
  permBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },

  // ── Dashcam ──
  dashScreen: { flex: 1, backgroundColor: Colors.black },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  watermark: {
    position: 'absolute', top: 60, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', opacity: 0.5,
  },
  watermarkText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '600', marginLeft: 4 },
  hud: {
    position: 'absolute', top: 85, left: Spacing.xl, right: Spacing.xl,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  hudPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  gpsDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  hudText: { fontSize: FontSize.sm, fontWeight: '700', marginLeft: 4 },
  tripPill: {
    position: 'absolute', top: 130, alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full,
  },
  tripPillText: { color: Colors.primaryLight, fontSize: FontSize.xs, fontWeight: '600', marginLeft: 4, maxWidth: 220 },
  speedo: {
    position: 'absolute', bottom: 220, alignSelf: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 30, paddingVertical: 16, borderRadius: Radius.xxl,
    borderWidth: 1, borderColor: Colors.border,
  },
  speedVal: { color: Colors.text, fontSize: 56, fontWeight: '800', marginTop: 4 },
  speedUnit: { color: Colors.textMuted, fontSize: FontSize.md },
  savedToast: {
    position: 'absolute', bottom: 180, alignSelf: 'center',
    backgroundColor: Colors.successGhost, borderWidth: 1, borderColor: Colors.success + '40',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.full,
  },
  savedToastText: { color: Colors.success, fontWeight: '700', fontSize: FontSize.sm },
  bottomBar: { position: 'absolute', bottom: 40, alignSelf: 'center', alignItems: 'center' },
  backBtn: {
    position: 'absolute', bottom: 10, left: -120, backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.lg,
  },
  backBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: FontSize.sm },
  recBtnOuter: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 5, borderColor: Colors.white,
    justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)',
  },
  recBtnStart: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.recording,
    justifyContent: 'center', alignItems: 'center',
  },
  recBtnStop: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.dangerDark,
    justifyContent: 'center', alignItems: 'center',
  },
  recLabel: {
    color: Colors.white, fontSize: FontSize.lg, fontWeight: '800', marginTop: 14,
    letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
});

export default RecordScreen;

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { apiRequest } from '@/lib/query-client';
import { useAuth } from '@/contexts/AuthContext';

type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

export default function StudentScanScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [message, setMessage] = useState('');
  const [scanned, setScanned] = useState(false);

  const pulseAnim = React.useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const markMutation = useMutation({
    mutationFn: (body: { qrToken: string; latitude: number; longitude: number }) =>
      apiRequest('POST', '/api/attendance', body).then((r) => r.json()),
    onSuccess: (data: { message: string }) => {
      setScanState('success');
      setMessage(data.message || 'Attendance marked!');
      qc.invalidateQueries({ queryKey: ['/api/attendance/my'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: any) => {
      setScanState('error');
      const raw = e.message ?? 'Failed to mark attendance';
      setMessage(raw.replace(/^\d+: /, ''));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleBarcodeScan = useCallback(
    async ({ data: qrToken }: { data: string }) => {
      if (scanned || scanState === 'processing') return;
      setScanned(true);
      setScanState('processing');

      try {
        let lat = 19.076;
        let lon = 72.8777;

        if (!locationPermission?.granted) {
          await requestLocationPermission();
        }

        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
        } catch {
          // Use default for web/simulator
        }

        markMutation.mutate({ qrToken, latitude: lat, longitude: lon });
      } catch (e: any) {
        setScanState('error');
        setMessage('Could not get location: ' + e.message);
      }
    },
    [scanned, scanState, locationPermission, markMutation]
  );

  const handleReset = () => {
    setScanned(false);
    setScanState('scanning');
    setMessage('');
  };

  const handleStartScan = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) return;
    }
    setScanState('scanning');
  };

  if (!cameraPermission) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <Text style={styles.headerSub}>Mark your attendance</Text>
      </LinearGradient>

      <View style={styles.body}>
        {scanState === 'idle' && (
          <View style={styles.idleContainer}>
            <View style={styles.idleIcon}>
              <Ionicons name="qr-code-outline" size={64} color={Colors.accent} />
            </View>
            <Text style={styles.idleTitle}>Ready to Scan</Text>
            <Text style={styles.idleText}>
              When your teacher starts a session, tap below to open the scanner and scan the QR code.
            </Text>

            <View style={styles.requirementsCard}>
              <Text style={styles.reqTitle}>Requirements</Text>
              <View style={styles.reqRow}>
                <Ionicons name="location" size={16} color={Colors.accent} />
                <Text style={styles.reqText}>Must be within 100m of your teacher</Text>
              </View>
              <View style={styles.reqRow}>
                <Ionicons name="time" size={16} color={Colors.accent} />
                <Text style={styles.reqText}>Scan within 60 seconds of session start</Text>
              </View>
              <View style={styles.reqRow}>
                <Ionicons name="school" size={16} color={Colors.accent} />
                <Text style={styles.reqText}>Session must match your class ({user?.class})</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={handleStartScan} activeOpacity={0.85}>
              <Ionicons name="camera" size={20} color={Colors.white} />
              <Text style={styles.startBtnText}>Open Scanner</Text>
            </TouchableOpacity>
          </View>
        )}

        {scanState === 'scanning' && (
          <View style={styles.scannerContainer}>
            {Platform.OS === 'web' ? (
              <View style={styles.webCameraFallback}>
                <Ionicons name="camera-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.webCameraText}>Camera not available on web</Text>
                <Text style={styles.webCameraSubText}>Please use the mobile app to scan QR codes</Text>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setScanState('idle')}>
                  <Text style={styles.cancelBtnText}>Go Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  onBarcodeScanned={handleBarcodeScan}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                />
                <View style={styles.overlay}>
                  <View style={styles.overlayTop} />
                  <View style={styles.overlayMiddle}>
                    <View style={styles.overlaySide} />
                    <Animated.View
                      style={[styles.scanFrame, { transform: [{ scale: pulseAnim }] }]}
                    >
                      <View style={[styles.corner, styles.topLeft]} />
                      <View style={[styles.corner, styles.topRight]} />
                      <View style={[styles.corner, styles.bottomLeft]} />
                      <View style={[styles.corner, styles.bottomRight]} />
                    </Animated.View>
                    <View style={styles.overlaySide} />
                  </View>
                  <View style={styles.overlayBottom}>
                    <Text style={styles.scanHint}>Point camera at the QR code</Text>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setScanState('idle')}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {scanState === 'processing' && (
          <View style={styles.resultContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.processingText}>Verifying attendance…</Text>
            <Text style={styles.processingSubText}>Checking QR code, location, and session validity</Text>
          </View>
        )}

        {scanState === 'success' && (
          <View style={styles.resultContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>Attendance Marked!</Text>
            <Text style={styles.resultMessage}>{message}</Text>
            <View style={styles.successCard}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
              <Text style={styles.successCardText}>
                Your presence has been recorded for this session.
              </Text>
            </View>
          </View>
        )}

        {scanState === 'error' && (
          <View style={styles.resultContainer}>
            <View style={styles.errorIcon}>
              <Ionicons name="close-circle" size={80} color={Colors.error} />
            </View>
            <Text style={styles.errorTitle}>Could Not Mark Attendance</Text>
            <Text style={styles.resultMessage}>{message}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleReset} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color={Colors.white} />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={() => setScanState('idle')}>
              <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.white },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  body: { flex: 1 },

  idleContainer: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  idleIcon: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: Colors.accentPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  idleTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, color: Colors.text, marginBottom: 10 },
  idleText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  requirementsCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  reqTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: Colors.text, marginBottom: 4 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reqText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, flex: 1 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    height: 54,
    width: '100%',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  startBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.white },

  scannerContainer: { flex: 1, position: 'relative' },
  webCameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  webCameraText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
  webCameraSubText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddle: { flexDirection: 'row', height: 250 },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.white,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
    gap: 12,
  },
  scanHint: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.white },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.white },

  resultContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  processingText: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text, marginTop: 16 },
  processingSubText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.success, marginBottom: 8 },
  resultMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.successPale,
    borderRadius: 14,
    padding: 16,
    width: '100%',
  },
  successCardText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.success, flex: 1 },
  errorIcon: { marginBottom: 16 },
  errorTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.error, marginBottom: 8, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginBottom: 12,
  },
  retryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.white },
  backBtn: { padding: 10 },
  backBtnText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.textMuted },
});

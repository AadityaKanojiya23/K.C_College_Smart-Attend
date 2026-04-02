import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import Colors from '@/constants/colors';
import { apiRequest } from '@/lib/query-client';
import { useAuth } from '@/contexts/AuthContext';

interface Session {
  id: string;
  class: string;
  subject: string;
  qrToken: string;
  isActive: boolean; 
  createdAt: string;
  expiryTime: string;
}
  
const SESSION_DURATION = 60;

export default function TeacherSessionScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [session, setSession] = useState<Session | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [locError, setLocError] = useState('');
  const [permissionStatus, requestPermission] = Location.useForegroundPermissions();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (session && timeLeft > 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [session, timeLeft]);

  useEffect(() => {
    if (session && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setSession(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session]);

  const startMutation = useMutation({
    mutationFn: (coords: { latitude: number; longitude: number }) =>
      apiRequest('POST', '/api/sessions', coords).then((r) => r.json()),
    onSuccess: (data: { session: Session }) => {
      setSession(data.session);
      setTimeLeft(SESSION_DURATION);
      qc.invalidateQueries({ queryKey: ['/api/sessions/my'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: any) => {
      setLocError(e.message ?? 'Failed to create session');
    },
  });

  const handleStartSession = async () => {
    setLocError('');
    setIsStarting(true);

    try {
      let lat = 19.076;
      let lon = 72.8777;

      if (!permissionStatus?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          setLocError('Location permission is required to start a session');
          setIsStarting(false);
          return;
        }
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

      startMutation.mutate({ latitude: lat, longitude: lon });
    } catch (e: any) {
      setLocError('Location error: ' + e.message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSession(null);
    setTimeLeft(0);
    qc.invalidateQueries({ queryKey: ['/api/sessions/my'] });
  };

  const progress = timeLeft / SESSION_DURATION;
  const isExpiringSoon = timeLeft <= 15;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Text style={styles.headerTitle}>Attendance Session</Text>
        <Text style={styles.headerSub}>
          {user?.subject} • Class {user?.class}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        {!session ? (
          <View style={styles.startContainer}>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color={Colors.accent} style={{ marginBottom: 8 }} />
              <Text style={styles.infoTitle}>How it works</Text>
              <View style={styles.infoStep}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                <Text style={styles.stepText}>Your GPS location is captured</Text>
              </View>
              <View style={styles.infoStep}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                <Text style={styles.stepText}>A unique QR code is generated</Text>
              </View>
              <View style={styles.infoStep}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                <Text style={styles.stepText}>Students scan within 60 seconds</Text>
              </View>
              <View style={styles.infoStep}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>4</Text></View>
                <Text style={styles.stepText}>Only students within 100m are marked</Text>
              </View>
            </View>

            {locError !== '' && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{locError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.startBtn, (isStarting || startMutation.isPending) && styles.startBtnDisabled]}
              onPress={handleStartSession}
              disabled={isStarting || startMutation.isPending}
              activeOpacity={0.85}
            >
              {isStarting || startMutation.isPending ? (
                <>
                  <ActivityIndicator color={Colors.white} />
                  <Text style={styles.startBtnText}>Getting Location…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="qr-code" size={22} color={Colors.white} />
                  <Text style={styles.startBtnText}>Start Attendance</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sessionContainer}>
            <View style={[styles.timerRow, isExpiringSoon && styles.timerRowExpiring]}>
              <Ionicons
                name="time"
                size={18}
                color={isExpiringSoon ? Colors.error : Colors.accent}
              />
              <Text style={[styles.timerText, isExpiringSoon && styles.timerTextExpiring]}>
                {timeLeft}s remaining
              </Text>
              <View style={styles.timerBarContainer}>
                <View style={[styles.timerBar, {
                  width: `${progress * 100}%` as any,
                  backgroundColor: isExpiringSoon ? Colors.error : Colors.success,
                }]} />
              </View>
            </View>

            <Text style={styles.qrLabel}>Students scan this QR code</Text>

            <Animated.View
              style={[styles.qrContainer, { transform: [{ scale: pulseAnim }] }]}
            >
              <QRCode
                value={session.qrToken}
                size={220}
                color={Colors.primary}
                backgroundColor={Colors.white}
              />
            </Animated.View>

            <View style={styles.sessionInfo}>
              <View style={styles.sessionInfoRow}>
                <Ionicons name="book" size={14} color={Colors.textMuted} />
                <Text style={styles.sessionInfoText}>{session.subject}</Text>
              </View>
              <View style={styles.sessionInfoRow}>
                <Ionicons name="school" size={14} color={Colors.textMuted} />
                <Text style={styles.sessionInfoText}>Class {session.class}</Text>
              </View>
            </View>

            <View style={styles.requirementBadge}>
              <Ionicons name="navigate" size={14} color={Colors.warning} />
              <Text style={styles.requirementText}>Students must be within 100m of you</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="stop-circle" size={18} color={Colors.error} />
              <Text style={styles.closeBtnText}>Close Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.white },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  body: { flex: 1 },

  startContainer: { flex: 1, padding: 20, justifyContent: 'center' },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text, marginBottom: 14 },
  infoStep: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accentPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: Colors.accent },
  stepText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary, flex: 1 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorPale,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.error, flex: 1 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    height: 56,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  startBtnDisabled: { opacity: 0.6 },
  startBtnText: { fontFamily: 'Inter_700Bold', fontSize: 17, color: Colors.white },

  sessionContainer: { flex: 1, alignItems: 'center', padding: 20 },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  timerRowExpiring: { backgroundColor: Colors.errorPale },
  timerText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.accent, minWidth: 50 },
  timerTextExpiring: { color: Colors.error },
  timerBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerBar: { height: '100%', borderRadius: 3 },
  qrLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  qrContainer: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 20,
  },
  sessionInfo: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  sessionInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sessionInfoText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  requirementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.warningPale,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 24,
  },
  requirementText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.warning },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.error },
});

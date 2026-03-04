import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

const CAMPUS_LAT = 19.076;
const CAMPUS_LON = 72.8777;
const CAMPUS_RADIUS_M = 300;

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type GpsStatus = 'checking' | 'denied' | 'outside' | 'inside' | 'error';

export default function GpsGateway() {
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading } = useAuth();
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('checking');
  const [distance, setDistance] = useState<number | null>(null);
  const [permissionStatus, requestPermission] = Location.useForegroundPermissions();

  const redirectUser = useCallback(
    (u: typeof user) => {
      if (!u) {
        router.replace('/login');
        return;
      }
      if (u.role === 'admin') router.replace('/(admin)/');
      else if (u.role === 'teacher') router.replace('/(teacher)/');
      else router.replace('/(student)/');
    },
    []
  );

  const checkLocation = useCallback(async () => {
    setGpsStatus('checking');
    try {
      if (!permissionStatus?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          setGpsStatus('denied');
          return;
        }
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const dist = getDistance(
        loc.coords.latitude,
        loc.coords.longitude,
        CAMPUS_LAT,
        CAMPUS_LON
      );
      setDistance(dist);
      if (dist <= CAMPUS_RADIUS_M) {
        setGpsStatus('inside');
        redirectUser(user);
      } else {
        setGpsStatus('outside');
      }
    } catch {
      setGpsStatus('error');
    }
  }, [permissionStatus, user, redirectUser]);

  const bypassForDemo = useCallback(() => {
    setGpsStatus('inside');
    redirectUser(user);
  }, [user, redirectUser]);

  useEffect(() => {
    if (!authLoading) {
      checkLocation();
    }
  }, [authLoading]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  if (authLoading || gpsStatus === 'checking') {
    return (
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.fill}>
        <View style={[styles.centerContent, { paddingTop: topPad }]}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={48} color={Colors.white} />
          </View>
          <Text style={styles.appName}>CampusAttend</Text>
          <ActivityIndicator color={Colors.accentLight} size="large" style={{ marginTop: 32 }} />
          <Text style={styles.checkingText}>Verifying campus location…</Text>
        </View>
      </LinearGradient>
    );
  }

  if (gpsStatus === 'denied') {
    return (
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.fill}>
        <View style={[styles.centerContent, { paddingTop: topPad }]}>
          <View style={[styles.logoCircle, { backgroundColor: Colors.warning + '33' }]}>
            <Ionicons name="location-outline" size={48} color={Colors.warning} />
          </View>
          <Text style={styles.blockedTitle}>Location Required</Text>
          <Text style={styles.blockedSubtitle}>
            CampusAttend needs your location to verify you are on campus. Please enable location
            access.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={checkLocation}>
            <Text style={styles.retryBtnText}>Grant Location Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.demoBtn} onPress={bypassForDemo}>
            <Ionicons name="flask-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.demoBtnText}>Demo Mode (skip GPS)</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  if (gpsStatus === 'outside') {
    return (
      <LinearGradient colors={['#1a0a0a', '#3D0B0B']} style={styles.fill}>
        <View style={[styles.centerContent, { paddingTop: topPad }]}>
          <View style={[styles.logoCircle, { backgroundColor: Colors.error + '22' }]}>
            <Ionicons name="close-circle" size={56} color={Colors.error} />
          </View>
          <Text style={[styles.appName, { marginBottom: 8 }]}>Access Denied</Text>
          <Text style={styles.blockedTitle}>Outside Campus Area</Text>
          <Text style={styles.blockedSubtitle}>
            You must be within{' '}
            <Text style={{ color: Colors.error, fontFamily: 'Inter_600SemiBold' }}>
              {CAMPUS_RADIUS_M}m
            </Text>{' '}
            of campus to use this app.
          </Text>
          {distance !== null && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate" size={14} color={Colors.error} />
              <Text style={styles.distanceText}>
                You are {Math.round(distance)}m away
              </Text>
            </View>
          )}
          <View style={styles.coordBox}>
            <Text style={styles.coordLabel}>Campus Coordinates</Text>
            <Text style={styles.coordText}>
              {CAMPUS_LAT}°N, {CAMPUS_LON}°E
            </Text>
          </View>
          <TouchableOpacity style={styles.retryBtn} onPress={checkLocation}>
            <Ionicons name="refresh" size={16} color={Colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.demoBtn} onPress={bypassForDemo}>
            <Ionicons name="flask-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.demoBtnText}>Demo Mode (skip GPS)</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  if (gpsStatus === 'error') {
    return (
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.fill}>
        <View style={[styles.centerContent, { paddingTop: topPad }]}>
          <View style={[styles.logoCircle, { backgroundColor: Colors.warning + '33' }]}>
            <Ionicons name="warning" size={48} color={Colors.warning} />
          </View>
          <Text style={styles.blockedTitle}>Location Error</Text>
          <Text style={styles.blockedSubtitle}>Could not determine your location. Please check your GPS settings.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={checkLocation}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.demoBtn} onPress={bypassForDemo}>
            <Ionicons name="flask-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.demoBtnText}>Demo Mode (skip GPS)</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(37,99,235,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.white,
    marginBottom: 4,
  },
  checkingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.accentLight,
    marginTop: 12,
  },
  blockedTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  blockedSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: Colors.error,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
  },
  distanceText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.error,
  },
  coordBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
  },
  coordLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  coordText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.white,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  retryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.white,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  demoBtnText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
});

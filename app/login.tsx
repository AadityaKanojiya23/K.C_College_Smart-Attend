import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@campus.edu', password: 'admin123', icon: 'shield' as const },
  { label: 'Teacher', email: 'anita@campus.edu', password: 'teacher123', icon: 'school' as const },
  { label: 'Student', email: 'priya@campus.edu', password: 'student123', icon: 'person' as const },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message?.replace(/^\d+: /, '') || 'Invalid credentials');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (acc: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
    setLoading(true);
    try {
      await login(acc.email, acc.password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message?.replace(/^\d+: /, '') || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <View style={{ paddingTop: topPad + 20 }} />
        <View style={styles.logoCircle}>
          <Ionicons name="shield-checkmark" size={36} color={Colors.white} />
        </View>
        <Text style={styles.appTitle}>CampusAttend</Text>
        <Text style={styles.appSubtitle}>Smart GPS & QR Attendance</Text>
      </LinearGradient>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: bottomPad + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          {error !== '' && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="your@campus.edu"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPw((p) => !p)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.demoToggle}
          onPress={() => setShowDemo((s) => !s)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showDemo ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={Colors.accent}
          />
          <Text style={styles.demoToggleText}>Demo Accounts</Text>
        </TouchableOpacity>

        {showDemo && (
          <View style={styles.demoCard}>
            <Text style={styles.demoCardTitle}>Quick Login</Text>
            {DEMO_ACCOUNTS.map((acc) => (
              <TouchableOpacity
                key={acc.email}
                style={styles.demoRow}
                onPress={() => handleDemoLogin(acc)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <View style={styles.demoIcon}>
                  <Ionicons name={acc.icon} size={18} color={Colors.accent} />
                </View>
                <View style={styles.demoInfo}>
                  <Text style={styles.demoLabel}>{acc.label}</Text>
                  <Text style={styles.demoEmail}>{acc.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
            <Text style={styles.demoNote}>All demo passwords: admin123 / teacher123 / student123</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  header: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: Colors.white,
    marginBottom: 4,
  },
  appSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 8,
  },
  body: { flex: 1 },
  bodyContent: { padding: 20, gap: 16 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginTop: -20,
  },
  cardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.text,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorPale,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.error,
    flex: 1,
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    height: 48,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.text,
  },
  eyeBtn: { padding: 4 },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    height: 52,
    marginTop: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.white,
  },
  demoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 4,
  },
  demoToggleText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.accent,
  },
  demoCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  demoCardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  demoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.accentPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoInfo: { flex: 1 },
  demoLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  demoEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  demoNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});

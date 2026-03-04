import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

interface AttendanceRecord {
  id: string;
  timestamp: string;
  session: {
    id: string;
    subject: string;
    class: string;
    createdAt: string;
  } | null;
}

function CircleProgress({ percent }: { percent: number }) {
  const r = 50;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  const color = percent >= 75 ? Colors.success : percent >= 50 ? Colors.warning : Colors.error;

  return (
    <View style={styles.circleWrap}>
      <View style={styles.circleContainer}>
        {/* Background ring */}
        <View style={[styles.ring, { borderColor: Colors.divider }]} />
        {/* This is a simplified progress - SVG would be better but keeping it simple */}
        <View style={[styles.ring, {
          borderColor: color,
          opacity: 0.2,
        }]} />
        <View style={styles.circleInner}>
          <Text style={[styles.circlePercent, { color }]}>{Math.round(percent)}%</Text>
          <Text style={styles.circleLabel}>Attendance</Text>
        </View>
      </View>
      <View style={[styles.progressBar, { backgroundColor: Colors.divider }]}>
        <View style={[styles.progressFill, {
          width: `${percent}%` as any,
          backgroundColor: color,
        }]} />
      </View>
    </View>
  );
}

export default function StudentDashboard() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch, isLoading } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: ['/api/attendance/my'],
    refetchInterval: 10000,
  });

  const records = data?.records ?? [];
  const totalSessions = records.length;

  const subjectMap: Record<string, number> = {};
  records.forEach((r) => {
    if (r.session?.subject) {
      subjectMap[r.session.subject] = (subjectMap[r.session.subject] ?? 0) + 1;
    }
  });

  const attendancePercent = totalSessions > 0 ? Math.min(100, (totalSessions / Math.max(totalSessions, 10)) * 100) : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name}</Text>
            {user?.class && (
              <View style={styles.classBadge}>
                <Ionicons name="school" size={12} color={Colors.accentLight} />
                <Text style={styles.classText}>Class {user.class}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.attendanceCard}>
          <CircleProgress percent={attendancePercent} />
          <View style={styles.attendanceStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{totalSessions}</Text>
              <Text style={styles.statLabel}>Sessions Attended</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{Object.keys(subjectMap).length}</Text>
              <Text style={styles.statLabel}>Subjects</Text>
            </View>
          </View>
        </View>

        {Object.keys(subjectMap).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>By Subject</Text>
            {Object.entries(subjectMap).map(([subject, count]) => (
              <View key={subject} style={styles.subjectRow}>
                <View style={styles.subjectIcon}>
                  <Ionicons name="book" size={18} color={Colors.accent} />
                </View>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{subject}</Text>
                  <View style={styles.subjectBar}>
                    <View style={[styles.subjectFill, { width: `${Math.min(100, count * 20)}%` as any }]} />
                  </View>
                </View>
                <Text style={styles.subjectCount}>{count}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Attendance History</Text>
        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginVertical: 20 }} />
        ) : records.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Attendance Yet</Text>
            <Text style={styles.emptyText}>
              Scan your teacher's QR code to mark attendance
            </Text>
          </View>
        ) : (
          [...records].reverse().map((rec) => (
            <View key={rec.id} style={styles.historyRow}>
              <View style={styles.historyIcon}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historySubject}>{rec.session?.subject ?? 'Unknown'}</Text>
                <Text style={styles.historyMeta}>
                  {new Date(rec.timestamp).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <Text style={styles.historyTime}>
                {new Date(rec.timestamp).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  userName: { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.white, marginTop: 2 },
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  classText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.accentLight },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  attendanceCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  circleWrap: { alignItems: 'center', marginBottom: 16 },
  circleContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 10,
    borderColor: Colors.divider,
  },
  ring: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 10,
  },
  circleInner: { alignItems: 'center' },
  circlePercent: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  circleLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  progressBar: { width: '80%', height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  attendanceStats: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statNum: { fontFamily: 'Inter_700Bold', fontSize: 24, color: Colors.text },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 10,
    marginTop: 4,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  subjectIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.accentPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectInfo: { flex: 1 },
  subjectName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text, marginBottom: 6 },
  subjectBar: { height: 4, backgroundColor: Colors.divider, borderRadius: 2, overflow: 'hidden' },
  subjectFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  subjectCount: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.accent, minWidth: 24 },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.successPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: { flex: 1 },
  historySubject: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  historyMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  historyTime: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
});

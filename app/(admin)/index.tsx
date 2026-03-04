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

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalSessions: number;
  totalAttendance: number;
  classes: string[];
}

interface AttendanceRecord {
  id: string;
  student: { name: string; class: string } | null;
  session: { subject: string; class: string; createdAt: string } | null;
  timestamp: string;
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data: stats, refetch: refetchStats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['/api/stats'],
  });

  const { data: reportData, refetch: refetchReport, isLoading: reportLoading } = useQuery<{
    records: AttendanceRecord[];
  }>({
    queryKey: ['/api/attendance/report'],
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchReport()]);
    setRefreshing(false);
  };

  const recent = reportData?.records.slice(-5).reverse() ?? [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="shield" size={12} color={Colors.accentLight} />
              <Text style={styles.roleText}>Administrator</Text>
            </View>
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
        <Text style={styles.sectionTitle}>Overview</Text>
        {statsLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard icon="people" label="Students" value={stats?.totalStudents ?? 0} color={Colors.accent} />
            <StatCard icon="school" label="Teachers" value={stats?.totalTeachers ?? 0} color={Colors.success} />
            <StatCard icon="qr-code" label="Sessions" value={stats?.totalSessions ?? 0} color={Colors.warning} />
            <StatCard icon="checkmark-circle" label="Attendance" value={stats?.totalAttendance ?? 0} color={Colors.primary} />
          </View>
        )}

        {stats?.classes && stats.classes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Active Classes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
              {stats.classes.map((cls) => (
                <View key={cls} style={styles.classBadge}>
                  <Ionicons name="book" size={14} color={Colors.accent} />
                  <Text style={styles.classText}>Class {cls}</Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.sectionTitle}>Recent Attendance</Text>
        {reportLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginVertical: 16 }} />
        ) : recent.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No attendance records yet</Text>
          </View>
        ) : (
          recent.map((rec) => (
            <View key={rec.id} style={styles.recentRow}>
              <View style={styles.recentIcon}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              </View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentName}>{rec.student?.name ?? 'Unknown'}</Text>
                <Text style={styles.recentMeta}>
                  {rec.session?.subject} • Class {rec.session?.class}
                </Text>
              </View>
              <Text style={styles.recentTime}>
                {new Date(rec.timestamp).toLocaleDateString()}
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
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  userName: { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.white, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  roleText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.accentLight },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 28, color: Colors.text },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  classScroll: { marginBottom: 8 },
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentPale,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  classText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.accent },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 16,
  },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textMuted },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.successPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: { flex: 1 },
  recentName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  recentMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  recentTime: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
});

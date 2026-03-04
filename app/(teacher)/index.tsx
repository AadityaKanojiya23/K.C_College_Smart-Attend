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

interface Session {
  id: string;
  class: string;
  subject: string;
  qrToken: string;
  isActive: boolean;
  createdAt: string;
  expiryTime: string;
}

interface AttendanceRecord {
  id: string;
  studentName: string;
  studentEmail: string;
  timestamp: string;
}

export default function TeacherDashboard() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const { data: sessData, refetch } = useQuery<{ sessions: Session[] }>({
    queryKey: ['/api/sessions/my'],
    refetchInterval: 5000,
  });

  const sessions = sessData?.sessions ?? [];
  const activeSessions = sessions.filter((s) => {
    if (!s.isActive) return false;
    return new Date() < new Date(s.expiryTime);
  });
  const totalSessions = sessions.length;

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
            <View style={styles.metaRow}>
              {user?.subject && (
                <View style={styles.metaBadge}>
                  <Ionicons name="book" size={12} color={Colors.accentLight} />
                  <Text style={styles.metaText}>{user.subject}</Text>
                </View>
              )}
              {user?.class && (
                <View style={styles.metaBadge}>
                  <Ionicons name="school" size={12} color={Colors.accentLight} />
                  <Text style={styles.metaText}>Class {user.class}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{activeSessions.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {activeSessions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Active Sessions</Text>
            {activeSessions.map((s) => (
              <View key={s.id} style={[styles.sessionCard, styles.activeSessionCard]}>
                <View style={styles.sessionHeader}>
                  <View style={styles.activeDot} />
                  <Text style={styles.sessionSubject}>{s.subject}</Text>
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>LIVE</Text>
                  </View>
                </View>
                <Text style={styles.sessionClass}>Class {s.class}</Text>
                <Text style={styles.sessionTime}>
                  Expires: {new Date(s.expiryTime).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Session History</Text>
        {sessions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="qr-code-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Sessions Yet</Text>
            <Text style={styles.emptyText}>
              Go to the Session tab to start an attendance session
            </Text>
          </View>
        ) : (
          sessions.map((s) => (
            <View key={s.id} style={styles.sessionCard}>
              <TouchableOpacity
                style={styles.sessionHeader}
                onPress={() => setExpandedSession(expandedSession === s.id ? null : s.id)}
              >
                <View style={styles.sessionMeta}>
                  <Text style={styles.sessionSubject}>{s.subject}</Text>
                  <Text style={styles.sessionClass}>Class {s.class}</Text>
                  <Text style={styles.sessionDate}>
                    {new Date(s.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    {new Date(s.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={styles.sessionRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          s.isActive && new Date() < new Date(s.expiryTime)
                            ? Colors.successPale
                            : Colors.divider,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            s.isActive && new Date() < new Date(s.expiryTime)
                              ? Colors.success
                              : Colors.textMuted,
                        },
                      ]}
                    >
                      {s.isActive && new Date() < new Date(s.expiryTime) ? 'Active' : 'Closed'}
                    </Text>
                  </View>
                  <Ionicons
                    name={expandedSession === s.id ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Colors.textMuted}
                    style={{ marginTop: 6 }}
                  />
                </View>
              </TouchableOpacity>

              {expandedSession === s.id && (
                <AttendanceDetails sessionId={s.id} />
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function AttendanceDetails({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: [`/api/sessions/${sessionId}/attendance`],
  });

  if (isLoading) return <ActivityIndicator color={Colors.accent} style={{ padding: 16 }} />;

  const records = data?.records ?? [];

  return (
    <View style={styles.attendanceList}>
      <Text style={styles.attendanceTitle}>
        {records.length} student{records.length !== 1 ? 's' : ''} present
      </Text>
      {records.length === 0 ? (
        <Text style={styles.noAttendance}>No attendance recorded yet</Text>
      ) : (
        records.map((r) => (
          <View key={r.id} style={styles.attendeeRow}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.attendeeName}>{r.studentName}</Text>
            <Text style={styles.attendeeTime}>
              {new Date(r.timestamp).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  userName: { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.white, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.accentLight },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    marginTop: 16,
    padding: 14,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  statNum: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.white },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 10,
    marginTop: 4,
  },
  sessionCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  activeSessionCard: {
    borderWidth: 1.5,
    borderColor: Colors.success,
  },
  sessionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginTop: 4,
  },
  sessionMeta: { flex: 1 },
  sessionSubject: { fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.text },
  sessionClass: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  sessionDate: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  sessionTime: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.warning, marginTop: 4 },
  sessionRight: { alignItems: 'flex-end' },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  activeBadge: {
    backgroundColor: Colors.success,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 'auto',
  },
  activeBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  attendanceList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 10,
  },
  attendanceTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noAttendance: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  attendeeName: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text, flex: 1 },
  attendeeTime: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
});

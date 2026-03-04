import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

interface ReportRecord {
  id: string;
  timestamp: string;
  student: { name: string; email: string; class?: string } | null;
  session: { subject: string; class: string; createdAt: string } | null;
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const [filterClass, setFilterClass] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch, isLoading } = useQuery<{ records: ReportRecord[] }>({
    queryKey: ['/api/attendance/report'],
  });

  const allClasses = [
    ...new Set(data?.records.map((r) => r.student?.class).filter(Boolean) as string[]),
  ];

  const filtered = data?.records.filter((r) =>
    filterClass ? r.student?.class === filterClass : true
  ) ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const byStudent: Record<string, { name: string; class?: string; count: number }> = {};
  (data?.records ?? []).forEach((r) => {
    if (!r.student) return;
    const key = r.student.email;
    if (!byStudent[key]) byStudent[key] = { name: r.student.name, class: r.student.class, count: 0 };
    byStudent[key].count++;
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.warning + 'CC', Colors.warning]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Text style={styles.headerTitle}>Attendance Reports</Text>
        <Text style={styles.headerSub}>{filtered.length} records total</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {allClasses.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Filter by Class</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, filterClass === null && styles.filterChipActive]}
                onPress={() => setFilterClass(null)}
              >
                <Text style={[styles.filterChipText, filterClass === null && styles.filterChipTextActive]}>
                  All Classes
                </Text>
              </TouchableOpacity>
              {allClasses.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.filterChip, filterClass === c && styles.filterChipActive]}
                  onPress={() => setFilterClass(c === filterClass ? null : c)}
                >
                  <Text style={[styles.filterChipText, filterClass === c && styles.filterChipTextActive]}>
                    Class {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {Object.keys(byStudent).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Attendance Summary</Text>
            {Object.entries(byStudent)
              .filter(([, v]) => !filterClass || v.class === filterClass)
              .map(([email, info]) => (
                <View key={email} style={styles.summaryRow}>
                  <View style={styles.summaryAvatar}>
                    <Text style={styles.summaryAvatarText}>{info.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryName}>{info.name}</Text>
                    {info.class && <Text style={styles.summaryClass}>Class {info.class}</Text>}
                  </View>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{info.count}</Text>
                    <Text style={styles.countLabel}>sessions</Text>
                  </View>
                </View>
              ))}
          </>
        )}

        <Text style={styles.sectionTitle}>All Records</Text>
        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginVertical: 20 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No attendance records</Text>
          </View>
        ) : (
          filtered.slice().reverse().map((rec) => (
            <View key={rec.id} style={styles.recordCard}>
              <View style={styles.recordLeft}>
                <View style={styles.recordIcon}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordName}>{rec.student?.name ?? 'Unknown'}</Text>
                  <Text style={styles.recordMeta}>
                    {rec.session?.subject} • Class {rec.session?.class}
                  </Text>
                </View>
              </View>
              <View style={styles.recordRight}>
                <Text style={styles.recordDate}>
                  {new Date(rec.timestamp).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </Text>
                <Text style={styles.recordTime}>
                  {new Date(rec.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
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
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.white },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.text,
    marginTop: 8,
    marginBottom: 10,
  },
  filterRow: { marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterChipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.white },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  summaryAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.white },
  summaryInfo: { flex: 1 },
  summaryName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  summaryClass: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
  countBadge: { alignItems: 'center' },
  countText: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.accent },
  countLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textMuted },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.textMuted },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  recordLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  recordIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.successPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInfo: { flex: 1 },
  recordName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text },
  recordMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  recordRight: { alignItems: 'flex-end' },
  recordDate: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.text },
  recordTime: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
});

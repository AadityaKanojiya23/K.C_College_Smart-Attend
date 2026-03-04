import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { apiRequest } from '@/lib/query-client';
import * as Haptics from 'expo-haptics';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  class?: string;
  subject?: string;
}

interface TeacherFormData {
  name: string;
  email: string;
  password: string;
  class: string;
  subject: string;
}

const CLASSES = ['10-A', '10-B', '11-A', '11-B', '12-A', '12-B'];
const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Computer Science'];

function TeacherFormModal({
  visible,
  onClose,
  onSave,
  initial,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (d: TeacherFormData) => void;
  initial?: Partial<TeacherFormData>;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [cls, setCls] = useState(initial?.class ?? '10-A');
  const [subject, setSubject] = useState(initial?.subject ?? 'Mathematics');

  React.useEffect(() => {
    setName(initial?.name ?? '');
    setEmail(initial?.email ?? '');
    setPassword('');
    setCls(initial?.class ?? '10-A');
    setSubject(initial?.subject ?? 'Mathematics');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{initial?.name ? 'Edit Teacher' : 'Add Teacher'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.field}
            value={name}
            onChangeText={setName}
            placeholder="Teacher name"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.field}
            value={email}
            onChangeText={setEmail}
            placeholder="teacher@campus.edu"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Password {initial?.name ? '(leave blank to keep)' : ''}</Text>
          <TextInput
            style={styles.field}
            value={password}
            onChangeText={setPassword}
            placeholder={initial?.name ? 'New password (optional)' : 'Set password'}
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />

          <Text style={styles.fieldLabel}>Assigned Class</Text>
          <View style={styles.chipRow}>
            {CLASSES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, cls === c && styles.chipActive]}
                onPress={() => setCls(c)}
              >
                <Text style={[styles.chipText, cls === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Subject</Text>
          <View style={styles.chipRow}>
            {SUBJECTS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, subject === s && styles.chipActive]}
                onPress={() => setSubject(s)}
              >
                <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.6 }]}
            onPress={() => onSave({ name, email, password, class: cls, subject })}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save Teacher</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function TeachersScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data, refetch, isLoading } = useQuery<{ users: AppUser[] }>({
    queryKey: ['/api/users'],
  });

  const teachers = data?.users.filter((u) => u.role === 'teacher') ?? [];

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const createMutation = useMutation({
    mutationFn: (d: TeacherFormData) =>
      apiRequest('POST', '/api/users', { ...d, role: 'teacher' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/users'] });
      qc.invalidateQueries({ queryKey: ['/api/stats'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: TeacherFormData }) => {
      const body: Record<string, string> = {
        name: d.name,
        email: d.email,
        class: d.class,
        subject: d.subject,
      };
      if (d.password) body.password = d.password;
      return apiRequest('PUT', `/api/users/${id}`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/users'] });
      setEditing(null);
      setShowModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/users'] });
      qc.invalidateQueries({ queryKey: ['/api/stats'] });
    },
  });

  const handleSave = (d: TeacherFormData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (editing) updateMutation.mutate({ id: editing.id, d });
    else createMutation.mutate(d);
  };

  const handleDelete = (u: AppUser) => {
    Alert.alert('Delete Teacher', `Remove ${u.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteMutation.mutate(u.id);
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primaryDark, Colors.success + 'CC', Colors.success]} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={styles.headerTitle}>Teachers</Text>
        <Text style={styles.headerSub}>{teachers.length} faculty members</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setEditing(null); setShowModal(true); }}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.addBtnText}>Add Teacher</Text>
        </TouchableOpacity>
      </LinearGradient>

      {isLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={teachers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="school-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No teachers yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={[styles.userAvatar, { backgroundColor: Colors.success }]}>
                <Text style={styles.userAvatarText}>{item.name.charAt(0)}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <View style={styles.tagsRow}>
                  {item.subject && (
                    <View style={[styles.tag, { backgroundColor: Colors.successPale }]}>
                      <Text style={[styles.tagText, { color: Colors.success }]}>{item.subject}</Text>
                    </View>
                  )}
                  {item.class && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>Class {item.class}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => { setEditing(item); setShowModal(true); }}
                >
                  <Ionicons name="pencil" size={16} color={Colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash" size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <TeacherFormModal
        visible={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing ?? undefined}
        loading={isMutating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.white },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  addBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.white },
  listContent: { padding: 16, paddingBottom: 100 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.white },
  userInfo: { flex: 1 },
  userName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  userEmail: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  tagsRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  tag: {
    backgroundColor: Colors.accentPale,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.accent },
  actions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.accentPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.errorPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text, marginBottom: 6 },
  field: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.success, borderColor: Colors.success },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },
  saveBtn: {
    backgroundColor: Colors.success,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.white },
});

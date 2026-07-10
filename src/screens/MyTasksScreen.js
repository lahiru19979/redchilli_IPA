// screens/MyTasksScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { taskAPI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import DateTimeField from '../components/DateTimeField';
import { C } from '../utils/theme';

const BUCKETS = [
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'delay', label: 'Delay' },
  { key: 'completed', label: 'Completed' },
];

// Mirrors JobTask::statusBadge() on the web.
const STATUS_BADGES = {
  completed: { label: 'Completed', bg: '#1DA13B', text: '#ffffff' },
  delayed: { label: 'Delayed', bg: '#E53935', text: '#ffffff' },
  waiting: { label: 'Waiting', bg: '#6E6E6E', text: '#ffffff' },
  scheduled: { label: 'Scheduled', bg: '#00BCD4', text: '#ffffff' },
  hold: { label: 'Hold', bg: '#D4A017', text: '#ffffff' },
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_BADGES[status] || STATUS_BADGES.waiting;
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
    </View>
  );
};

const MyTasksScreen = () => {
  const { hasPermission } = useAuth();
  const canAccess = hasPermission('view_my_tasks');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bucket, setBucket] = useState('ongoing');
  const [tasks, setTasks] = useState([]);

  const [editingTask, setEditingTask] = useState(null);
  const [actualStart, setActualStart] = useState('');
  const [actualEnd, setActualEnd] = useState('');
  const [qty, setQty] = useState('');
  const [status, setStatus] = useState('started');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async currentBucket => {
    try {
      const res = await taskAPI.getMyTasks(currentBucket);
      setTasks(res.data.tasks || []);
    } catch (error) {
      console.error('Load my tasks error:', error?.response?.data || error);
      if (error?.response?.status !== 403) {
        Alert.alert('Error', 'Could not load your tasks. Pull down to retry.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccess) {
      setLoading(true);
      loadData(bucket);
    } else {
      setLoading(false);
    }
  }, [canAccess, bucket, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(bucket);
    setRefreshing(false);
  }, [loadData, bucket]);

  const startEdit = task => {
    setEditingTask(task);
    setActualStart(task.actual_start_at ? task.actual_start_at.substring(0, 16) : '');
    setActualEnd(task.actual_end_at ? task.actual_end_at.substring(0, 16) : '');
    setQty(task.qty != null ? String(task.qty) : '');
    setStatus(
      task.status === 'completed' ? 'completed' : task.status === 'hold' ? 'hold' : 'started',
    );
  };

  const closeEdit = () => setEditingTask(null);

  const submit = async () => {
    try {
      setSubmitting(true);
      await taskAPI.updateMyTask(editingTask.id, {
        status,
        actual_start_at: actualStart || undefined,
        actual_end_at: actualEnd || undefined,
        qty: qty || undefined,
      });
      Alert.alert('Success', 'Task updated.');
      closeEdit();
      await loadData(bucket);
    } catch (error) {
      console.error('Update task error:', error?.response?.data || error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Could not update this task.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your tasks..." />;
  }

  if (!canAccess) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedIcon}>🔒</Text>
        <Text style={styles.lockedText}>
          You don't have permission to view My Tasks.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.tabsRow}>
        {BUCKETS.map(b => (
          <TouchableOpacity
            key={b.key}
            style={[styles.tab, bucket === b.key && styles.tabActive]}
            onPress={() => setBucket(b.key)}
          >
            <Text style={[styles.tabText, bucket === b.key && styles.tabTextActive]}>
              {b.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {editingTask && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {editingTask.job_card?.job_number} · {editingTask.task_type?.name}
          </Text>

          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.toggleRow}>
            {['started', 'hold', 'completed'].map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.toggleBtn, status === s && styles.toggleBtnActive]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.toggleText, status === s && styles.toggleTextActive]}>
                  {s === 'started' ? 'Started' : s === 'hold' ? 'Hold' : 'Completed'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <DateTimeField
            label="Actual Start"
            value={actualStart}
            onChange={setActualStart}
            placeholder="Select start time"
          />

          <DateTimeField
            label="Actual End"
            value={actualEnd}
            onChange={setActualEnd}
            placeholder="Select end time"
          />

          <Text style={styles.fieldLabel}>Quantity</Text>
          <TextInput
            style={styles.input}
            placeholder="Qty"
            value={qty}
            onChangeText={setQty}
            keyboardType="numeric"
          />

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={closeEdit}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={submit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={C.surface} />
              ) : (
                <Text style={styles.submitBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.list}>
        {tasks.length === 0 ? (
          <Text style={styles.emptyText}>No tasks in this bucket.</Text>
        ) : (
          tasks.map(task => (
            <TouchableOpacity
              key={task.id}
              style={styles.card}
              onPress={() => startEdit(task)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {task.job_card?.job_number} · {task.task_type?.name}
                </Text>
                <StatusBadge status={task.display_status || task.status} />
              </View>
              <Text style={styles.cardSub}>
                Qty: {task.qty ?? '-'}
                {task.expected_start_at ? `  ·  Expected: ${task.expected_start_at}` : ''}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  tabsRow: { flexDirection: 'row', padding: 16, paddingBottom: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: C.accent, borderColor: C.accent },
  tabText: { color: C.textSecondary, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: C.surface },
  form: {
    backgroundColor: C.surface,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 12 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: C.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  toggleRow: { flexDirection: 'row', marginBottom: 16 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  toggleText: { color: C.textSecondary, fontWeight: '600', fontSize: 12 },
  toggleTextActive: { color: C.surface },
  formActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelBtnText: { color: C.textSecondary, fontWeight: '700' },
  submitBtn: {
    flex: 1,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: C.surface, fontWeight: '700', fontSize: 16 },
  list: { paddingHorizontal: 16 },
  emptyText: { textAlign: 'center', color: C.textSecondary, marginTop: 30 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: C.textPrimary, flex: 1, marginRight: 8 },
  cardSub: { fontSize: 12, color: C.textSecondary, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: C.bg,
  },
  lockedIcon: { fontSize: 48, marginBottom: 16 },
  lockedText: { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22 },
  bottomSpacing: { height: 30 },
});

export default MyTasksScreen;

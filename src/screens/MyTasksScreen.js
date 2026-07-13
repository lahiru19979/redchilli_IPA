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

// Mirrors MemberTaskController::update()'s 3-phase state machine, driven by
// the task's own saved state rather than anything typed into the form.
const getPhase = task => {
  if (task.status === 'completed') return 'locked';
  if (!task.expected_start_at || !task.expected_end_at) return 'schedule';
  if (!task.actual_start_at) return 'ready';
  return 'in_progress';
};

const formatDateTime = value => (value ? String(value).replace('T', ' ').substring(0, 16) : '-');

const MyTasksScreen = () => {
  const { hasPermission } = useAuth();
  const canAccess = hasPermission('view_my_tasks');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bucket, setBucket] = useState('ongoing');
  const [tasks, setTasks] = useState([]);
  const [statusCounts, setStatusCounts] = useState({ ongoing: 0, delay: 0, completed: 0 });

  const [editingTask, setEditingTask] = useState(null);
  const [expectedStart, setExpectedStart] = useState('');
  const [expectedEnd, setExpectedEnd] = useState('');
  const [qty, setQty] = useState('');
  const [status, setStatus] = useState('completed');
  const [holdReason, setHoldReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [requestingChangeFor, setRequestingChangeFor] = useState(null);
  const [changeReason, setChangeReason] = useState('');
  const [requestingSubmitting, setRequestingSubmitting] = useState(false);

  const loadData = useCallback(async currentBucket => {
    try {
      const res = await taskAPI.getMyTasks(currentBucket);
      setTasks(res.data.tasks || []);
      if (res.data.status_counts) {
        setStatusCounts(res.data.status_counts);
      }
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
    setRequestingChangeFor(null);
    setEditingTask(task);
    setExpectedStart(task.expected_start_at ? task.expected_start_at.substring(0, 16) : '');
    setExpectedEnd(task.expected_end_at ? task.expected_end_at.substring(0, 16) : '');
    setQty(task.qty != null ? String(task.qty) : '');
    setStatus('completed');
    setHoldReason('');
  };

  const closeEdit = () => setEditingTask(null);

  const submit = async () => {
    const phase = getPhase(editingTask);

    try {
      setSubmitting(true);

      if (phase === 'schedule') {
        if (!expectedStart || !expectedEnd) {
          Alert.alert('Missing info', 'Please select both expected start and end time.');
          setSubmitting(false);
          return;
        }
        await taskAPI.updateMyTask(editingTask.id, {
          expected_start_at: expectedStart,
          expected_end_at: expectedEnd,
          qty: qty || undefined,
        });
        Alert.alert('Success', 'Schedule saved.');
      } else if (phase === 'ready') {
        await taskAPI.updateMyTask(editingTask.id, { qty: qty || undefined });
        Alert.alert('Success', 'Task started.');
      } else {
        if (status === 'hold' && !holdReason.trim()) {
          Alert.alert('Missing info', 'Please state the reason for holding this task.');
          setSubmitting(false);
          return;
        }
        await taskAPI.updateMyTask(editingTask.id, {
          status,
          qty: qty || undefined,
          hold_reason: status === 'hold' ? holdReason.trim() : undefined,
        });
        Alert.alert('Success', 'Task updated.');
      }

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

  const startRequestChange = task => {
    setEditingTask(null);
    setRequestingChangeFor(task.id);
    setChangeReason('');
  };

  const submitChangeRequest = async () => {
    if (!changeReason.trim()) {
      Alert.alert('Missing info', 'Please explain what needs to change.');
      return;
    }
    try {
      setRequestingSubmitting(true);
      await taskAPI.requestScheduleChange(requestingChangeFor, changeReason.trim());
      Alert.alert('Success', 'Change request sent to admin.');
      setRequestingChangeFor(null);
      await loadData(bucket);
    } catch (error) {
      console.error('Request schedule change error:', error?.response?.data || error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Could not send the change request.',
      );
    } finally {
      setRequestingSubmitting(false);
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

  const editingPhase = editingTask ? getPhase(editingTask) : null;

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
              {b.label} ({statusCounts[b.key] ?? 0})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {editingTask && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {editingTask.job_card?.job_number} · {editingTask.task_type?.name}
          </Text>

          {editingPhase === 'schedule' && (
            <>
              <DateTimeField
                label="Expected Start"
                value={expectedStart}
                onChange={setExpectedStart}
                placeholder="Select expected start"
              />
              <DateTimeField
                label="Expected End"
                value={expectedEnd}
                onChange={setExpectedEnd}
                placeholder="Select expected end"
              />
            </>
          )}

          {editingPhase === 'ready' && (
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyLine}>
                Expected: {formatDateTime(editingTask.expected_start_at)} → {formatDateTime(editingTask.expected_end_at)}
              </Text>
              <Text style={styles.readOnlyHint}>Tap Start when you begin this task.</Text>
            </View>
          )}

          {editingPhase === 'in_progress' && (
            <>
              <View style={styles.readOnlyBox}>
                <Text style={styles.readOnlyLine}>
                  Expected: {formatDateTime(editingTask.expected_start_at)} → {formatDateTime(editingTask.expected_end_at)}
                </Text>
                <Text style={styles.readOnlyLine}>
                  Started: {formatDateTime(editingTask.actual_start_at)}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.toggleRow}>
                {['completed', 'hold'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.toggleBtn, status === s && styles.toggleBtnActive]}
                    onPress={() => setStatus(s)}
                  >
                    <Text style={[styles.toggleText, status === s && styles.toggleTextActive]}>
                      {s === 'hold' ? 'Hold By Customer' : 'Completed'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {status === 'hold' && (
                <>
                  <Text style={styles.fieldLabel}>Hold Reason</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Why is this on hold?"
                    value={holdReason}
                    onChangeText={setHoldReason}
                  />
                </>
              )}
            </>
          )}

          {editingPhase !== 'ready' && (
            <>
              <Text style={styles.fieldLabel}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="Qty"
                value={qty}
                onChangeText={setQty}
                keyboardType="numeric"
              />
            </>
          )}

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
                <Text style={styles.submitBtnText}>
                  {editingPhase === 'schedule' ? 'Save' : editingPhase === 'ready' ? 'Start' : 'Update'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {requestingChangeFor && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Request Schedule Change</Text>
          <TextInput
            style={styles.input}
            placeholder="What needs to change?"
            value={changeReason}
            onChangeText={setChangeReason}
            multiline
          />
          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setRequestingChangeFor(null)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, requestingSubmitting && styles.submitBtnDisabled]}
              onPress={submitChangeRequest}
              disabled={requestingSubmitting}
            >
              {requestingSubmitting ? (
                <ActivityIndicator color={C.surface} />
              ) : (
                <Text style={styles.submitBtnText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.list}>
        {tasks.length === 0 ? (
          <Text style={styles.emptyText}>No tasks in this bucket.</Text>
        ) : (
          tasks.map(task => {
            const phase = getPhase(task);
            const canRequestChange =
              phase !== 'schedule' && phase !== 'locked' && !task.schedule_change_requested_at;

            return (
              <View key={task.id} style={styles.card}>
                <TouchableOpacity onPress={() => startEdit(task)} activeOpacity={0.7}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>
                      {task.job_card?.job_number} · {task.task_type?.name}
                    </Text>
                    <StatusBadge status={task.display_status || task.status} />
                  </View>
                  <Text style={styles.cardSub}>
                    Qty: {task.qty ?? '-'}
                    {task.expected_start_at ? `  ·  Expected: ${formatDateTime(task.expected_start_at)}` : ''}
                  </Text>
                  {task.status === 'hold' && !!task.hold_reason && (
                    <Text style={styles.cardHoldReason}>Hold reason: {task.hold_reason}</Text>
                  )}
                </TouchableOpacity>

                {!!task.schedule_change_requested_at && (
                  <Text style={styles.changeRequestedText}>
                    Change requested{task.schedule_change_reason ? `: ${task.schedule_change_reason}` : ''}
                  </Text>
                )}

                {canRequestChange && (
                  <TouchableOpacity onPress={() => startRequestChange(task)}>
                    <Text style={styles.requestChangeLink}>Wrong? Request change</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
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
  tabText: { color: C.textSecondary, fontWeight: '600', fontSize: 12 },
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
  readOnlyBox: {
    backgroundColor: C.bgAlt,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  readOnlyLine: { fontSize: 13, color: C.textPrimary, marginBottom: 2 },
  readOnlyHint: { fontSize: 12, color: C.textSecondary, marginTop: 4 },
  toggleRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    borderRadius: 8,
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
  cardHoldReason: { fontSize: 12, color: C.warning, marginTop: 4 },
  changeRequestedText: {
    fontSize: 12,
    color: C.danger,
    marginTop: 8,
    fontWeight: '600',
  },
  requestChangeLink: {
    fontSize: 12,
    color: C.accent,
    marginTop: 8,
    fontWeight: '600',
  },
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

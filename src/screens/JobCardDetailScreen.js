// screens/JobCardDetailScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { taskAPI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { C } from '../utils/theme';

const StatusBadge = ({ badge }) => (
  <View style={[styles.badge, { backgroundColor: badge?.bg || '#6E6E6E' }]}>
    <Text style={[styles.badgeText, { color: badge?.text || '#fff' }]}>
      {badge?.label || 'Waiting'}
    </Text>
  </View>
);

const JobCardDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const { hasPermission } = useAuth();
  const canTransfer = hasPermission('transfer_job');
  const canReset = hasPermission('reset_schedule');
  const canDelete = hasPermission('delete_job_cards');

  const [loading, setLoading] = useState(true);
  const [jobCard, setJobCard] = useState(null);
  const [workload, setWorkload] = useState({});
  const [users, setUsers] = useState([]);
  const [transferTaskId, setTransferTaskId] = useState(null);
  const [transferReason, setTransferReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await taskAPI.getJobCard(id);
      setJobCard(res.data.job_card);
      setWorkload(res.data.workload || {});
      setUsers(res.data.users || []);
    } catch (error) {
      console.error('Load job card error:', error?.response?.data || error);
      Alert.alert('Error', 'Could not load this job card.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startTransfer = task => {
    setTransferTaskId(task.id);
    setTransferReason('');
  };

  const confirmTransfer = async toUserId => {
    try {
      setSubmitting(true);
      await taskAPI.reassignTask({
        task_id: transferTaskId,
        to_user_id: toUserId,
        reason: transferReason || undefined,
      });
      Alert.alert('Success', 'Task transferred.');
      setTransferTaskId(null);
      await loadData();
    } catch (error) {
      console.error('Reassign task error:', error?.response?.data || error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Could not transfer this task.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetSchedule = task => {
    Alert.alert(
      'Reset Schedule',
      'Clear the expected start/end time for this task? The assigned member will need to enter it again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskAPI.resetTaskSchedule(task.id);
              Alert.alert('Success', 'Schedule reset.');
              await loadData();
            } catch (error) {
              console.error('Reset schedule error:', error?.response?.data || error);
              Alert.alert(
                'Error',
                error?.response?.data?.message || 'Could not reset this schedule.',
              );
            }
          },
        },
      ],
    );
  };

  const confirmDeleteJobCard = () => {
    Alert.alert('Delete Job Card', `Delete job ${jobCard.job_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await taskAPI.deleteJobCard(jobCard.id);
            Alert.alert('Success', 'Job card deleted successfully.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (error) {
            console.error('Delete job card error:', error?.response?.data || error);
            Alert.alert(
              'Error',
              error?.response?.data?.message || 'Could not delete this job card.',
            );
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingSpinner message="Loading job card..." />;
  }

  if (!jobCard) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedText}>Job card not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.jobNumber}>{jobCard.job_number}</Text>
        <Text style={styles.headerSub}>📞 {jobCard.phone_number}</Text>
        <Text style={styles.headerSub}>
          🚚 Delivery: {jobCard.delivery_at ? String(jobCard.delivery_at).replace('T', ' ').substring(0, 16) : '-'}
        </Text>
        <Text style={styles.headerSub}>
          Created by: {jobCard.creator ? `${jobCard.creator.first_name} ${jobCard.creator.last_name}` : '-'}
        </Text>

        {canDelete && (
          <TouchableOpacity
            style={[styles.deleteJobBtn, deleting && styles.submitBtnDisabled]}
            onPress={confirmDeleteJobCard}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color={C.danger} size="small" />
            ) : (
              <Text style={styles.deleteJobBtnText}>🗑 Delete Job Card</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>Tasks</Text>
      {(jobCard.tasks || []).map(task => {
        const eligibleUsers = users.filter(u => u.id !== task.assigned_user_id);

        return (
        <View key={task.id} style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskName}>{task.task_type?.name}</Text>
            <StatusBadge badge={task.status_badge} />
          </View>
          <Text style={styles.taskDetail}>
            Assigned to: {task.assigned_user ? `${task.assigned_user.first_name} ${task.assigned_user.last_name}` : 'Unassigned'}
          </Text>
          <Text style={styles.taskDetail}>Qty: {task.qty ?? '-'}</Text>
          <Text style={styles.taskDetail}>
            Expected: {task.expected_start_at ? String(task.expected_start_at).replace('T', ' ').substring(0, 16) : '-'}
            {' → '}
            {task.expected_end_at ? String(task.expected_end_at).replace('T', ' ').substring(0, 16) : '-'}
          </Text>
          <Text style={styles.taskDetail}>
            Actual: {task.actual_start_at ? String(task.actual_start_at).replace('T', ' ').substring(0, 16) : '-'}
            {' → '}
            {task.actual_end_at ? String(task.actual_end_at).replace('T', ' ').substring(0, 16) : '-'}
          </Text>
          {task.status === 'hold' && !!task.hold_reason && (
            <Text style={styles.holdReasonText}>Hold reason: {task.hold_reason}</Text>
          )}
          {!!task.schedule_change_requested_at && (
            <Text style={styles.changeRequestedText}>
              ⚠ Schedule change requested{task.schedule_change_reason ? `: ${task.schedule_change_reason}` : ''}
            </Text>
          )}

          {canReset && (task.expected_start_at || task.expected_end_at) && (
            <TouchableOpacity style={styles.resetBtn} onPress={() => resetSchedule(task)}>
              <Text style={styles.resetBtnText}>Reset Schedule</Text>
            </TouchableOpacity>
          )}

          <View style={styles.historyBox}>
            <Text style={styles.historyTitle}>Transfer history</Text>
            {(task.reassignments || []).length === 0 ? (
              <Text style={styles.historyEmpty}>No transfers recorded for this task.</Text>
            ) : (
              task.reassignments.map(r => (
                <View key={r.id} style={styles.historyRow}>
                  <Text style={styles.historyLine}>
                    {r.from_user ? `${r.from_user.first_name} ${r.from_user.last_name}` : 'Unassigned'}
                    {' → '}
                    {r.to_user ? `${r.to_user.first_name} ${r.to_user.last_name}` : '-'}
                  </Text>
                  <Text style={styles.historyMeta}>
                    By: {r.reassigned_by ? `${r.reassigned_by.first_name} ${r.reassigned_by.last_name}` : '-'}
                    {'  ·  '}
                    {r.created_at ? String(r.created_at).replace('T', ' ').substring(0, 16) : '-'}
                  </Text>
                  {!!r.reason && <Text style={styles.historyMeta}>Reason: {r.reason}</Text>}
                </View>
              ))
            )}
          </View>

          {canTransfer && (
            <TouchableOpacity style={styles.transferBtn} onPress={() => startTransfer(task)}>
              <Text style={styles.transferBtnText}>Transfer this task</Text>
            </TouchableOpacity>
          )}

          {canTransfer && transferTaskId === task.id && (
            <View style={styles.transferPanel}>
              <Text style={styles.fieldLabelSmall}>Reason (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Reason for transfer"
                value={transferReason}
                onChangeText={setTransferReason}
              />
              <Text style={styles.fieldLabelSmall}>Choose new assignee (current workload shown)</Text>
              <View style={styles.userRow}>
                {eligibleUsers.length === 0 ? (
                  <Text style={styles.emptyText}>No other active users available.</Text>
                ) : (
                  eligibleUsers.map(u => (
                    <TouchableOpacity
                      key={u.id}
                      style={styles.userChip}
                      onPress={() => confirmTransfer(u.id)}
                      disabled={submitting}
                    >
                      <Text style={styles.userChipText}>
                        {u.first_name} {u.last_name}
                        {workload[u.id] !== undefined ? ` (${workload[u.id]} open)` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
              {submitting && <ActivityIndicator color={C.accent} style={{ marginTop: 8 }} />}
              <TouchableOpacity onPress={() => setTransferTaskId(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        );
      })}

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    backgroundColor: C.surface,
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  jobNumber: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  headerSub: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  deleteJobBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.danger,
  },
  deleteJobBtnText: { color: C.danger, fontWeight: '600', fontSize: 13 },
  submitBtnDisabled: { opacity: 0.6 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
  },
  taskCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
  },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskName: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  taskDetail: { fontSize: 12, color: C.textSecondary, marginTop: 4 },
  holdReasonText: { fontSize: 12, color: C.warning, marginTop: 4 },
  changeRequestedText: { fontSize: 12, color: C.danger, marginTop: 6, fontWeight: '600' },
  resetBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.warning,
  },
  resetBtnText: { color: C.warning, fontWeight: '600', fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  historyBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  historyTitle: { fontSize: 12, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  historyEmpty: { fontSize: 11, color: C.textSecondary, fontStyle: 'italic' },
  historyRow: { marginBottom: 8 },
  historyLine: { fontSize: 12, color: C.textPrimary, fontWeight: '600' },
  historyMeta: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  transferBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.accent,
  },
  transferBtnText: { color: C.accent, fontWeight: '600', fontSize: 12 },
  transferPanel: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  fieldLabelSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: C.bgAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  userRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  userChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 6,
    marginBottom: 6,
  },
  userChipText: { fontSize: 12, color: C.textSecondary },
  emptyText: { fontSize: 12, color: C.textSecondary },
  cancelText: { color: C.danger, fontSize: 12, marginTop: 6, fontWeight: '600' },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: C.bg,
  },
  lockedText: { fontSize: 14, color: C.textSecondary, textAlign: 'center' },
  bottomSpacing: { height: 30 },
});

export default JobCardDetailScreen;

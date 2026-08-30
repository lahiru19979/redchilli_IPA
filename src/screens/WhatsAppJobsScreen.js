// screens/WhatsAppJobsScreen.js
//
// The Jobs panel from the web CRM's chat window, as its own screen: the job
// cards belonging to the chat's phone number, grouped into Ongoing / Delay /
// Completed with counts, plus create and delete.
//
// It reuses /job-cards rather than adding an endpoint — that route already
// filters on phone_number, so passing the number's trailing digits gives the
// same set the web panel builds, and its status_counts come back scoped to the
// same filter.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { taskAPI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { C } from '../utils/theme';

const FILTERS = [
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'delay', label: 'Delay' },
  { key: 'completed', label: 'Done' },
  { key: 'all', label: 'All' },
];

// The web CRM's own status colours, so a job that reads "Delay" there is the
// same red here. Used for both the filter tabs and each card's status pill.
const OVERALL_COLORS = {
  ongoing: '#2563EB',
  delay: '#E0333F',
  completed: '#1DA13B',
};

// Job cards store whatever format the number was entered in, so matching on the
// last nine digits is what lines up "0769270098" with "+94 76 927 0098". This is
// the same rule the web CRM's phoneTail() uses.
const phoneTail = phone => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.slice(-9);
};

const WhatsAppJobsScreen = ({ route, navigation }) => {
  const { name, phone } = route.params || {};
  const { hasPermission } = useAuth();

  const canView = hasPermission('view_job_cards');
  const canCreate = hasPermission('create_job_cards');
  const canDelete = hasPermission('delete_job_cards');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ongoing');
  const [jobs, setJobs] = useState([]);
  const [counts, setCounts] = useState({ ongoing: 0, delay: 0, completed: 0 });
  const [deletingId, setDeletingId] = useState(null);

  const tail = phoneTail(phone);

  useEffect(() => {
    navigation.setOptions({ title: name ? `Jobs · ${name}` : 'Jobs' });
  }, [navigation, name]);

  const load = useCallback(
    async which => {
      if (!canView || !tail) {
        setLoading(false);
        return;
      }

      try {
        const res = await taskAPI.getJobCards(which, tail);
        setJobs(res.data.job_cards?.data || []);

        if (res.data.status_counts) setCounts(res.data.status_counts);
      } catch (error) {
        if (error?.response?.status !== 403) {
          Alert.alert('Error', 'Could not load job cards. Pull down to retry.');
        }
      } finally {
        setLoading(false);
      }
    },
    [canView, tail],
  );

  useEffect(() => {
    setLoading(true);
    load(filter);
  }, [filter, load]);

  // Coming back from Create Job or Job Detail should show the change.
  useFocusEffect(
    useCallback(() => {
      load(filter);
    }, [load, filter]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(filter);
    setRefreshing(false);
  };

  const removeJob = job => {
    Alert.alert(
      'Delete this job card?',
      `${job.job_number} and its tasks will be removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(job.id);

            try {
              await taskAPI.deleteJobCard(job.id);
              setJobs(prev => prev.filter(j => j.id !== job.id));
              // Counts come from the server, so refresh rather than guess.
              load(filter);
            } catch (error) {
              Alert.alert(
                'Not deleted',
                error?.response?.data?.message
                  || 'Could not delete that job card.',
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  if (!canView) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedIcon}>🔒</Text>
        <Text style={styles.lockedText}>
          You don't have permission to view job cards.
        </Text>
      </View>
    );
  }

  if (!tail) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedText}>
          This chat has no phone number, so it cannot be matched to a job card.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {FILTERS.map(f => {
          const count =
            f.key === 'all'
              ? counts.ongoing + counts.delay + counts.completed
              : counts[f.key] ?? 0;

          // Each status carries its own colour when selected; All has no
          // status of its own, so it takes the app's accent.
          const colour = OVERALL_COLORS[f.key] || C.accent;

          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.tab,
                filter === f.key && { backgroundColor: colour, borderColor: colour },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[styles.tabText, filter === f.key && styles.tabTextActive]}
              >
                {f.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator color={C.accent} style={styles.loader} />
        ) : jobs.length === 0 ? (
          <Text style={styles.empty}>
            No {filter === 'all' ? '' : filter} job cards for this customer.
          </Text>
        ) : (
          jobs.map(job => (
            <View key={job.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHead}
                onPress={() => navigation.navigate('JobCardDetail', { id: job.id })}
                activeOpacity={0.7}
              >
                <Text style={styles.jobNo}>🗂 {job.job_number}</Text>

                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        OVERALL_COLORS[job.overall_status] || C.accent,
                    },
                  ]}
                >
                  <Text style={styles.statusPillText}>
                    {(job.overall_status || 'ongoing').toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.cardSub}>
                🚚{' '}
                {job.delivery_at
                  ? String(job.delivery_at).replace('T', ' ').substring(0, 16)
                  : '—'}
              </Text>

              {(job.tasks || []).map(task => (
                <View key={task.id} style={styles.taskRow}>
                  <Text style={styles.taskName} numberOfLines={1}>
                    {task.task_type?.name || 'Task'}
                    {task.qty ? `  ×${Number(task.qty)}` : ''}
                  </Text>

                  <Text style={styles.taskUser} numberOfLines={1}>
                    {task.assigned_user?.first_name || 'Unassigned'}
                  </Text>

                  <View
                    style={[
                      styles.taskBadge,
                      { backgroundColor: task.status_badge?.bg || C.bgAlt },
                    ]}
                  >
                    <Text
                      style={[
                        styles.taskBadgeText,
                        { color: task.status_badge?.text || C.textSecondary },
                      ]}
                    >
                      {task.status_badge?.label || task.status}
                    </Text>
                  </View>
                </View>
              ))}

              {canDelete && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => removeJob(job)}
                  disabled={deletingId === job.id}
                >
                  {deletingId === job.id ? (
                    <ActivityIndicator color={C.danger} size="small" />
                  ) : (
                    <Text style={styles.deleteBtnText}>Delete job card</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {canCreate && (
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() =>
            navigation.navigate('CreateJobCard', { phone, customerName: name })
          }
        >
          <Text style={styles.newBtnText}>+ New job for {name || phone}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  lockedIcon: { fontSize: 36, marginBottom: 12 },
  lockedText: { fontSize: 14, color: C.textSecondary, textAlign: 'center' },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    backgroundColor: C.surface,
  },
  tabText: { fontSize: 11.5, fontWeight: '700', color: C.textSecondary },
  tabTextActive: { color: C.surface },
  list: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 24 },
  loader: { marginTop: 32 },
  empty: { textAlign: 'center', color: C.textSecondary, marginTop: 32, fontSize: 13.5 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  jobNo: { fontSize: 15, fontWeight: '700', color: C.accent },
  statusPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardSub: { fontSize: 12.5, color: C.textSecondary, marginTop: 4 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.divider,
  },
  taskName: { flex: 1, fontSize: 13, fontWeight: '600', color: C.textPrimary },
  taskUser: { width: 74, fontSize: 11.5, color: C.textSecondary },
  taskBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  taskBadgeText: { fontSize: 10, fontWeight: '700' },
  deleteBtn: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 4 },
  deleteBtnText: { color: C.danger, fontSize: 12.5, fontWeight: '700' },
  newBtn: {
    margin: 12,
    borderRadius: 10,
    backgroundColor: C.success,
    paddingVertical: 13,
    alignItems: 'center',
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default WhatsAppJobsScreen;

// screens/JobCardsScreen.js

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
} from 'react-native';
import { taskAPI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { C } from '../utils/theme';

const FILTERS = [
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'delay', label: 'Delay' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
];

const OVERALL_STATUS_COLORS = {
  ongoing: C.accent,
  delay: C.danger,
  completed: C.success,
};

const JobCardsScreen = ({ navigation }) => {
  const { hasPermission } = useAuth();
  const canView = hasPermission('view_job_cards');
  const canCreate = hasPermission('create_job_cards');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ongoing');
  const [search, setSearch] = useState('');
  const [jobCards, setJobCards] = useState([]);
  const [statusCounts, setStatusCounts] = useState({ ongoing: 0, completed: 0, delay: 0 });

  const loadData = useCallback(async (currentFilter, searchKey) => {
    try {
      const res = await taskAPI.getJobCards(currentFilter, searchKey || undefined);
      setJobCards(res.data.job_cards?.data || []);
      if (res.data.status_counts) {
        setStatusCounts(res.data.status_counts);
      }
    } catch (error) {
      console.error('Load job cards error:', error?.response?.data || error);
      if (error?.response?.status !== 403) {
        Alert.alert('Error', 'Could not load job cards. Pull down to retry.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) {
      setLoading(true);
      loadData(filter, search);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, filter]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (canView) {
        loadData(filter, search);
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, canView, filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(filter, search);
    setRefreshing(false);
  }, [loadData, filter, search]);

  if (loading) {
    return <LoadingSpinner message="Loading job cards..." />;
  }

  if (!canView) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedIcon}>🔒</Text>
        <Text style={styles.lockedText}>
          You don't have permission to view job cards.
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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Job Cards</Text>
        {canCreate && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('CreateJobCard')}
          >
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabsRow}>
        {FILTERS.map(f => {
          const count =
            f.key === 'all'
              ? statusCounts.ongoing + statusCounts.completed + statusCounts.delay
              : statusCounts[f.key] ?? 0;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.tab, filter === f.key && styles.tabActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.tabText, filter === f.key && styles.tabTextActive]}>
                {f.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search by job number or phone..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => loadData(filter, search)}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.list}>
        {jobCards.length === 0 ? (
          <Text style={styles.emptyText}>No job cards found.</Text>
        ) : (
          jobCards.map(job => (
            <TouchableOpacity
              key={job.id}
              style={styles.card}
              onPress={() => navigation.navigate('JobCardDetail', { id: job.id })}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{job.job_number}</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: OVERALL_STATUS_COLORS[job.overall_status] || C.accent },
                  ]}
                >
                  <Text style={styles.statusPillText}>
                    {(job.overall_status || 'ongoing').toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSub}>📞 {job.phone_number}</Text>
              <Text style={styles.cardSub}>
                🚚 Delivery: {job.delivery_at ? String(job.delivery_at).replace('T', ' ').substring(0, 16) : '-'}
              </Text>
              <Text style={styles.cardSub}>Tasks: {job.tasks?.length ?? 0}</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: C.textPrimary },
  addBtn: {
    backgroundColor: C.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: C.surface, fontWeight: '600' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 6 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: { backgroundColor: C.accent, borderColor: C.accent },
  tabText: { color: C.textSecondary, fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: C.surface },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
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
    marginBottom: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  cardSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusPillText: { fontSize: 10, fontWeight: '700', color: C.surface },
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

export default JobCardsScreen;

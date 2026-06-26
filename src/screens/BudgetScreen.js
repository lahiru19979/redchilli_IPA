// screens/BudgetScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { costAPI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import SelectField from '../components/SelectField';
import LoadingSpinner from '../components/LoadingSpinner';

const COST_PERMISSION = 'view_finance_master';

const StatusToggle = ({ value, onChange }) => (
  <View style={styles.toggleRow}>
    {[
      { label: 'Active', val: 1 },
      { label: 'Inactive', val: 0 },
    ].map(opt => {
      const active = Number(value) === opt.val;
      return (
        <TouchableOpacity
          key={opt.val}
          style={[styles.toggleBtn, active && styles.toggleBtnActive]}
          onPress={() => onChange(opt.val)}
        >
          <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const StatusBadge = ({ status }) => (
  <Text
    style={[
      styles.badge,
      Number(status) === 1 ? styles.badgeActive : styles.badgeInactive,
    ]}
  >
    {Number(status) === 1 ? 'Active' : 'Inactive'}
  </Text>
);

const BudgetScreen = () => {
  const { hasPermission } = useAuth();
  const canAccess = hasPermission(COST_PERMISSION);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [types, setTypes] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Budget add/edit form
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetEditingId, setBudgetEditingId] = useState(null);
  const [bDescription, setBDescription] = useState('');
  const [bCostType, setBCostType] = useState(null);
  const [bStatus, setBStatus] = useState(1);

  // Timeline add/edit modal
  const [timelineModal, setTimelineModal] = useState(false);
  const [timelineBudget, setTimelineBudget] = useState(null);
  const [timelineEditingId, setTimelineEditingId] = useState(null);
  const [tFrom, setTFrom] = useState('');
  const [tTo, setTTo] = useState('');
  const [tMonthly, setTMonthly] = useState('');
  const [tStatus, setTStatus] = useState(1);

  const loadData = useCallback(async () => {
    try {
      const [metaRes, budgetRes] = await Promise.all([
        costAPI.getMeta(),
        costAPI.getBudgets(),
      ]);
      setTypes(metaRes.data.cost_types || []);
      setBudgets(budgetRes.data.budgets || []);
    } catch (error) {
      console.error('Load budgets error:', error?.response?.data || error);
      if (error?.response?.status !== 403) {
        Alert.alert('Error', 'Could not load budgets. Pull down to retry.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccess) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [canAccess, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const typeOptions = types.map(t => ({ label: t.cost_type, value: t.id }));

  const toggleExpand = id =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // ----- Budget form -----
  const resetBudgetForm = () => {
    setBudgetEditingId(null);
    setBDescription('');
    setBCostType(null);
    setBStatus(1);
  };

  const startEditBudget = budget => {
    setBudgetEditingId(budget.id);
    setBDescription(budget.description || '');
    setBCostType(budget.cost_type);
    setBStatus(Number(budget.status));
    setShowBudgetForm(true);
  };

  const submitBudget = async () => {
    if (!bCostType) {
      Alert.alert('Missing info', 'Please select a cost type.');
      return;
    }
    if (!bDescription.trim()) {
      Alert.alert('Missing info', 'Please enter a description.');
      return;
    }
    const payload = {
      cost_type: bCostType,
      description: bDescription.trim(),
      status: bStatus,
    };
    try {
      setSubmitting(true);
      if (budgetEditingId) {
        await costAPI.updateBudget(budgetEditingId, payload);
        Alert.alert('Success', 'Budget updated.');
      } else {
        await costAPI.createBudget(payload);
        Alert.alert('Success', 'Budget added.');
      }
      resetBudgetForm();
      setShowBudgetForm(false);
      await loadData();
    } catch (error) {
      console.error('Save budget error:', error?.response?.data || error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Could not save. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Timeline form -----
  const openAddTimeline = budget => {
    setTimelineBudget(budget);
    setTimelineEditingId(null);
    setTFrom('');
    setTTo('');
    setTMonthly('');
    setTStatus(1);
    setTimelineModal(true);
  };

  const openEditTimeline = (budget, timeline) => {
    setTimelineBudget(budget);
    setTimelineEditingId(timeline.id);
    setTFrom(timeline.from_day || '');
    setTTo(timeline.to_day || '');
    setTMonthly(timeline.monthly != null ? String(timeline.monthly) : '');
    setTStatus(Number(timeline.status));
    setTimelineModal(true);
  };

  const submitTimeline = async () => {
    if (!tFrom.trim() || !tTo.trim()) {
      Alert.alert('Missing info', 'Please enter both From and To dates.');
      return;
    }
    if (tMonthly && isNaN(Number(tMonthly))) {
      Alert.alert('Invalid amount', 'Monthly must be a number.');
      return;
    }
    try {
      setSubmitting(true);
      if (timelineEditingId) {
        await costAPI.updateTimeline(timelineEditingId, {
          from_day: tFrom.trim(),
          to_day: tTo.trim(),
          monthly: tMonthly || null,
          status: tStatus,
          description: timelineBudget?.description,
        });
        Alert.alert('Success', 'Timeline updated.');
      } else {
        await costAPI.addTimeline({
          budget_id: timelineBudget.id,
          description: timelineBudget?.description,
          from_day: tFrom.trim(),
          to_day: tTo.trim(),
          monthly: tMonthly || null,
          status: tStatus,
        });
        Alert.alert('Success', 'Timeline added.');
      }
      setTimelineModal(false);
      await loadData();
    } catch (error) {
      console.error('Save timeline error:', error?.response?.data || error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Could not save. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading budgets..." />;
  }

  if (!canAccess) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedIcon}>🔒</Text>
        <Text style={styles.lockedText}>
          You don't have permission to view budgets.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Budgets</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              if (showBudgetForm) {
                resetBudgetForm();
              }
              setShowBudgetForm(s => !s);
            }}
          >
            <Text style={styles.addBtnText}>
              {showBudgetForm ? '✕ Close' : '+ Add'}
            </Text>
          </TouchableOpacity>
        </View>

        {showBudgetForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {budgetEditingId ? 'Edit Budget' : 'New Budget'}
            </Text>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Monthly utilities"
              value={bDescription}
              onChangeText={setBDescription}
            />
            <SelectField
              label="Cost Type"
              placeholder="Select cost type"
              options={typeOptions}
              value={bCostType}
              onChange={setBCostType}
            />
            <Text style={styles.fieldLabel}>Status</Text>
            <StatusToggle value={bStatus} onChange={setBStatus} />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={submitBudget}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {budgetEditingId ? 'Update Budget' : 'Save Budget'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.list}>
          {budgets.length === 0 ? (
            <Text style={styles.emptyText}>No budgets defined yet.</Text>
          ) : (
            budgets.map(budget => {
              const timelines = budget.timelines || [];
              const isOpen = !!expanded[budget.id];
              return (
                <View key={budget.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <TouchableOpacity
                      style={styles.cardInfo}
                      onPress={() => timelines.length && toggleExpand(budget.id)}
                      activeOpacity={timelines.length ? 0.6 : 1}
                    >
                      <Text style={styles.cardTitle}>
                        {timelines.length > 0 ? (isOpen ? '▾ ' : '▸ ') : ''}
                        {budget.description}
                      </Text>
                      <Text style={styles.cardSub}>Type: {budget.type || '-'}</Text>
                    </TouchableOpacity>
                    <StatusBadge status={budget.status} />
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionLink}
                      onPress={() => startEditBudget(budget)}
                    >
                      <Text style={styles.actionLinkText}>✎ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionLink}
                      onPress={() => openAddTimeline(budget)}
                    >
                      <Text style={styles.actionLinkText}>+ Timeline</Text>
                    </TouchableOpacity>
                  </View>

                  {isOpen && timelines.length > 0 && (
                    <View style={styles.timelineWrap}>
                      <Text style={styles.timelineHeader}>Timeline History</Text>
                      {timelines.map(tl => (
                        <TouchableOpacity
                          key={tl.id}
                          style={styles.timelineRow}
                          onPress={() => openEditTimeline(budget, tl)}
                          activeOpacity={0.6}
                        >
                          <View style={styles.timelinePeriod}>
                            <Text style={styles.timelineMuted}>Period</Text>
                            <Text style={styles.timelineValue}>
                              {tl.from_day} — {tl.to_day}
                            </Text>
                          </View>
                          <View style={styles.timelineMonthly}>
                            <Text style={styles.timelineMuted}>Monthly</Text>
                            <Text style={styles.timelineValue}>
                              {tl.monthly || 0}
                            </Text>
                          </View>
                          <StatusBadge status={tl.status} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Timeline add/edit modal */}
      <Modal
        visible={timelineModal}
        transparent
        animationType="slide"
        onRequestClose={() => setTimelineModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.formTitle}>
              {timelineEditingId ? 'Edit Timeline' : 'Add Timeline'}
            </Text>
            <Text style={styles.modalSub}>{timelineBudget?.description}</Text>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>From</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={tFrom}
                  onChangeText={setTFrom}
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>To</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={tTo}
                  onChangeText={setTTo}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Monthly Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={tMonthly}
              onChangeText={setTMonthly}
            />

            <Text style={styles.fieldLabel}>Status</Text>
            <StatusToggle value={tStatus} onChange={setTStatus} />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setTimelineModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={submitTimeline}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {timelineEditingId ? 'Update' : 'Add'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  addBtn: {
    backgroundColor: '#27b02e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '600' },
  form: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowItem: { width: '48%' },
  toggleRow: { flexDirection: 'row', marginBottom: 16 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  toggleText: { color: '#666', fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  submitBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  list: { paddingHorizontal: 16 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 30 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfo: { flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  cardSub: { fontSize: 12, color: '#666', marginTop: 2 },
  cardActions: {
    flexDirection: 'row',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  actionLink: { marginRight: 20 },
  actionLinkText: { color: '#007AFF', fontWeight: '600', fontSize: 13 },
  timelineWrap: {
    marginTop: 10,
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 8,
  },
  timelineHeader: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginLeft: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  timelinePeriod: { flex: 1 },
  timelineMonthly: { width: 80 },
  timelineMuted: { fontSize: 10, color: '#999' },
  timelineValue: { fontSize: 13, color: '#333', fontWeight: '500' },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  badgeActive: { backgroundColor: '#e6f7e9', color: '#27b02e' },
  badgeInactive: { backgroundColor: '#fde8e8', color: '#e53935' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 30,
  },
  modalSub: { fontSize: 13, color: '#666', marginBottom: 14 },
  modalButtons: { flexDirection: 'row', marginTop: 8 },
  modalBtn: { flex: 1, marginHorizontal: 4 },
  modalCancel: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#eee',
  },
  modalCancelText: { color: '#444', fontWeight: '700', fontSize: 16 },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f5f5f5',
  },
  lockedIcon: { fontSize: 48, marginBottom: 16 },
  lockedText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
  bottomSpacing: { height: 30 },
});

export default BudgetScreen;

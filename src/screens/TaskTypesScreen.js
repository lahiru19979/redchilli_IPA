// screens/TaskTypesScreen.js

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
import { C } from '../utils/theme';

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

const TaskTypesScreen = () => {
  const { hasPermission } = useAuth();
  const canView = hasPermission('view_task_types');
  const canManage = hasPermission('manage_task_types');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [status, setStatus] = useState(1);

  const filteredItems = items.filter(i =>
    (i.name || '').toLowerCase().includes(search.trim().toLowerCase()),
  );

  const loadData = useCallback(async () => {
    try {
      const res = await taskAPI.getTaskTypes(search || undefined);
      setItems(res.data.task_types?.data || []);
    } catch (error) {
      console.error('Load task types error:', error?.response?.data || error);
      if (error?.response?.status !== 403) {
        Alert.alert('Error', 'Could not load task types. Pull down to retry.');
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canView) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [canView, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setUnitLabel('');
    setStatus(1);
  };

  const startEdit = item => {
    setEditingId(item.id);
    setName(item.name);
    setUnitLabel(item.unit_label || '');
    setStatus(Number(item.status));
    setShowForm(true);
  };

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('Missing info', 'Please enter a task type name.');
      return;
    }
    const payload = { name: name.trim(), unit_label: unitLabel.trim(), status };
    try {
      setSubmitting(true);
      if (editingId) {
        await taskAPI.updateTaskType(editingId, payload);
        Alert.alert('Success', 'Task type updated.');
      } else {
        await taskAPI.createTaskType(payload);
        Alert.alert('Success', 'Task type added.');
      }
      resetForm();
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Save task type error:', error?.response?.data || error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Could not save. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const remove = item => {
    Alert.alert('Delete Task Type', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await taskAPI.deleteTaskType(item.id);
            await loadData();
          } catch (error) {
            Alert.alert(
              'Error',
              error?.response?.data?.message || 'Could not delete this task type.',
            );
          }
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingSpinner message="Loading task types..." />;
  }

  if (!canView) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedIcon}>🔒</Text>
        <Text style={styles.lockedText}>
          You don't have permission to view task types.
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
        <Text style={styles.title}>Task Types</Text>
        {canManage && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              if (showForm) {
                resetForm();
              }
              setShowForm(s => !s);
            }}
          >
            <Text style={styles.addBtnText}>{showForm ? '✕ Close' : '+ Add'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {showForm && canManage && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {editingId ? 'Edit Task Type' : 'New Task Type'}
          </Text>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Printing"
            value={name}
            onChangeText={setName}
          />
          <Text style={styles.fieldLabel}>Unit Label</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. pcs, sheets"
            value={unitLabel}
            onChangeText={setUnitLabel}
          />
          <Text style={styles.fieldLabel}>Status</Text>
          <StatusToggle value={status} onChange={setStatus} />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={C.surface} />
            ) : (
              <Text style={styles.submitBtnText}>
                {editingId ? 'Update' : 'Save'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search task types..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadData}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.list}>
        {filteredItems.length === 0 ? (
          <Text style={styles.emptyText}>
            {search ? 'No matches found.' : 'No task types yet.'}
          </Text>
        ) : (
          filteredItems.map(item => (
            <View key={item.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardBody}
                onPress={() => canManage && startEdit(item)}
                activeOpacity={canManage ? 0.7 : 1}
              >
                <Text style={styles.cardTitle}>{item.name}</Text>
                {!!item.unit_label && (
                  <Text style={styles.cardSubtitle}>Unit: {item.unit_label}</Text>
                )}
                <Text
                  style={[
                    styles.badge,
                    Number(item.status) === 1
                      ? styles.badgeActive
                      : styles.badgeInactive,
                  ]}
                >
                  {Number(item.status) === 1 ? 'Active' : 'Inactive'}
                </Text>
              </TouchableOpacity>
              {canManage && (
                <TouchableOpacity onPress={() => remove(item)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
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
  },
  title: { fontSize: 20, fontWeight: 'bold', color: C.textPrimary },
  addBtn: {
    backgroundColor: C.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: C.surface, fontWeight: '600' },
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
  toggleText: { color: C.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: C.surface },
  submitBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: C.surface, fontWeight: '700', fontSize: 16 },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  cardSubtitle: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  badgeActive: { backgroundColor: C.successLight, color: C.success },
  badgeInactive: { backgroundColor: C.dangerLight, color: C.danger },
  deleteBtn: { paddingLeft: 12, paddingVertical: 6 },
  deleteBtnText: { fontSize: 18 },
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

export default TaskTypesScreen;

// screens/CostTypesScreen.js

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
import { costAPI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
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

const CostTypesScreen = () => {
  const { hasPermission } = useAuth();
  const canAccess = hasPermission(COST_PERMISSION);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState(1);

  const filteredItems = items.filter(i =>
    (i.cost_type || '').toLowerCase().includes(search.trim().toLowerCase()),
  );

  const loadData = useCallback(async () => {
    try {
      const res = await costAPI.getCostTypes();
      setItems(res.data.cost_types || []);
    } catch (error) {
      console.error('Load cost types error:', error?.response?.data || error);
      if (error?.response?.status !== 403) {
        Alert.alert('Error', 'Could not load cost types. Pull down to retry.');
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

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setStatus(1);
  };

  const startEdit = item => {
    setEditingId(item.id);
    setName(item.cost_type);
    setStatus(Number(item.status));
    setShowForm(true);
  };

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('Missing info', 'Please enter a cost type name.');
      return;
    }
    const payload = { cost_type: name.trim(), status };
    try {
      setSubmitting(true);
      if (editingId) {
        await costAPI.updateCostType(editingId, payload);
        Alert.alert('Success', 'Cost type updated.');
      } else {
        await costAPI.createCostType(payload);
        Alert.alert('Success', 'Cost type added.');
      }
      resetForm();
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Save cost type error:', error?.response?.data || error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Could not save. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading cost types..." />;
  }

  if (!canAccess) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedIcon}>🔒</Text>
        <Text style={styles.lockedText}>
          You don't have permission to manage cost types.
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
        <Text style={styles.title}>Cost Types</Text>
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
      </View>

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {editingId ? 'Edit Cost Type' : 'New Cost Type'}
          </Text>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Utilities"
            value={name}
            onChangeText={setName}
          />
          <Text style={styles.fieldLabel}>Status</Text>
          <StatusToggle value={status} onChange={setStatus} />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
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
          placeholder="🔍 Search cost types..."
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.list}>
        {filteredItems.length === 0 ? (
          <Text style={styles.emptyText}>
            {search ? 'No matches found.' : 'No cost types yet.'}
          </Text>
        ) : (
          filteredItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => startEdit(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.cost_type}</Text>
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
              </View>
              <Text style={styles.editHint}>Edit ›</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
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
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  list: { paddingHorizontal: 16 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 30 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
  },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#333', flex: 1 },
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
  editHint: { color: '#007AFF', fontSize: 13, marginLeft: 10 },
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

export default CostTypesScreen;

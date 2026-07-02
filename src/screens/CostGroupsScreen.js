// screens/CostGroupsScreen.js

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
import SelectField from '../components/SelectField';
import LoadingSpinner from '../components/LoadingSpinner';
import { C } from '../utils/theme';

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

const CostGroupsScreen = () => {
  const { hasPermission } = useAuth();
  const canAccess = hasPermission(COST_PERMISSION);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [costType, setCostType] = useState(null);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState(1);

  const filteredItems = items.filter(i => {
    const q = search.trim().toLowerCase();
    return (
      (i.cost_code || '').toLowerCase().includes(q) ||
      (i.type_name || '').toLowerCase().includes(q)
    );
  });

  const loadData = useCallback(async () => {
    try {
      const [codesRes, typesRes] = await Promise.all([
        costAPI.getCostCodes(),
        costAPI.getCostTypes(),
      ]);
      setItems(codesRes.data.cost_codes || []);
      setTypes(typesRes.data.cost_types || []);
    } catch (error) {
      console.error('Load cost groups error:', error?.response?.data || error);
      if (error?.response?.status !== 403) {
        Alert.alert('Error', 'Could not load cost groups. Pull down to retry.');
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

  const resetForm = () => {
    setEditingId(null);
    setCostType(null);
    setCode('');
    setStatus(1);
  };

  const startEdit = item => {
    setEditingId(item.id);
    setCostType(item.cost_type);
    setCode(item.cost_code);
    setStatus(Number(item.status));
    setShowForm(true);
  };

  const submit = async () => {
    if (!costType) {
      Alert.alert('Missing info', 'Please select a cost type.');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Missing info', 'Please enter a cost group / code.');
      return;
    }
    const payload = { cost_type: costType, cost_code: code.trim(), status };
    try {
      setSubmitting(true);
      if (editingId) {
        await costAPI.updateCostCode(editingId, payload);
        Alert.alert('Success', 'Cost group updated.');
      } else {
        await costAPI.createCostCode(payload);
        Alert.alert('Success', 'Cost group added.');
      }
      resetForm();
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Save cost group error:', error?.response?.data || error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Could not save. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading cost groups..." />;
  }

  if (!canAccess) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedIcon}>🔒</Text>
        <Text style={styles.lockedText}>
          You don't have permission to manage cost groups.
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
        <Text style={styles.title}>Cost Groups</Text>
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
            {editingId ? 'Edit Cost Group' : 'New Cost Group'}
          </Text>
          <SelectField
            label="Cost Type"
            placeholder="Select cost type"
            options={typeOptions}
            value={costType}
            onChange={setCostType}
          />
          <Text style={styles.fieldLabel}>Cost Group / Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Electricity"
            value={code}
            onChangeText={setCode}
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
          placeholder="🔍 Search cost groups..."
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.list}>
        {filteredItems.length === 0 ? (
          <Text style={styles.emptyText}>
            {search ? 'No matches found.' : 'No cost groups yet.'}
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
                <Text style={styles.cardTitle}>{item.cost_code}</Text>
                <Text style={styles.cardSub}>
                  Type: {item.type_name || '-'}
                </Text>
              </View>
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
    elevation: 2,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  cardSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
  },
  badgeActive: { backgroundColor: C.successLight, color: C.success },
  badgeInactive: { backgroundColor: C.dangerLight, color: C.danger },
  editHint: { color: C.accent, fontSize: 13 },
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

export default CostGroupsScreen;

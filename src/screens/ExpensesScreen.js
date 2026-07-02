// screens/ExpensesScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import { costAPI, MEDIA_BASE_URL } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import SelectField from '../components/SelectField';
import LoadingSpinner from '../components/LoadingSpinner';
import { C } from '../utils/theme';

const COST_PERMISSION = 'view_finance_master'; // Permission to access the Cost module

const ExpensesScreen = () => {
  const { hasPermission } = useAuth();
  const canAccess = hasPermission(COST_PERMISSION);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [meta, setMeta] = useState({ types: [], codes: [], descriptions: [] });

  // Add/Edit-form state
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [costType, setCostType] = useState(null);
  const [costCode, setCostCode] = useState(null);
  const [costDes, setCostDes] = useState(null);
  const [amount, setAmount] = useState('');
  const [photo, setPhoto] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [metaRes, expRes] = await Promise.all([
        costAPI.getMeta(),
        costAPI.getExpenses(),
      ]);
      setMeta({
        types: metaRes.data.cost_types || [],
        codes: metaRes.data.cost_codes || [],
        descriptions: metaRes.data.cost_descriptions || [],
      });
      setExpenses(expRes.data.expenses || []);
    } catch (error) {
      console.error('Load expenses error:', error?.response?.data || error);
      if (error?.response?.status !== 403) {
        Alert.alert('Error', 'Could not load expenses. Pull down to retry.');
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

  // Cascading options
  const codeOptions = meta.codes
    .filter(c => !costType || String(c.cost_type) === String(costType))
    .map(c => ({ label: c.cost_code, value: c.id }));

  const desOptions = meta.descriptions
    .filter(d => !costCode || String(d.cost_code) === String(costCode))
    .map(d => ({ label: d.cost_des, value: d.id }));

  const typeOptions = meta.types.map(t => ({ label: t.cost_type, value: t.id }));

  const pickPhoto = async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 1200,
        height: 1200,
        cropping: false,
        compressImageQuality: 0.8,
        mediaType: 'photo',
      });
      setPhoto({
        uri: image.path,
        type: image.mime || 'image/jpeg',
        name: image.filename || `expense_${Date.now()}.jpg`,
      });
    } catch (e) {
      // user cancelled - ignore
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setExistingImage(null);
    setCostType(null);
    setCostCode(null);
    setCostDes(null);
    setAmount('');
    setPhoto(null);
  };

  const startEdit = item => {
    setEditingId(item.id);
    // Derive the parent cost type from the selected cost code
    const parentCode = meta.codes.find(
      c => String(c.id) === String(item.cost_code),
    );
    setCostType(parentCode ? parentCode.cost_type : null);
    setCostCode(item.cost_code);
    setCostDes(item.cost_des);
    setAmount(item.amount != null ? String(item.amount) : '');
    setExistingImage(item.imageurl || null);
    setPhoto(null);
    setShowForm(true);
  };

  const submit = async () => {
    if (!costCode || !costDes) {
      Alert.alert('Missing info', 'Please select a cost code and description.');
      return;
    }
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Missing info', 'Please enter a valid amount.');
      return;
    }

    const formData = new FormData();
    formData.append('cost_code', String(costCode));
    formData.append('cost_des', String(costDes));
    formData.append('amount', String(amount));
    if (photo) {
      formData.append('att', photo);
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await costAPI.updateExpense(editingId, formData);
        Alert.alert('Success', 'Expense updated successfully.');
      } else {
        await costAPI.createExpense(formData);
        Alert.alert('Success', 'Expense added successfully.');
      }
      resetForm();
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Save expense error:', error?.response?.data || error);
      const msg =
        error?.response?.data?.message ||
        'Could not save the expense. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading expenses..." />;
  }

  if (!canAccess) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedIcon}>🔒</Text>
        <Text style={styles.lockedText}>
          You don't have permission to view expenses.{'\n'}Please contact your
          administrator.
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
        <Text style={styles.title}>Expenses</Text>
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
            {editingId ? 'Edit Expense' : 'New Expense'}
          </Text>
          <SelectField
            label="Cost Type"
            placeholder="Select cost type"
            options={typeOptions}
            value={costType}
            onChange={v => {
              setCostType(v);
              setCostCode(null);
              setCostDes(null);
            }}
          />
          <SelectField
            label="Cost Code"
            placeholder="Select cost code"
            options={codeOptions}
            value={costCode}
            onChange={v => {
              setCostCode(v);
              setCostDes(null);
            }}
          />
          <SelectField
            label="Cost Description"
            placeholder="Select description"
            options={desOptions}
            value={costDes}
            onChange={setCostDes}
          />

          <Text style={styles.fieldLabel}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.fieldLabel}>Receipt Photo (optional)</Text>
          {photo ? (
            <View style={styles.photoPreviewRow}>
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              <TouchableOpacity onPress={() => setPhoto(null)}>
                <Text style={styles.removePhoto}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : existingImage ? (
            <View style={styles.photoPreviewRow}>
              <Image
                source={{ uri: `${MEDIA_BASE_URL}/${existingImage}` }}
                style={styles.photoPreview}
              />
              <TouchableOpacity onPress={pickPhoto}>
                <Text style={styles.photoBtnText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
              <Text style={styles.photoBtnText}>📷 Choose Photo</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={C.surface} />
            ) : (
              <Text style={styles.submitBtnText}>
                {editingId ? 'Update Expense' : 'Save Expense'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.list}>
        {expenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses recorded yet.</Text>
        ) : (
          expenses.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => startEdit(item)}
              activeOpacity={0.7}
            >
              {item.imageurl ? (
                <Image
                  source={{ uri: `${MEDIA_BASE_URL}/${item.imageurl}` }}
                  style={styles.thumb}
                />
              ) : (
                <View style={styles.thumbPlaceholder}>
                  <Text style={styles.thumbIcon}>🧾</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.des || 'Expense'}</Text>
                <Text style={styles.cardSub}>Code: {item.code || '-'}</Text>
                <Text style={styles.cardDate}>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString()
                    : ''}
                </Text>
              </View>
              <Text style={styles.cardAmount}>Rs {item.amount}</Text>
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
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 6,
  },
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
  photoBtn: {
    borderWidth: 1,
    borderColor: C.accent,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  photoBtnText: { color: C.accent, fontWeight: '600' },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPreview: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  removePhoto: { color: C.danger, fontWeight: '600' },
  submitBtn: {
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
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  thumb: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  thumbPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: C.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  cardSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  cardDate: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  cardAmount: { fontSize: 16, fontWeight: 'bold', color: C.success },
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

export default ExpensesScreen;

// screens/CreateJobCardScreen.js

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
import LoadingSpinner from '../components/LoadingSpinner';
import DateTimeField from '../components/DateTimeField';
import { C } from '../utils/theme';

const CreateJobCardScreen = ({ route, navigation }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [taskTypes, setTaskTypes] = useState([]);
  const [users, setUsers] = useState([]);

  // Opened from a WhatsApp chat's Jobs panel, the customer's number comes
  // through so the agent does not have to retype it.
  const [phoneNumber, setPhoneNumber] = useState(route.params?.phone || '');

  // Coming from a chat, the number is the customer's and must not drift from
  // it: an edit here would file the job against someone else. Opened from the
  // job list there is no customer yet, so it stays typeable.
  const fixedPhone = !!route.params?.phone;
  const [deliveryAt, setDeliveryAt] = useState('');
  const [selectedTypes, setSelectedTypes] = useState({}); // { [taskTypeId]: true }
  const [assignedUser, setAssignedUser] = useState({}); // { [taskTypeId]: userId }
  const [qty, setQty] = useState({}); // { [taskTypeId]: string }

  // Passed in, this screen edits that card instead of opening a blank one. The
  // fields are identical, so an edit screen would only be this one duplicated.
  const jobId = route.params?.jobId ?? null;
  const editing = jobId != null;

  // Task types the card already has under way. Their assignee is the transfer
  // flow's to change, and dropping one would discard the times its owner
  // recorded, so both are locked here — matching the web.
  const [startedTypes, setStartedTypes] = useState({});

  const loadData = useCallback(async () => {
    try {
      const [typesRes, usersRes] = await Promise.all([
        taskAPI.getTaskTypes(),
        taskAPI.getTaskUsers(),
      ]);
      const types = (typesRes.data.task_types?.data || []).filter(
        t => Number(t.status) === 1,
      );
      setTaskTypes(types);
      setUsers(usersRes.data.users || []);

      if (editing) {
        const card = (await taskAPI.getJobCard(jobId)).data.job_card;

        setPhoneNumber(card.phone_number || '');
        // The API sends 'YYYY-MM-DD HH:mm:ss'; the picker wants minutes.
        setDeliveryAt(card.delivery_at ? String(card.delivery_at).slice(0, 16) : '');

        const chosen = {};
        const started = {};
        const assigned = {};
        const quantities = {};

        (card.tasks || []).forEach(task => {
          const typeId = String(task.task_type_id);

          chosen[typeId] = true;
          if (task.actual_start_at) started[typeId] = true;
          if (task.assigned_user_id) assigned[typeId] = task.assigned_user_id;
          if (task.qty != null) quantities[typeId] = String(task.qty);
        });

        setSelectedTypes(chosen);
        setStartedTypes(started);
        setAssignedUser(assigned);
        setQty(quantities);
      }
    } catch (error) {
      console.error('Load job card form data error:', error?.response?.data || error);
      Alert.alert('Error', 'Could not load task types / users.');
    } finally {
      setLoading(false);
    }
  }, [editing, jobId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit Job Card' : 'Create Job Card' });
  }, [navigation, editing]);

  const toggleType = id => {
    if (startedTypes[id]) {
      Alert.alert(
        'Already started',
        'Somebody has started this task, so it cannot be taken off the card. '
          + 'Its quantity can still be changed.',
      );
      return;
    }

    setSelectedTypes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const submit = async () => {
    const chosenIds = Object.keys(selectedTypes).filter(id => selectedTypes[id]);

    if (!phoneNumber.trim()) {
      Alert.alert('Missing info', 'Please enter a phone number.');
      return;
    }
    if (!deliveryAt.trim()) {
      Alert.alert('Missing info', 'Please enter the delivery date/time.');
      return;
    }
    if (chosenIds.length === 0) {
      Alert.alert('Missing info', 'Please select at least one task.');
      return;
    }

    const payload = {
      phone_number: phoneNumber.trim(),
      delivery_at: deliveryAt.trim(),
      tasks: chosenIds,
      assigned_user: {},
      qty: {},
    };
    chosenIds.forEach(id => {
      if (assignedUser[id]) payload.assigned_user[id] = assignedUser[id];
      if (qty[id]) payload.qty[id] = qty[id];
    });

    try {
      setSubmitting(true);

      const res = editing
        ? await taskAPI.updateJobCard(jobId, payload)
        : await taskAPI.createJobCard(payload);

      Alert.alert(
        'Success',
        res.data.message || (editing ? 'Job card updated.' : 'Job card created.'),
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      console.error('Save job card error:', error?.response?.data || error);
      Alert.alert(
        'Error',
        error?.response?.data?.message
          || (editing ? 'Could not update the job card.' : 'Could not create the job card.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading form..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.fieldLabel}>Phone Number</Text>
        <TextInput
          style={[styles.input, fixedPhone && styles.inputFixed]}
          placeholder="07XXXXXXXX"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          editable={!fixedPhone}
        />

        <DateTimeField
          label="Delivery Date/Time (Sri Lanka time)"
          value={deliveryAt}
          onChange={setDeliveryAt}
          placeholder="Select delivery date & time"
        />

        <Text style={styles.sectionTitle}>Select Tasks</Text>

        {taskTypes.length === 0 ? (
          <Text style={styles.emptyText}>No active task types available.</Text>
        ) : (
          taskTypes.map(t => {
            const selected = !!selectedTypes[t.id];
            return (
              <View key={t.id} style={styles.taskCard}>
                <TouchableOpacity
                  style={styles.taskHeader}
                  onPress={() => toggleType(t.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                    {selected && <Text style={styles.checkboxMark}>✓</Text>}
                  </View>
                  <Text style={styles.taskName}>
                    {t.name}
                    {t.unit_label ? ` (${t.unit_label})` : ''}
                  </Text>
                </TouchableOpacity>

                {selected && (
                  <View style={styles.taskDetails}>
                    <Text style={styles.fieldLabelSmall}>Assign to</Text>
                    <View style={styles.userRow}>
                      {users.map(u => {
                        const active = String(assignedUser[t.id]) === String(u.id);
                        return (
                          <TouchableOpacity
                            key={u.id}
                            style={[styles.userChip, active && styles.userChipActive]}
                            onPress={() =>
                              setAssignedUser(prev => ({ ...prev, [t.id]: u.id }))
                            }
                          >
                            <Text
                              style={[
                                styles.userChipText,
                                active && styles.userChipTextActive,
                              ]}
                            >
                              {u.first_name} {u.last_name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={styles.fieldLabelSmall}>Quantity</Text>
                    <TextInput
                      style={styles.inputSmall}
                      placeholder="Qty"
                      keyboardType="numeric"
                      value={qty[t.id] || ''}
                      onChangeText={v => setQty(prev => ({ ...prev, [t.id]: v }))}
                    />

                    <Text style={styles.scheduleNote}>
                      The assigned member will set their own expected start/end time from My Tasks.
                    </Text>
                  </View>
                )}
              </View>
            );
          })
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
              {editing ? 'Save Changes' : 'Create Job Card'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  form: { padding: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: C.textPrimary, marginBottom: 6 },
  fieldLabelSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSecondary,
    marginTop: 10,
    marginBottom: 4,
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
  // Reads as filled in rather than broken: greyed, but the number stays legible.
  inputFixed: {
    backgroundColor: C.bg,
    color: C.textSecondary,
  },
  inputSmall: {
    backgroundColor: C.bgAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 10 },
  emptyText: { color: C.textSecondary, marginBottom: 16 },
  taskCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  taskHeader: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.border,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: C.accent, borderColor: C.accent },
  checkboxMark: { color: C.surface, fontWeight: '700', fontSize: 13 },
  taskName: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  taskDetails: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.divider },
  scheduleNote: {
    fontSize: 11,
    color: C.textSecondary,
    fontStyle: 'italic',
    marginTop: 10,
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
  userChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  userChipText: { fontSize: 12, color: C.textSecondary },
  userChipTextActive: { color: C.surface, fontWeight: '600' },
  submitBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: C.surface, fontWeight: '700', fontSize: 16 },
  bottomSpacing: { height: 30 },
});

export default CreateJobCardScreen;

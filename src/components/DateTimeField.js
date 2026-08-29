// components/DateTimeField.js
//
// A tappable input that opens the native calendar (then clock) picker and
// reports the chosen value back as a 'YYYY-MM-DD HH:MM' string, matching the
// format the Task Manager API endpoints expect.
//
// Pass dateOnly when the time of day is not part of the answer — a delivery
// date range, say — and it stops after the calendar and reports 'YYYY-MM-DD'.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { C } from '../utils/theme';

const pad = n => String(n).padStart(2, '0');

const formatDate = date =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatValue = (date, dateOnly) =>
  dateOnly
    ? formatDate(date)
    : `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

const parseValue = value => {
  if (!value) return new Date();
  const parsed = new Date(value.replace(' ', 'T'));
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// stage: null (closed) | 'date' | 'time'
const DateTimeField = ({
  label,
  value,
  onChange,
  placeholder = 'Select date & time',
  compact = false,
  dateOnly = false,
}) => {
  const [stage, setStage] = useState(null);
  const [draft, setDraft] = useState(null);

  const open = () => {
    setDraft(parseValue(value));
    setStage('date');
  };

  const handleChange = (event, selected) => {
    if (event.type === 'dismissed') {
      setStage(null);
      return;
    }

    if (stage === 'date') {
      const next = selected || draft;
      setDraft(next);

      if (dateOnly) {
        onChange(formatValue(next, true));
        setStage(null);
      } else if (Platform.OS === 'android') {
        setStage('time');
      } else {
        // iOS spinner already includes both date and time in one picker.
        onChange(formatValue(next));
        setStage(null);
      }
    } else if (stage === 'time') {
      const next = selected || draft;
      setDraft(next);
      onChange(formatValue(next));
      setStage(null);
    }
  };

  return (
    <View>
      {!!label && <Text style={compact ? styles.labelSmall : styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, compact && styles.inputCompact]}
        onPress={open}
        activeOpacity={0.7}
      >
        <Text
          style={[
            value ? styles.valueText : styles.placeholderText,
            compact && styles.textCompact,
          ]}
        >
          {value || placeholder}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {stage && (
        <DateTimePicker
          value={draft || new Date()}
          mode={dateOnly ? 'date' : Platform.OS === 'ios' ? 'datetime' : stage}
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: C.textPrimary, marginBottom: 6 },
  labelSmall: {
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
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputCompact: {
    backgroundColor: C.bgAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 0,
  },
  valueText: { fontSize: 15, color: C.textPrimary },
  placeholderText: { fontSize: 15, color: C.textPlaceholder },
  textCompact: { fontSize: 13 },
  icon: { fontSize: 16 },
});

export default DateTimeField;

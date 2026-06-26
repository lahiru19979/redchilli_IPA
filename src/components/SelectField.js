// components/SelectField.js
// Lightweight modal-based dropdown so we don't need a native picker dependency.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
} from 'react-native';

/**
 * @param {string}   label       Field label shown above the control
 * @param {Array}    options     [{ label, value }]
 * @param {any}      value       currently selected value
 * @param {Function} onChange    (value) => void
 * @param {string}   placeholder text shown when nothing is selected
 * @param {boolean}  disabled    disables opening the dropdown
 */
const SelectField = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);

  const selected = options.find(o => String(o.value) === String(value));

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={[styles.control, disabled && styles.controlDisabled]}
        activeOpacity={0.7}
        onPress={() => !disabled && setOpen(true)}
      >
        <Text style={selected ? styles.valueText : styles.placeholderText}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label || 'Select'}</Text>
            {options.length === 0 ? (
              <Text style={styles.emptyText}>No options available</Text>
            ) : (
              <FlatList
                data={options}
                keyExtractor={item => String(item.value)}
                renderItem={({ item }) => {
                  const isSelected = String(item.value) === String(value);
                  return (
                    <TouchableOpacity
                      style={[styles.option, isSelected && styles.optionSelected]}
                      onPress={() => {
                        onChange(item.value);
                        setOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {isSelected ? <Text style={styles.check}>✓</Text> : null}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  control: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlDisabled: {
    backgroundColor: '#f0f0f0',
  },
  valueText: {
    fontSize: 15,
    color: '#222',
    flex: 1,
  },
  placeholderText: {
    fontSize: 15,
    color: '#999',
    flex: 1,
  },
  chevron: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 14,
    maxHeight: '70%',
    paddingVertical: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionSelected: {
    backgroundColor: '#f0f7ff',
  },
  optionText: {
    fontSize: 15,
    color: '#333',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  check: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: '#999',
  },
});

export default SelectField;

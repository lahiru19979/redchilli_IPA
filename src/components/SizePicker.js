// components/SizePicker.js

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SIZES, NUMERIC_SIZES } from '../utils/sizes';

const { width } = Dimensions.get('window');

const SizePicker = ({
  visible,
  selectedSize,
  onSelect,
  onClose,
  sizeType = 'letter', // 'letter', 'numeric', or 'all'
  title = 'Select Size',
}) => {
  const getSizes = () => {
    if (sizeType === 'numeric') return NUMERIC_SIZES;
    if (sizeType === 'all') return [...SIZES, ...NUMERIC_SIZES];
    return SIZES;
  };

  const sizes = getSizes();

  const handleSelect = (sizeId) => {
    onSelect(sizeId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Size Grid */}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.sizeGrid}
            showsVerticalScrollIndicator={false}>
            {sizes.map((size) => {
              const isSelected = selectedSize === size.id;
              return (
                <TouchableOpacity
                  key={size.id}
                  style={[
                    styles.sizeItem,
                    isSelected && styles.sizeItemSelected,
                  ]}
                  onPress={() => handleSelect(size.id)}>
                  <Text
                    style={[
                      styles.sizeName,
                      isSelected && styles.sizeNameSelected,
                    ]}>
                    {size.name}
                  </Text>
                  <Text
                    style={[
                      styles.sizeLabel,
                      isSelected && styles.sizeLabelSelected,
                    ]}>
                    {size.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Size Chart Button (Optional) */}
          <TouchableOpacity style={styles.sizeChartBtn}>
            <Text style={styles.sizeChartText}>📏 View Size Chart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    maxHeight: 400,
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  sizeItem: {
    width: (width - 56) / 3,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
    position: 'relative',
  },
  sizeItemSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  sizeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sizeNameSelected: {
    color: '#007AFF',
  },
  sizeLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  sizeLabelSelected: {
    color: '#007AFF',
  },
  checkmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sizeChartBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  sizeChartText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default SizePicker;
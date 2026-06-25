import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {PRODUCT_COLORS} from '../utils/colors';

const ColorPicker = ({visible, selectedColor, onSelect, onClose}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Color</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Color Grid */}
          <ScrollView contentContainerStyle={styles.colorGrid}>
            {PRODUCT_COLORS.map((color) => (
              <TouchableOpacity
                key={color.id}
                style={[
                  styles.colorItem,
                  selectedColor === color.id && styles.colorItemSelected,
                ]}
                onPress={() => {
                  onSelect(color.id);
                  onClose();
                }}>
                <View
                  style={[
                    styles.colorCircle,
                    {backgroundColor: color.code},
                    color.id === 'white' && styles.colorCircleBorder,
                  ]}>
                  {selectedColor === color.id && (
                    <Text
                      style={[
                        styles.checkMark,
                        {color: color.id === 'white' || color.id === 'yellow' || color.id === 'cream' || color.id === 'beige' ? '#000' : '#fff'},
                      ]}>
                      ✓
                    </Text>
                  )}
                </View>
                <Text style={styles.colorName}>{color.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeBtn: {
    fontSize: 24,
    color: '#999',
    padding: 4,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'flex-start',
  },
  colorItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  colorItemSelected: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
  },
  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  colorCircleBorder: {
    borderWidth: 2,
    borderColor: '#ddd',
  },
  checkMark: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  colorName: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  cancelBtn: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 20,
  },
  cancelBtnText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default ColorPicker;
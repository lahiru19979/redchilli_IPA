// screens/ScannedItemsScreen.js
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import scannedItemsStore from '../store/scannedItemsStore';
import {inventoryAPI} from '../api/apiClient';  // ✅ Your API
import { C } from '../utils/theme';

const ScannedItemsScreen = ({navigation}) => {
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setItems([...scannedItemsStore.getItems()]);

    const unsubscribe = scannedItemsStore.subscribe(updatedItems => {
      setItems([...updatedItems]);
    });

    return unsubscribe;
  }, []);

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditQuantity(item.quantity.toString());
    setShowEditModal(true);
  };

  const saveEditedQuantity = () => {
    if (editingItem) {
      const qty = parseInt(editQuantity) || 1;
      scannedItemsStore.updateQuantity(editingItem.id, qty);
      setShowEditModal(false);
      setEditingItem(null);
      setEditQuantity('');
    }
  };

  const handleIncrement = (id) => {
    scannedItemsStore.incrementQuantity(id);
  };

  const handleDecrement = (id) => {
    scannedItemsStore.decrementQuantity(id);
  };

  const handleDelete = (id, barcode) => {
    Alert.alert(
      'Delete Item',
      `Remove "${barcode}" from list?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => scannedItemsStore.removeItem(id),
        },
      ],
    );
  };

  const handleClearAll = () => {
    if (items.length === 0) return;
    
    Alert.alert(
      'Clear All',
      'Remove all scanned items?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => scannedItemsStore.clearAll(),
        },
      ],
    );
  };

  // ✅ Save with your inventoryAPI.saveInventory
  const handleSave = async () => {
    if (items.length === 0) {
      Alert.alert('No Items', 'Please scan items before saving.');
      return;
    }

    setIsSaving(true);

    try {
      // ✅ Prepare data for your Laravel API
      const inventoryData = {
        items: items.map(item => ({
          barcode: item.barcode,
          quantity: item.quantity,
        })),
        total_items: items.length,
        total_quantity: totalQuantity,
      };

      console.log('📦 Saving inventory:', JSON.stringify(inventoryData, null, 2));

      // ✅ Call your API
      const response = await inventoryAPI.saveInventory(inventoryData);

      console.log('✅ API Response:', response.data);

      // Handle success
      Alert.alert(
        'Saved Successfully! ✅',
        `${items.length} items saved\nTotal quantity: ${totalQuantity}`,
        [
          {
            text: 'Scan More',
            onPress: () => {
              scannedItemsStore.clearAll();
              navigation.goBack();
            },
          },
          {
            text: 'Go Home',
            onPress: () => {
              scannedItemsStore.clearAll();
              navigation.navigate('Home');
            },
          },
        ],
      );
    } catch (error) {
      console.error('❌ Save error:', error);
      console.error('❌ Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error
        || error.message 
        || 'Failed to save. Please try again.';
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.cellNo]}>#</Text>
      <Text style={[styles.headerCell, styles.cellBarcode]}>Barcode</Text>
      <Text style={[styles.headerCell, styles.cellQty]}>Quantity</Text>
      <Text style={[styles.headerCell, styles.cellAction]}>Action</Text>
    </View>
  );

  const renderItem = ({item, index}) => (
    <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
      <Text style={[styles.cell, styles.cellNo]}>{index + 1}</Text>
      
      <Text style={[styles.cell, styles.cellBarcode]} numberOfLines={1}>
        {item.barcode}
      </Text>
      
      <View style={[styles.cellQty, styles.qtyContainer]}>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => handleDecrement(item.id)}>
          <Text style={styles.qtyButtonText}>−</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => openEditModal(item)}>
          <Text style={styles.qtyValue}>{item.quantity}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => handleIncrement(item.id)}>
          <Text style={styles.qtyButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[styles.cellAction, styles.deleteBtn]}
        onPress={() => handleDelete(item.id, item.barcode)}>
        <Text style={styles.deleteButton}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyTitle}>No Items Scanned</Text>
      <Text style={styles.emptyText}>
        Scan barcodes to add items to the list
      </Text>
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.goBack()}>
        <Text style={styles.scanButtonText}>📷 Start Scanning</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scanned Items</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearAll}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Items</Text>
          <Text style={styles.summaryValue}>{items.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Quantity</Text>
          <Text style={styles.summaryValue}>{totalQuantity}</Text>
        </View>
      </View>

      {/* Table */}
      {items.length > 0 ? (
        <View style={styles.tableContainer}>
          {renderTableHeader()}
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        renderEmptyList()
      )}

      {/* Bottom Actions */}
      {items.length > 0 && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.continueScanButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.continueScanText}>📷 Scan More</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color={C.surface} />
            ) : (
              <Text style={styles.saveButtonText}>💾 Save ({totalQuantity})</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Quantity Modal */}
      <Modal
        visible={showEditModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <Text style={styles.editModalTitle}>Edit Quantity</Text>
            
            {editingItem && (
              <Text style={styles.editModalBarcode}>
                {editingItem.barcode}
              </Text>
            )}
            
            <View style={styles.editQtyRow}>
              <TouchableOpacity
                style={styles.editQtyButton}
                onPress={() => {
                  const newQty = Math.max(1, parseInt(editQuantity) - 1);
                  setEditQuantity(newQty.toString());
                }}>
                <Text style={styles.editQtyButtonText}>−</Text>
              </TouchableOpacity>
              
              <TextInput
                style={styles.editQtyInput}
                value={editQuantity}
                onChangeText={setEditQuantity}
                keyboardType="number-pad"
                selectTextOnFocus={true}
                textAlign="center"
              />
              
              <TouchableOpacity
                style={styles.editQtyButton}
                onPress={() => {
                  const newQty = parseInt(editQuantity) + 1;
                  setEditQuantity(newQty.toString());
                }}>
                <Text style={styles.editQtyButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={styles.editCancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}>
                <Text style={styles.editCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.editSaveButton}
                onPress={saveEditedQuantity}>
                <Text style={styles.editSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.surface,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: C.accent,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.textPrimary,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: C.danger,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    padding: 16,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: C.textPrimary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: C.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: C.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: C.accent,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: C.surface,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: C.textPrimary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.accent,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  headerCell: {
    color: C.surface,
    fontWeight: 'bold',
    fontSize: 14,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: C.bg,
  },
  cell: {
    fontSize: 14,
    color: C.textPrimary,
  },
  cellNo: {
    width: 35,
    textAlign: 'center',
  },
  cellBarcode: {
    flex: 1,
    paddingRight: 8,
  },
  cellQty: {
    width: 110,
  },
  cellAction: {
    width: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButton: {
    width: 30,
    height: 30,
    backgroundColor: C.accent,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: {
    color: C.surface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: C.textPrimary,
    minWidth: 40,
    textAlign: 'center',
    paddingVertical: 4,
  },
  deleteBtn: {
    padding: 5,
  },
  deleteButton: {
    fontSize: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: C.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  scanButton: {
    backgroundColor: C.accent,
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 12,
  },
  scanButtonText: {
    color: C.surface,
    fontSize: 18,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 12,
  },
  continueScanButton: {
    flex: 1,
    backgroundColor: C.textSecondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueScanText: {
    color: C.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: C.success,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: C.successLight,
  },
  saveButtonText: {
    color: C.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModal: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 350,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  editModalBarcode: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: C.bg,
    padding: 8,
    borderRadius: 8,
  },
  editQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  editQtyButton: {
    width: 50,
    height: 50,
    backgroundColor: C.accent,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editQtyButtonText: {
    color: C.surface,
    fontSize: 28,
    fontWeight: 'bold',
  },
  editQtyInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: C.textPrimary,
    minWidth: 80,
    textAlign: 'center',
    marginHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: C.accent,
    paddingVertical: 8,
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: 'center',
  },
  editCancelButtonText: {
    fontSize: 16,
    color: C.textSecondary,
    fontWeight: '600',
  },
  editSaveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: C.accent,
    alignItems: 'center',
  },
  editSaveButtonText: {
    fontSize: 16,
    color: C.surface,
    fontWeight: '600',
  },
});

export default ScannedItemsScreen;
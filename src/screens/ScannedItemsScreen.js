// screens/ScannedItemsScreen.js
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import scannedItemsStore from '../store/scannedItemsStore';

const ScannedItemsScreen = ({navigation}) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    // Get initial items
    setItems([...scannedItemsStore.getItems()]);

    // Subscribe to updates
    const unsubscribe = scannedItemsStore.subscribe(updatedItems => {
      setItems([...updatedItems]);
    });

    return unsubscribe;
  }, []);

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

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.cellNo]}>#</Text>
      <Text style={[styles.headerCell, styles.cellBarcode]}>Barcode</Text>
      <Text style={[styles.headerCell, styles.cellQty]}>Qty</Text>
      <Text style={[styles.headerCell, styles.cellTime]}>Time</Text>
      <Text style={[styles.headerCell, styles.cellAction]}>Action</Text>
    </View>
  );

  const renderItem = ({item, index}) => (
    <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
      <Text style={[styles.cell, styles.cellNo]}>{index + 1}</Text>
      <Text style={[styles.cell, styles.cellBarcode]} numberOfLines={1}>
        {item.barcode}
      </Text>
      <Text style={[styles.cell, styles.cellQty]}>{item.quantity}</Text>
      <Text style={[styles.cell, styles.cellTime]}>{item.lastScanned}</Text>
      <TouchableOpacity
        style={[styles.cell, styles.cellAction]}
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

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

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
            <Text style={styles.continueScanText}>📷 Continue Scanning</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
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
    backgroundColor: '#e0e0e0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  headerCell: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#f9f9f9',
  },
  cell: {
    fontSize: 14,
    color: '#333',
  },
  cellNo: {
    width: 40,
    textAlign: 'center',
  },
  cellBarcode: {
    flex: 1,
    paddingRight: 8,
  },
  cellQty: {
    width: 50,
    textAlign: 'center',
    fontWeight: '600',
  },
  cellTime: {
    width: 70,
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
  },
  cellAction: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 12,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  bottomActions: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  continueScanButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueScanText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ScannedItemsScreen;
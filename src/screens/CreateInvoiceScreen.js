import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {invoiceAPI, productAPI, customerAPI} from '../api/apiClient';
import ProductItem from '../components/ProductItem';
import {getColorName, getColorByID} from '../utils/colors';
import {getSizeByID} from '../utils/sizes'; // 1. Import getSizeByID
import invoiceStore from '../store/invoiceStore';

// Customer Types
const CUSTOMER_TYPES = [
  {id: '1', label: 'Working', color: '#4CAF50'},
  {id: '2', label: 'Online', color: '#2196F3'},
  {id: '3', label: 'Redex', color: '#FF5722'},
];

const CreateInvoiceScreen = ({navigation}) => {
  // ... (Existing state variables remain the same)
  const [invoiceNo, setInvoiceNo] = useState('');
  const [loadingInvoiceNo, setLoadingInvoiceNo] = useState(true);
  const [items, setItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerType, setCustomerType] = useState('');
  const [customers, setCustomers] = useState([]);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  // ... (Existing fetch functions remain the same: fetchMaxInvoiceNo, fetchCustomers)
  const fetchMaxInvoiceNo = async () => {
    try {
      setLoadingInvoiceNo(true);
      const response = await invoiceAPI.getMaxInvoiceNo();
      if (response.data.status === 'success') {
        setInvoiceNo(response.data.data);
      } else if (response.data.data) {
        setInvoiceNo(response.data.data);
      }
    } catch (error) {
      console.error('Fetch max invoice no error:', error);
    } finally {
      setLoadingInvoiceNo(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await customerAPI.getAll();
      let customerList = [];
      if (response.data.status === 'success') {
        customerList = response.data.data || [];
      } else if (Array.isArray(response.data.data)) {
        customerList = response.data.data;
      } else if (Array.isArray(response.data)) {
        customerList = response.data;
      }
      setCustomers(customerList);
      setFilteredCustomers(customerList);
    } catch (error) {
      console.error('Fetch customers error:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchMaxInvoiceNo();
    fetchCustomers();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const storeItems = invoiceStore.getItems();
      setItems(storeItems);

      const info = invoiceStore.getCustomerInfo();
      if (info.id) {
        setSelectedCustomer({
          id: info.id,
          cus_id: info.cus_id,
          customer_name: info.name,
          phone: info.phone,
          address: info.address,
        });
        setPhoneSearch(info.phone);
      }
      if (info.customerType) {
        setCustomerType(info.customerType);
      }
    }, []),
  );

  useEffect(() => {
    if (selectedCustomer) {
      invoiceStore.setCustomerInfo({
        id: selectedCustomer.id,
        cus_id: selectedCustomer.cus_id,
        name: selectedCustomer.customer_name,
        phone: selectedCustomer.phone,
        address: selectedCustomer.address,
        customerType: customerType,
      });
    }
  }, [selectedCustomer, customerType]);

  useEffect(() => {
    if (phoneSearch.length >= 1) {
      const filtered = customers.filter(
        customer =>
          customer.phone?.toLowerCase().includes(phoneSearch.toLowerCase()) ||
          customer.customer_name
            ?.toLowerCase()
            .includes(phoneSearch.toLowerCase()),
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [phoneSearch, customers]);

  const selectCustomer = customer => {
    setSelectedCustomer(customer);
    setPhoneSearch(customer.phone);
    setShowPhoneDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setPhoneSearch('');
    invoiceStore.setCustomerInfo({
      id: null,
      cus_id: '',
      name: '',
      phone: '',
      address: '',
      customerType: customerType,
    });
  };

  // ... (Quantity, Price, Color handlers remain)
  const updateQuantity = (itemId, change) => {
    const updatedItems = invoiceStore.updateQuantity(itemId, change);
    setItems(updatedItems);
  };

  const changePrice = (itemId, newPriceType) => {
    const updatedItems = invoiceStore.changePrice(itemId, newPriceType);
    setItems(updatedItems);
  };

  const changeColor = (itemId, newColor) => {
    const updatedItems = invoiceStore.changeColor(itemId, newColor);
    setItems(updatedItems);
  };

  // 2. NEW: Change Size Handler
  const changeSize = (itemId, newSize) => {
    // Calls store to update size (make sure to update store file)
    const updatedItems = invoiceStore.changeSize(itemId, newSize);
    setItems(updatedItems);
  };

  const removeItem = itemId => {
    const updatedItems = invoiceStore.removeItem(itemId);
    setItems(updatedItems);
  };

  const clearAllItems = () => {
    const updatedItems = invoiceStore.clearItems();
    setItems(updatedItems);
  };

  const getItemPrice = item => {
    const priceStr =
      item.product[item.priceType] || item.product.sell_price1 || '0';
    const price =
      typeof priceStr === 'string'
        ? parseFloat(priceStr.replace(/,/g, ''))
        : priceStr;
    return isNaN(price) ? 0 : price;
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      return sum + getItemPrice(item) * item.quantity;
    }, 0);
  };

  const calculateTotalQty = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await productAPI.getAll();
      let productList = [];
      if (response.data.status === 'success') {
        productList = response.data.data || [];
      } else if (Array.isArray(response.data.data)) {
        productList = response.data.data;
      }
      setProducts(productList);
    } catch (error) {
      console.error('Fetch products error:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // 3. UPDATE: Add Product (Include default size)
  const addProductFromSearch = product => {
    // Added 'm' as the default size argument
    const updatedItems = invoiceStore.addItem(product, 'sell_price1', 'white', 'm');
    setItems(updatedItems);
    setShowProductSearch(false);
    setSearchQuery('');
  };

  const showInvoicePreview = () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }
    if (!customerType) {
      Alert.alert('Error', 'Please select a customer Type');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }
    setShowPreview(true);
  };

  // 4. UPDATE: Handle Create Invoice (Include size data)
  const handleCreateInvoice = async () => {
    setShowPreview(false);
    setLoading(true);

    try {
      const invoiceData = {
        inv_no: invoiceNo,
        inv_date: new Date().toISOString().split('T')[0],
        cus_id: selectedCustomer.cus_id || null,
        cus_name: selectedCustomer.customer_name,
        phone: selectedCustomer.phone,
        address: selectedCustomer.address || '',
        customer_type: customerType,
        type: 'job_order',

        items: items.map((item, index) => ({
          row_no: index + 1,
          product_id: item.product.id,
          item_code: item.product.item_code,
          item_name: item.product.item_name,
          style: item.product.style,
          gsm: item.product.gsm,
          fabric: item.product.fabric_up,
          
          // Color Data
          color: item.color,
          color_name: getColorName(item.color),
          
          // Size Data (New)
          size: item.size,
          size_name: getSizeByID(item.size).name,

          quantity: item.quantity,
          price_type: item.priceType,
          unit_price: getItemPrice(item),
          line_total: getItemPrice(item) * item.quantity,
        })),

        item_row_count: items.length,
        total_quantity: calculateTotalQty(),
        grand_total: calculateTotal(),
      };

      console.log('📤 Creating invoice:', JSON.stringify(invoiceData, null, 2));

      const response = await invoiceAPI.create(invoiceData);
      console.log('✅ Invoice created:', response.data);

      invoiceStore.clearAll();
      setItems([]);
      clearCustomer();
      setCustomerType('working');
      fetchMaxInvoiceNo();

      Alert.alert(
        'Success ✅',
        `Invoice ${invoiceNo} created successfully!`,
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (error) {
      console.error('Create invoice error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create invoice',
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.item_code?.toLowerCase().includes(query) ||
      product.item_name?.toLowerCase().includes(query)
    );
  });

  const selectedType = CUSTOMER_TYPES.find(t => t.id === customerType);

  const renderSearchProduct = ({item}) => (
    <TouchableOpacity
      style={styles.searchProductItem}
      onPress={() => addProductFromSearch(item)}>
      <View style={styles.searchProductInfo}>
        <Text style={styles.searchProductCode}>{item.item_code}</Text>
        <Text style={styles.searchProductName}>{item.item_name}</Text>
        <Text style={styles.searchProductDetails}>
          {item.style} • GSM: {item.gsm}
        </Text>
      </View>
      <View style={styles.searchProductPrices}>
        <Text style={styles.searchProductPrice}>Rs. {item.sell_price1}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled>
        
        {/* ... (Invoice No & Customer Section remains unchanged) ... */}
        <View style={styles.invoiceNoSection}>
          <View>
            <Text style={styles.invoiceNoLabel}>Invoice Number</Text>
            {loadingInvoiceNo ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.invoiceNoValue}>{invoiceNo}</Text>
            )}
          </View>
          <View style={styles.invoiceDateContainer}>
            <Text style={styles.invoiceNoLabel}>Date</Text>
            <Text style={styles.invoiceDateValue}>
              {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          {/* ... (Customer Input Fields remain unchanged) ... */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            {selectedCustomer && (
              <TouchableOpacity onPress={clearCustomer}>
                <Text style={styles.clearCustomerText}>✕ Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          {selectedCustomer?.cus_id && (
            <View style={styles.customerIdBadge}>
              <Text style={styles.customerIdText}>{selectedCustomer.cus_id}</Text>
            </View>
          )}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Select Phone Number *</Text>
            <TouchableOpacity
              style={styles.phoneSelector}
              onPress={() => setShowPhoneDropdown(true)}>
              <Text style={[styles.phoneSelectorText, !selectedCustomer && styles.phoneSelectorPlaceholder]}>
                {selectedCustomer ? `📞 ${selectedCustomer.phone}` : 'Tap to select customer...'}
              </Text>
              <Text style={styles.phoneSelectorArrow}>▼</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Customer Name</Text>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{selectedCustomer?.customer_name || '—'}</Text>
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Address</Text>
            <View style={[styles.readonlyField, styles.readonlyFieldMultiline]}>
              <Text style={styles.readonlyText}>{selectedCustomer?.address || '—'}</Text>
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Customer Type *</Text>
            <TouchableOpacity
              style={styles.typeSelector}
              onPress={() => setShowTypeDropdown(!showTypeDropdown)}>
              <View style={styles.typeSelectorContent}>
                <View style={[styles.typeDot, {backgroundColor: selectedType?.color || '#666'}]} />
                <Text style={styles.typeSelectorText}>{selectedType?.label || 'Select Type'}</Text>
              </View>
              <Text style={styles.typeSelectorArrow}>{showTypeDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showTypeDropdown && (
              <View style={styles.typeDropdown}>
                {CUSTOMER_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.typeDropdownItem, customerType === type.id && styles.typeDropdownItemActive]}
                    onPress={() => {
                      setCustomerType(type.id);
                      setShowTypeDropdown(false);
                    }}>
                    <View style={[styles.typeDot, {backgroundColor: type.color}]} />
                    <Text style={[styles.typeDropdownItemText, customerType === type.id && styles.typeDropdownItemTextActive]}>
                      {type.label}
                    </Text>
                    {customerType === type.id && <Text style={styles.typeCheckmark}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Products ({items.length})</Text>
            <View style={styles.addButtons}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  fetchProducts();
                  setShowProductSearch(true);
                }}>
                <Text style={styles.addButtonText}>+ Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => navigation.navigate('BarcodeScan')}>
                <Text style={styles.scanButtonText}>📷 Scan</Text>
              </TouchableOpacity>
            </View>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>No products added</Text>
              <Text style={styles.emptySubtext}>Tap "Add" or "Scan" to add products</Text>
            </View>
          ) : (
            <View>
              {/* 5. UPDATE: Pass selectedSize and onChangeSize to ProductItem */}
              {items.map(item => (
                <ProductItem
                  key={item.id}
                  product={item.product}
                  quantity={item.quantity}
                  selectedPrice={item.priceType}
                  selectedColor={item.color}
                  selectedSize={item.size} // Pass size
                  onIncrement={() => updateQuantity(item.id, 1)}
                  onDecrement={() => updateQuantity(item.id, -1)}
                  onRemove={() => removeItem(item.id)}
                  onChangePrice={priceType => changePrice(item.id, priceType)}
                  onChangeColor={color => changeColor(item.id, color)}
                  onChangeSize={size => changeSize(item.id, size)} // Pass handler
                />
              ))}
            </View>
          )}
        </View>

        {/* Summary Card */}
        {items.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Items:</Text>
              <Text style={styles.summaryValue}>{items.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Quantity:</Text>
              <Text style={styles.summaryValue}>{calculateTotalQty()}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowTotal]}>
              <Text style={styles.summaryLabelTotal}>Grand Total:</Text>
              <Text style={styles.summaryValueTotal}>
                Rs. {calculateTotal().toLocaleString('en-US', {minimumFractionDigits: 2})}
              </Text>
            </View>
          </View>
        )}

        {items.length > 0 && (
          <TouchableOpacity
            style={styles.clearCartButton}
            onPress={() => {
              Alert.alert('Clear All Items', 'Are you sure you want to remove all products?', [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Clear', style: 'destructive', onPress: clearAllItems},
              ]);
            }}>
            <Text style={styles.clearCartButtonText}>🗑️ Clear All Items</Text>
          </TouchableOpacity>
        )}

        <View style={{height: 20}} />
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalQty}>
              {items.length} items • {calculateTotalQty()} qty
            </Text>
          </View>
          <Text style={styles.totalAmount}>
            Rs. {calculateTotal().toLocaleString('en-US', {minimumFractionDigits: 2})}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={showInvoicePreview}
          disabled={loading}>
          <Text style={styles.createButtonText}>
            {loading ? 'Creating...' : 'Preview & Create Invoice'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ... (Customer Phone Modal remains unchanged) ... */}
      <Modal
        visible={showPhoneDropdown}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPhoneDropdown(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.phoneModal}>
             {/* ... (Modal Content same as before) ... */}
             <View style={styles.phoneModalHeader}>
              <Text style={styles.phoneModalTitle}>Select Customer</Text>
              <TouchableOpacity style={styles.phoneModalClose} onPress={() => setShowPhoneDropdown(false)}>
                <Text style={styles.phoneModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.phoneSearchContainer}>
              <TextInput
                style={styles.phoneSearchInput}
                placeholder="Search by phone or name..."
                placeholderTextColor="#999"
                value={phoneSearch}
                onChangeText={setPhoneSearch}
                autoFocus
              />
              {phoneSearch.length > 0 && (
                <TouchableOpacity style={styles.phoneSearchClear} onPress={() => setPhoneSearch('')}>
                  <Text style={styles.phoneSearchClearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            {loadingCustomers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading customers...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredCustomers}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.customerList}
                ListEmptyComponent={
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsIcon}>🔍</Text>
                    <Text style={styles.noResultsText}>No customers found</Text>
                  </View>
                }
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={[styles.customerItem, selectedCustomer?.id === item.id && styles.customerItemSelected]}
                    onPress={() => selectCustomer(item)}>
                    <View style={styles.customerItemLeft}>
                      <View style={styles.customerAvatar}>
                        <Text style={styles.customerAvatarText}>{item.customer_name?.charAt(0).toUpperCase() || '?'}</Text>
                      </View>
                    </View>
                    <View style={styles.customerItemContent}>
                      <Text style={styles.customerItemCusId}>{item.cus_id}</Text>
                      <Text style={styles.customerItemName}>{item.customer_name}</Text>
                      <Text style={styles.customerItemPhone}>📞 {item.phone}</Text>
                      {item.address && <Text style={styles.customerItemAddress} numberOfLines={1}>📍 {item.address}</Text>}
                    </View>
                    {selectedCustomer?.id === item.id && (
                      <View style={styles.customerItemCheck}>
                        <Text style={styles.customerItemCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Invoice Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPreview(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.previewModal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Invoice Preview</Text>
                <TouchableOpacity style={styles.previewClose} onPress={() => setShowPreview(false)}>
                  <Text style={styles.previewCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* ... (Preview Invoice/Customer Info remains unchanged) ... */}
              <View style={styles.previewSection}>
                <View style={styles.previewInvoiceNo}>
                  <Text style={styles.previewInvoiceNoLabel}>Invoice #</Text>
                  <Text style={styles.previewInvoiceNoValue}>{invoiceNo}</Text>
                </View>
                <Text style={styles.previewDate}>Date: {new Date().toLocaleDateString()}</Text>
              </View>
              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>Customer</Text>
                <View style={styles.previewInfoRow}>
                  <Text style={styles.previewInfoLabel}>ID:</Text>
                  <Text style={styles.previewInfoValue}>{selectedCustomer?.cus_id || '—'}</Text>
                </View>
                <View style={styles.previewInfoRow}>
                  <Text style={styles.previewInfoLabel}>Name:</Text>
                  <Text style={styles.previewInfoValue}>{selectedCustomer?.customer_name}</Text>
                </View>
                <View style={styles.previewInfoRow}>
                  <Text style={styles.previewInfoLabel}>Phone:</Text>
                  <Text style={styles.previewInfoValue}>{selectedCustomer?.phone}</Text>
                </View>
                <View style={styles.previewInfoRow}>
                  <Text style={styles.previewInfoLabel}>Address:</Text>
                  <Text style={styles.previewInfoValue}>{selectedCustomer?.address || '—'}</Text>
                </View>
                <View style={styles.previewInfoRow}>
                  <Text style={styles.previewInfoLabel}>Type:</Text>
                  <View style={[styles.previewTypeBadge, {backgroundColor: selectedType?.color || '#666'}]}>
                    <Text style={styles.previewTypeBadgeText}>{selectedType?.label}</Text>
                  </View>
                </View>
              </View>

              {/* Items Preview */}
              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>Items ({items.length})</Text>
                {items.map((item, index) => (
                  <View key={item.id} style={styles.previewItem}>
                    <View style={styles.previewItemHeader}>
                      <Text style={styles.previewItemNo}>#{index + 1}</Text>
                      <Text style={styles.previewItemCode}>{item.product.item_code}</Text>
                    </View>
                    <Text style={styles.previewItemName}>{item.product.item_name}</Text>
                    <View style={styles.previewItemDetails}>
                      <Text style={styles.previewItemDetail}>GSM: {item.product.gsm}</Text>
                      
                      {/* 6. UPDATE: Show Size and Color in Preview */}
                      <View style={styles.previewItemColorContainer}>
                        <View
                          style={[
                            styles.previewItemColorDot,
                            {
                              backgroundColor: getColorByID(item.color).code,
                              borderWidth: item.color === 'white' ? 1 : 0,
                              borderColor: '#ddd',
                            },
                          ]}
                        />
                        <Text style={styles.previewItemDetail}>
                          {getSizeByID(item.size).name} • {getColorName(item.color)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.previewItemPricing}>
                      <Text style={styles.previewItemQty}>Qty: {item.quantity}</Text>
                      <Text style={styles.previewItemPrice}>@ Rs. {getItemPrice(item).toLocaleString()}</Text>
                      <Text style={styles.previewItemTotal}>Rs. {(getItemPrice(item) * item.quantity).toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* ... (Preview Summary remains unchanged) ... */}
              <View style={styles.previewSummary}>
                <View style={styles.previewSummaryRow}>
                  <Text style={styles.previewSummaryLabel}>Total Items:</Text>
                  <Text style={styles.previewSummaryValue}>{items.length}</Text>
                </View>
                <View style={styles.previewSummaryRow}>
                  <Text style={styles.previewSummaryLabel}>Total Quantity:</Text>
                  <Text style={styles.previewSummaryValue}>{calculateTotalQty()}</Text>
                </View>
                <View style={[styles.previewSummaryRow, styles.previewSummaryTotal]}>
                  <Text style={styles.previewSummaryLabelTotal}>Grand Total:</Text>
                  <Text style={styles.previewSummaryValueTotal}>
                    Rs. {calculateTotal().toLocaleString('en-US', {minimumFractionDigits: 2})}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.previewCancelButton} onPress={() => setShowPreview(false)}>
                <Text style={styles.previewCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.previewConfirmButton} onPress={handleCreateInvoice}>
                <Text style={styles.previewConfirmButtonText}>✓ Confirm & Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ... (Product Search Modal & Loading Overlay remain unchanged) ... */}
      <Modal
        visible={showProductSearch}
        animationType="slide"
        onRequestClose={() => setShowProductSearch(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Product</Text>
            <TouchableOpacity onPress={() => { setShowProductSearch(false); setSearchQuery(''); }}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearchContainer}>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search by code or name..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
          {loadingProducts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={renderSearchProduct}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.searchProductsList}
              ListEmptyComponent={
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No products found</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingBoxText}>Creating Invoice...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    // ... (All styles remain exactly the same as your original code)
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flex: 1,
  },
  // Invoice Number Section
  invoiceNoSection: {
    backgroundColor: '#007AFF',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceNoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  invoiceNoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  invoiceDateContainer: {
    alignItems: 'flex-end',
  },
  invoiceDateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
  },
  // Section
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearCustomerText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
  },
  // Customer ID Badge
  customerIdBadge: {
    backgroundColor: '#e3f2fd',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  customerIdText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
  },
  // Input
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  // Phone Selector
  phoneSelector: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phoneSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  phoneSelectorPlaceholder: {
    color: '#999',
  },
  phoneSelectorArrow: {
    fontSize: 12,
    color: '#666',
  },
  // Readonly Field
  readonlyField: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  readonlyFieldMultiline: {
    minHeight: 70,
  },
  readonlyText: {
    fontSize: 16,
    color: '#333',
  },
  // Customer Type
  typeSelector: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  typeSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  typeSelectorArrow: {
    fontSize: 12,
    color: '#666',
  },
  typeDropdown: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 3,
  },
  typeDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  typeDropdownItemActive: {
    backgroundColor: '#f0f8ff',
  },
  typeDropdownItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  typeDropdownItemTextActive: {
    fontWeight: '600',
    color: '#007AFF',
  },
  typeCheckmark: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  // Add Buttons
  addButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Empty Products
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryRowTotal: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#eee',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summaryLabelTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  summaryValueTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  // Clear Cart
  clearCartButton: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  clearCartButtonText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
  },
  // Bottom Section
  bottomSection: {
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalQty: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  createButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  // Phone Modal
  phoneModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  phoneModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  phoneModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  phoneModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneModalCloseText: {
    fontSize: 18,
    color: '#666',
  },
  phoneSearchContainer: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneSearchInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  phoneSearchClear: {
    position: 'absolute',
    right: 28,
    padding: 8,
  },
  phoneSearchClearText: {
    fontSize: 16,
    color: '#999',
  },
  // Customer List
  customerList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  customerItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  customerItemLeft: {
    marginRight: 14,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  customerItemContent: {
    flex: 1,
  },
  customerItemCusId: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
  },
  customerItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  customerItemPhone: {
    fontSize: 14,
    color: '#666',
  },
  customerItemAddress: {
    fontSize: 12,
    color: '#999',
  },
  customerItemCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerItemCheckText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  // Preview Modal
  previewModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 0,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  previewClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseText: {
    fontSize: 18,
    color: '#666',
  },
  previewSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  previewInvoiceNo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewInvoiceNoLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  previewInvoiceNoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  previewDate: {
    fontSize: 14,
    color: '#666',
  },
  previewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewInfoRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  previewInfoLabel: {
    width: 80,
    fontSize: 14,
    color: '#666',
  },
  previewInfoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  previewTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewTypeBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  previewItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  previewItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewItemNo: {
    fontSize: 12,
    color: '#999',
    marginRight: 8,
  },
  previewItemCode: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  previewItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  previewItemDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  previewItemDetail: {
    fontSize: 12,
    color: '#666',
  },
  previewItemColorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewItemColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
  },
  previewItemPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  previewItemQty: {
    fontSize: 13,
    color: '#666',
  },
  previewItemPrice: {
    fontSize: 13,
    color: '#666',
  },
  previewItemTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  previewSummary: {
    padding: 16,
    backgroundColor: '#f0f8ff',
  },
  previewSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  previewSummaryTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
  },
  previewSummaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  previewSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  previewSummaryLabelTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  previewSummaryValueTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  previewActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  previewCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  previewCancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  previewConfirmButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  previewConfirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
  },
  loadingBoxText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  // No Results
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
  },
  // Product Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseText: {
    fontSize: 24,
    color: '#999',
  },
  modalSearchContainer: {
    padding: 16,
  },
  modalSearchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  searchProductsList: {
    padding: 16,
    paddingTop: 0,
  },
  searchProductItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  searchProductInfo: {
    flex: 1,
  },
  searchProductCode: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  searchProductName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginTop: 2,
  },
  searchProductDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  searchProductPrices: {
    alignItems: 'flex-end',
  },
  searchProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
});

export default CreateInvoiceScreen;
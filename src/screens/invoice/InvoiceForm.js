import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {productAPI, customerAPI} from '../../api/apiClient';
import ProductItem from '../../components/ProductItem';
import {getColorName, getColorByID} from '../../utils/colors';
import {getSizeByID} from '../../utils/sizes';
import invoiceStore from '../../store/invoiceStore';
import {C} from '../../utils/theme';
import styles from './invoiceFormStyles';
import {
  CUSTOMER_TYPES,
  buildInvoicePayload,
  calculateTotal,
  calculateTotalDiscount,
  calculateTotalExtra,
  calculateTotalQty,
  calculateTotalUnitPrice,
  getItemPrice,
  getLineTotal,
  toAmount,
} from './invoiceHelpers';

const money = value =>
  value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

/**
 * The invoice form shared by CreateInvoiceScreen and EditInvoiceScreen.
 *
 * It owns the customer/product/preview UI and reads its draft from
 * invoiceStore, which the calling screen is expected to have claimed with
 * beginSession() and seeded. Everything that differs between creating and
 * updating - the labels and what actually happens on save - arrives as
 * props, so there is no mode flag in here.
 */
const InvoiceForm = ({
  navigation,
  invoiceNo,
  loadingInvoiceNo = false,
  initialProducts = [],
  submitLabel,
  submittingLabel,
  confirmLabel,
  busyLabel,
  onSubmit,
}) => {
  const [items, setItems] = useState(() => invoiceStore.getItems());
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
  const [products, setProducts] = useState(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

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
    fetchCustomers();
  }, []);

  // The store is the source of truth for the draft, so re-read it whenever
  // the screen regains focus (e.g. returning from the barcode scanner).
  useFocusEffect(
    useCallback(() => {
      setItems(invoiceStore.getItems());

      const info = invoiceStore.getCustomerInfo();
      if (info.id || info.cus_id) {
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

  const updateQuantity = (itemId, change) => {
    setItems(invoiceStore.updateQuantity(itemId, change));
  };

  const changePrice = (itemId, newPriceType) => {
    setItems(invoiceStore.changePrice(itemId, newPriceType));
  };

  const changeColor = (itemId, newColor) => {
    setItems(invoiceStore.changeColor(itemId, newColor));
  };

  const changeSize = (itemId, newSize) => {
    setItems(invoiceStore.changeSize(itemId, newSize));
  };

  const changeDiscount = (itemId, newDiscount) => {
    setItems(invoiceStore.changeDiscount(itemId, newDiscount));
  };

  const changeExtra = (itemId, newExtra) => {
    setItems(invoiceStore.changeExtra(itemId, newExtra));
  };

  const removeItem = itemId => {
    setItems(invoiceStore.removeItem(itemId));
  };

  const clearAllItems = () => {
    setItems(invoiceStore.clearItems());
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

  const addProductFromSearch = product => {
    setItems(invoiceStore.addItem(product, 'sell_price1', 'white', 'm'));
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

  const handleSubmit = async () => {
    setShowPreview(false);
    setLoading(true);
    try {
      await onSubmit(
        buildInvoicePayload({
          invoiceNo,
          customer: selectedCustomer,
          customerType,
          items,
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    if (!searchQuery.trim()) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    return (
      product.item_code?.toLowerCase().includes(query) ||
      product.item_name?.toLowerCase().includes(query)
    );
  });

  const selectedType = CUSTOMER_TYPES.find(t => t.id === customerType);
  const total = calculateTotal(items);
  const totalQty = calculateTotalQty(items);
  const totalUnitPrice = calculateTotalUnitPrice(items);
  const totalDiscount = calculateTotalDiscount(items);
  const totalExtra = calculateTotalExtra(items);

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
        <View style={styles.invoiceNoSection}>
          <View>
            <Text style={styles.invoiceNoLabel}>Invoice Number</Text>
            {loadingInvoiceNo ? (
              <ActivityIndicator size="small" color={C.surface} />
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
              <Text style={styles.customerIdText}>
                {selectedCustomer.cus_id}
              </Text>
            </View>
          )}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Select Phone Number *</Text>
            <TouchableOpacity
              style={styles.phoneSelector}
              onPress={() => setShowPhoneDropdown(true)}>
              <Text
                style={[
                  styles.phoneSelectorText,
                  !selectedCustomer && styles.phoneSelectorPlaceholder,
                ]}>
                {selectedCustomer
                  ? `📞 ${selectedCustomer.phone}`
                  : 'Tap to select customer...'}
              </Text>
              <Text style={styles.phoneSelectorArrow}>▼</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Customer Name</Text>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>
                {selectedCustomer?.customer_name || '—'}
              </Text>
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Address</Text>
            <View style={[styles.readonlyField, styles.readonlyFieldMultiline]}>
              <Text style={styles.readonlyText}>
                {selectedCustomer?.address || '—'}
              </Text>
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Customer Type *</Text>
            <TouchableOpacity
              style={styles.typeSelector}
              onPress={() => setShowTypeDropdown(!showTypeDropdown)}>
              <View style={styles.typeSelectorContent}>
                <View
                  style={[
                    styles.typeDot,
                    {backgroundColor: selectedType?.color || '#666'},
                  ]}
                />
                <Text style={styles.typeSelectorText}>
                  {selectedType?.label || 'Select Type'}
                </Text>
              </View>
              <Text style={styles.typeSelectorArrow}>
                {showTypeDropdown ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {showTypeDropdown && (
              <View style={styles.typeDropdown}>
                {CUSTOMER_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeDropdownItem,
                      customerType === type.id && styles.typeDropdownItemActive,
                    ]}
                    onPress={() => {
                      setCustomerType(type.id);
                      setShowTypeDropdown(false);
                    }}>
                    <View style={[styles.typeDot, {backgroundColor: type.color}]} />
                    <Text
                      style={[
                        styles.typeDropdownItemText,
                        customerType === type.id &&
                          styles.typeDropdownItemTextActive,
                      ]}>
                      {type.label}
                    </Text>
                    {customerType === type.id && (
                      <Text style={styles.typeCheckmark}>✓</Text>
                    )}
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
              <Text style={styles.emptySubtext}>
                Tap "Add" or "Scan" to add products
              </Text>
            </View>
          ) : (
            <View>
              {items.map(item => (
                <ProductItem
                  key={item.id}
                  product={item.product}
                  quantity={item.quantity}
                  selectedPrice={item.priceType}
                  selectedColor={item.color}
                  selectedSize={item.size}
                  discount={item.discount}
                  extra={item.extra}
                  onIncrement={() => updateQuantity(item.id, 1)}
                  onDecrement={() => updateQuantity(item.id, -1)}
                  onRemove={() => removeItem(item.id)}
                  onChangePrice={priceType => changePrice(item.id, priceType)}
                  onChangeColor={color => changeColor(item.id, color)}
                  onChangeSize={size => changeSize(item.id, size)}
                  onChangeDiscount={value => changeDiscount(item.id, value)}
                  onChangeExtra={value => changeExtra(item.id, value)}
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
              <Text style={styles.summaryValue}>{totalQty}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Unit Prices:</Text>
              <Text style={styles.summaryValue}>Rs. {money(totalUnitPrice)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Discount:</Text>
              <Text style={styles.summaryValue}>− Rs. {money(totalDiscount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Extra:</Text>
              <Text style={styles.summaryValue}>+ Rs. {money(totalExtra)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryRowTotal]}>
              <Text style={styles.summaryLabelTotal}>Grand Total:</Text>
              <Text style={styles.summaryValueTotal}>Rs. {money(total)}</Text>
            </View>
          </View>
        )}

        {items.length > 0 && (
          <TouchableOpacity
            style={styles.clearCartButton}
            onPress={() => {
              Alert.alert(
                'Clear All Items',
                'Are you sure you want to remove all products?',
                [
                  {text: 'Cancel', style: 'cancel'},
                  {text: 'Clear', style: 'destructive', onPress: clearAllItems},
                ],
              );
            }}>
            <Text style={styles.clearCartButtonText}>🗑️ Clear All Items</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalQty}>
              {items.length} items • {totalQty} qty
            </Text>
          </View>
          <Text style={styles.totalAmount}>
            Rs. {total.toLocaleString('en-US', {minimumFractionDigits: 2})}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={showInvoicePreview}
          disabled={loading}>
          <Text style={styles.createButtonText}>
            {loading ? submittingLabel : submitLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Customer Phone Modal */}
      <Modal
        visible={showPhoneDropdown}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPhoneDropdown(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.phoneModal}>
            <View style={styles.phoneModalHeader}>
              <Text style={styles.phoneModalTitle}>Select Customer</Text>
              <TouchableOpacity
                style={styles.phoneModalClose}
                onPress={() => setShowPhoneDropdown(false)}>
                <Text style={styles.phoneModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.phoneSearchContainer}>
              <TextInput
                style={styles.phoneSearchInput}
                placeholder="Search by phone or name..."
                placeholderTextColor={C.textSecondary}
                value={phoneSearch}
                onChangeText={setPhoneSearch}
                autoFocus
              />
              {phoneSearch.length > 0 && (
                <TouchableOpacity
                  style={styles.phoneSearchClear}
                  onPress={() => setPhoneSearch('')}>
                  <Text style={styles.phoneSearchClearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            {loadingCustomers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.accent} />
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
                    style={[
                      styles.customerItem,
                      selectedCustomer?.id === item.id &&
                        styles.customerItemSelected,
                    ]}
                    onPress={() => selectCustomer(item)}>
                    <View style={styles.customerItemLeft}>
                      <View style={styles.customerAvatar}>
                        <Text style={styles.customerAvatarText}>
                          {item.customer_name?.charAt(0).toUpperCase() || '?'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.customerItemContent}>
                      <Text style={styles.customerItemCusId}>{item.cus_id}</Text>
                      <Text style={styles.customerItemName}>
                        {item.customer_name}
                      </Text>
                      <Text style={styles.customerItemPhone}>
                        📞 {item.phone}
                      </Text>
                      {item.address && (
                        <Text
                          style={styles.customerItemAddress}
                          numberOfLines={1}>
                          📍 {item.address}
                        </Text>
                      )}
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
                <TouchableOpacity
                  style={styles.previewClose}
                  onPress={() => setShowPreview(false)}>
                  <Text style={styles.previewCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.previewSection}>
                <View style={styles.previewInvoiceNo}>
                  <Text style={styles.previewInvoiceNoLabel}>Invoice #</Text>
                  <Text style={styles.previewInvoiceNoValue}>{invoiceNo}</Text>
                </View>
                <Text style={styles.previewDate}>
                  Date: {new Date().toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>Customer</Text>
                <View style={styles.previewInfoRow}>
                  <Text style={styles.previewInfoLabel}>ID:</Text>
                  <Text style={styles.previewInfoValue}>
                    {selectedCustomer?.cus_id || '—'}
                  </Text>
                </View>
                <View style={styles.previewInfoRow}>
                  <Text style={styles.previewInfoLabel}>Name:</Text>
                  <Text style={styles.previewInfoValue}>
                    {selectedCustomer?.customer_name}
                  </Text>
                </View>
                <View style={styles.previewInfoRow}>
                  <Text style={styles.previewInfoLabel}>Phone:</Text>
                  <Text style={styles.previewInfoValue}>
                    {selectedCustomer?.phone}
                  </Text>
                </View>
                <View style={styles.previewInfoRow}>
                  <Text style={styles.previewInfoLabel}>Address:</Text>
                  <Text style={styles.previewInfoValue}>
                    {selectedCustomer?.address || '—'}
                  </Text>
                </View>
                <View style={styles.previewInfoRow}>
                  <Text style={styles.previewInfoLabel}>Type:</Text>
                  <View
                    style={[
                      styles.previewTypeBadge,
                      {backgroundColor: selectedType?.color || '#666'},
                    ]}>
                    <Text style={styles.previewTypeBadgeText}>
                      {selectedType?.label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Items Preview */}
              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>
                  Items ({items.length})
                </Text>
                {items.map((item, index) => (
                  <View key={item.id} style={styles.previewItem}>
                    <View style={styles.previewItemHeader}>
                      <Text style={styles.previewItemNo}>#{index + 1}</Text>
                      <Text style={styles.previewItemCode}>
                        {item.product.item_code}
                      </Text>
                    </View>
                    <Text style={styles.previewItemName}>
                      {item.product.item_name}
                    </Text>
                    <View style={styles.previewItemDetails}>
                      <Text style={styles.previewItemDetail}>
                        GSM: {item.product.gsm}
                      </Text>

                      <View style={styles.previewItemColorContainer}>
                        <View
                          style={[
                            styles.previewItemColorDot,
                            {
                              backgroundColor: getColorByID(item.color).code,
                              borderWidth: item.color === 'white' ? 1 : 0,
                              borderColor: C.border,
                            },
                          ]}
                        />
                        <Text style={styles.previewItemDetail}>
                          {getSizeByID(item.size).name} •{' '}
                          {getColorName(item.color)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.previewItemDetails}>
                      <Text style={styles.previewItemDetail}>
                        Discount/unit: {money(toAmount(item.discount))}
                      </Text>
                      <Text style={styles.previewItemDetail}>
                        Extra/unit: {money(toAmount(item.extra))}
                      </Text>
                    </View>

                    <View style={styles.previewItemPricing}>
                      <Text style={styles.previewItemQty}>
                        Qty: {item.quantity}
                      </Text>
                      <Text style={styles.previewItemPrice}>
                        @ Rs. {money(getItemPrice(item))}
                      </Text>
                      <Text style={styles.previewItemTotal}>
                        Rs. {money(getLineTotal(item))}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.previewSummary}>
                <View style={styles.previewSummaryRow}>
                  <Text style={styles.previewSummaryLabel}>Total Items:</Text>
                  <Text style={styles.previewSummaryValue}>{items.length}</Text>
                </View>
                <View style={styles.previewSummaryRow}>
                  <Text style={styles.previewSummaryLabel}>Total Quantity:</Text>
                  <Text style={styles.previewSummaryValue}>{totalQty}</Text>
                </View>
                <View style={styles.previewSummaryRow}>
                  <Text style={styles.previewSummaryLabel}>
                    Total Unit Prices:
                  </Text>
                  <Text style={styles.previewSummaryValue}>
                    Rs. {money(totalUnitPrice)}
                  </Text>
                </View>
                <View style={styles.previewSummaryRow}>
                  <Text style={styles.previewSummaryLabel}>Total Discount:</Text>
                  <Text style={styles.previewSummaryValue}>
                    − Rs. {money(totalDiscount)}
                  </Text>
                </View>
                <View style={styles.previewSummaryRow}>
                  <Text style={styles.previewSummaryLabel}>Total Extra:</Text>
                  <Text style={styles.previewSummaryValue}>
                    + Rs. {money(totalExtra)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.previewSummaryRow,
                    styles.previewSummaryTotal,
                  ]}>
                  <Text style={styles.previewSummaryLabelTotal}>
                    Grand Total:
                  </Text>
                  <Text style={styles.previewSummaryValueTotal}>
                    Rs. {money(total)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.previewCancelButton}
                onPress={() => setShowPreview(false)}>
                <Text style={styles.previewCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewConfirmButton}
                onPress={handleSubmit}>
                <Text style={styles.previewConfirmButtonText}>
                  {confirmLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Search Modal */}
      <Modal
        visible={showProductSearch}
        animationType="slide"
        onRequestClose={() => setShowProductSearch(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Product</Text>
            <TouchableOpacity
              onPress={() => {
                setShowProductSearch(false);
                setSearchQuery('');
              }}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearchContainer}>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search by code or name..."
              placeholderTextColor={C.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
          {loadingProducts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={C.accent} />
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
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={styles.loadingBoxText}>{busyLabel}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default InvoiceForm;

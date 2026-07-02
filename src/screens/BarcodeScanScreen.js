import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import {productAPI} from '../api/apiClient';
import {PRODUCT_COLORS, getColorByID} from '../utils/colors';
import invoiceStore from '../store/invoiceStore';
import {C} from '../utils/theme';

const BarcodeScanScreen = ({navigation}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');

  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const [foundProduct, setFoundProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);

  const [selectedColor, setSelectedColor] = useState('white');

  const device = useCameraDevice('back');

  useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    try {
      const status = await Camera.getCameraPermissionStatus();

      if (status === 'granted') {
        setHasPermission(true);
      } else if (status === 'not-determined') {
        const newStatus = await Camera.requestCameraPermission();
        setHasPermission(newStatus === 'granted');
      } else {
        setHasPermission(false);
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: [
      'qr',
      'ean-13',
      'ean-8',
      'code-128',
      'code-39',
      'code-93',
      'upc-a',
      'upc-e',
    ],
    onCodeScanned: codes => {
      if (!isScanning || isSearching || codes.length === 0) return;

      const scannedCode = codes[0].value;
      console.log('📷 Scanned barcode:', scannedCode);

      if (scannedCode === lastScannedCode) return;

      setLastScannedCode(scannedCode);
      setIsScanning(false);
      searchProductByBarcode(scannedCode);
    },
  });

  const searchProductByBarcode = async barcode => {
    setIsSearching(true);
    console.log('🔍 Searching product:', barcode);

    try {
      const response = await productAPI.getByBarcode(barcode);

      let product = null;

      if (response.data.status === 'success' && response.data.data) {
        product = response.data.data;
      } else if (response.data.data) {
        product = response.data.data;
      } else if (response.data.id) {
        product = response.data;
      }

      if (product) {
        console.log('✅ Product found:', product.item_name);
        setFoundProduct(product);
        setSelectedColor('white');
        setShowProductModal(true);
      } else {
        showNotFoundAlert(barcode);
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      showNotFoundAlert(barcode);
    } finally {
      setIsSearching(false);
    }
  };

  const showNotFoundAlert = barcode => {
    Alert.alert(
      'Product Not Found',
      `No product found with barcode:\n${barcode}`,
      [
        {
          text: 'Try Again',
          onPress: () => {
            setIsScanning(true);
            setLastScannedCode('');
          },
        },
        {
          text: 'Enter Manually',
          onPress: () => setShowManualInput(true),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  const handleManualSearch = () => {
    const code = manualCode.trim();
    if (!code) {
      Alert.alert('Error', 'Please enter a product code');
      return;
    }
    setShowManualInput(false);
    setManualCode('');
    searchProductByBarcode(code);
  };

  // ✅ Add to store directly
  const addToInvoice = (priceType = 'sell_price1') => {
    if (!foundProduct) return;

    const colorName = getColorByID(selectedColor).name;

    // ✅ Add directly to store
    invoiceStore.addItem(foundProduct, priceType, selectedColor);

    console.log('📦 Added to store. Total items:', invoiceStore.getItems().length);

    setShowProductModal(false);

    Alert.alert(
      'Product Added! ✅',
      `${foundProduct.item_name}\nColor: ${colorName}\nPrice: Rs. ${foundProduct[priceType]}`,
      [
        {
          text: 'Scan More',
          onPress: () => {
            setFoundProduct(null);
            setLastScannedCode('');
            setSelectedColor('white');
            setIsScanning(true);
          },
        },
        {
          text: 'Done',
          onPress: () => {
            // ✅ Just go back - items are in store
            navigation.goBack();
          },
        },
      ],
    );
  };

  const scanAnother = () => {
    setShowProductModal(false);
    setFoundProduct(null);
    setLastScannedCode('');
    setSelectedColor('white');
    setIsScanning(true);
  };

  const selectedColorInfo = getColorByID(selectedColor);

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Please allow camera access to scan barcodes
        </Text>

        <TouchableOpacity
          style={styles.permissionButton}
          onPress={checkCameraPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => Linking.openSettings()}>
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.manualEntryButton}
          onPress={() => setShowManualInput(true)}>
          <Text style={styles.manualEntryButtonText}>
            ⌨️ Enter Code Manually
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isScanning && !showProductModal && !showManualInput}
        codeScanner={codeScanner}
      />

      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Show cart count */}
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>
              🛒 {invoiceStore.getItems().length}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => setShowManualInput(true)}>
            <Text style={styles.manualButtonText}>⌨️ Manual</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        <View style={styles.statusContainer}>
          {isSearching ? (
            <>
              <ActivityIndicator size="small" color={C.surface} />
              <Text style={styles.statusText}>Searching product...</Text>
            </>
          ) : (
            <>
              <Text style={styles.statusText}>
                {isScanning ? 'Point camera at barcode' : 'Processing...'}
              </Text>
              <Text style={styles.hintText}>
                Supports: EAN-13, EAN-8, QR, Code-128, UPC
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Manual Input Modal */}
      <Modal
        visible={showManualInput}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowManualInput(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.manualInputModal}>
            <Text style={styles.modalTitle}>Enter Product Code</Text>

            <TextInput
              style={styles.manualInput}
              placeholder="e.g., ITEM0001"
              placeholderTextColor={C.textSecondary}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              autoFocus={true}
              returnKeyType="search"
              onSubmitEditing={handleManualSearch}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => {
                  setShowManualInput(false);
                  setManualCode('');
                  setIsScanning(true);
                }}>
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.searchModalButton}
                onPress={handleManualSearch}>
                <Text style={styles.searchModalButtonText}>Search</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Found Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={true}
        onRequestClose={scanAnother}>
        <View style={styles.modalOverlay}>
          <View style={styles.productModal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {foundProduct && (
                <>
                  <View style={styles.productHeader}>
                    <View style={{flex: 1}}>
                      <Text style={styles.productCode}>
                        {foundProduct.item_code}
                      </Text>
                      <Text style={styles.productName}>
                        {foundProduct.item_name}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.closeModalButton}
                      onPress={scanAnother}>
                      <Text style={styles.closeModalText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.productDetails}>
                    <View style={styles.detailChip}>
                      <Text style={styles.detailChipText}>
                        Style: {foundProduct.style?.replace(/_/g, ' ')}
                      </Text>
                    </View>
                    <View style={styles.detailChip}>
                      <Text style={styles.detailChipText}>
                        GSM: {foundProduct.gsm}
                      </Text>
                    </View>
                    <View style={styles.detailChip}>
                      <Text style={styles.detailChipText}>
                        Fabric: {foundProduct.fabric_up?.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.costInfo}>
                    <Text style={styles.costLabel}>Total Cost:</Text>
                    <Text style={styles.costValue}>
                      Rs. {foundProduct.tot_cost}
                    </Text>
                  </View>

                  <Text style={styles.sectionLabel}>Select Color:</Text>
                  <View style={styles.colorGrid}>
                    {PRODUCT_COLORS.slice(0, 12).map(color => (
                      <TouchableOpacity
                        key={color.id}
                        style={[
                          styles.colorOption,
                          selectedColor === color.id &&
                            styles.colorOptionSelected,
                        ]}
                        onPress={() => setSelectedColor(color.id)}>
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
                                {
                                  color:
                                    color.id === 'white' ||
                                    color.id === 'yellow' ||
                                    color.id === 'cream' ||
                                    color.id === 'beige'
                                      ? '#000'
                                      : '#fff',
                                },
                              ]}>
                              ✓
                            </Text>
                          )}
                        </View>
                        <Text style={styles.colorLabel}>{color.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.selectedColorDisplay}>
                    <View
                      style={[
                        styles.selectedColorPreview,
                        {backgroundColor: selectedColorInfo.code},
                        selectedColorInfo.id === 'white' &&
                          styles.colorCircleBorder,
                      ]}
                    />
                    <Text style={styles.selectedColorText}>
                      Selected: {selectedColorInfo.name}
                    </Text>
                  </View>

                  <Text style={styles.sectionLabel}>Select Price & Add:</Text>

                  <TouchableOpacity
                    style={styles.priceOption}
                    onPress={() => addToInvoice('sell_price1')}>
                    <View style={{flex: 1}}>
                      <Text style={styles.priceLabel}>Price 1 (Retail)</Text>
                      <Text style={styles.priceValue}>
                        Rs. {foundProduct.sell_price1}
                      </Text>
                    </View>
                    <View style={styles.profitBadge}>
                      <Text style={styles.profitText}>
                        {foundProduct.profit1}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.priceOption}
                    onPress={() => addToInvoice('sell_price2')}>
                    <View style={{flex: 1}}>
                      <Text style={styles.priceLabel}>Price 2 (Wholesale)</Text>
                      <Text style={styles.priceValue}>
                        Rs. {foundProduct.sell_price2}
                      </Text>
                    </View>
                    <View style={styles.profitBadge}>
                      <Text style={styles.profitText}>
                        {foundProduct.profit2}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.priceOption}
                    onPress={() => addToInvoice('sell_price3')}>
                    <View style={{flex: 1}}>
                      <Text style={styles.priceLabel}>Price 3 (Dealer)</Text>
                      <Text style={styles.priceValue}>
                        Rs. {foundProduct.sell_price3}
                      </Text>
                    </View>
                    <View style={styles.profitBadge}>
                      <Text style={styles.profitText}>
                        {foundProduct.profit3}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.scanAnotherButton}
                    onPress={scanAnother}>
                    <Text style={styles.scanAnotherButtonText}>
                      📷 Scan Another
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 24,
  },
  permissionIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: C.surface,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: C.textPlaceholder,
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: C.accent,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: C.surface,
    fontSize: 18,
    fontWeight: '600',
  },
  settingsButton: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  settingsButtonText: {
    color: C.accent,
    fontSize: 16,
  },
  manualEntryButton: {
    backgroundColor: '#333',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  manualEntryButtonText: {
    color: C.surface,
    fontSize: 16,
  },
  backButton: {
    paddingVertical: 12,
  },
  backButtonText: {
    color: C.textSecondary,
    fontSize: 16,
  },
  loadingText: {
    color: C.surface,
    fontSize: 16,
    marginTop: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: C.surface,
    fontSize: 24,
  },
  cartBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cartBadgeText: {
    color: C.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  manualButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  manualButtonText: {
    color: C.surface,
    fontSize: 14,
    fontWeight: '500',
  },
  scanFrameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 180,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#00FF00',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  statusContainer: {
    alignItems: 'center',
    paddingBottom: 100,
  },
  statusText: {
    color: C.surface,
    fontSize: 18,
    fontWeight: '500',
    marginTop: 8,
  },
  hintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  manualInputModal: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: C.textPrimary,
    marginBottom: 16,
  },
  manualInput: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 18,
    fontSize: 20,
    borderWidth: 2,
    borderColor: C.accent,
    color: C.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  cancelModalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    fontSize: 16,
    color: C.textSecondary,
    fontWeight: '600',
  },
  searchModalButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: 'center',
  },
  searchModalButtonText: {
    fontSize: 16,
    color: C.surface,
    fontWeight: '600',
  },
  productModal: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  productCode: {
    fontSize: 14,
    color: C.accent,
    fontWeight: '600',
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: C.textPrimary,
    marginTop: 4,
  },
  closeModalButton: {
    padding: 4,
  },
  closeModalText: {
    fontSize: 28,
    color: C.textSecondary,
  },
  productDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  detailChip: {
    backgroundColor: C.divider,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  detailChipText: {
    fontSize: 13,
    color: C.textSecondary,
    textTransform: 'capitalize',
  },
  costInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.warningLight,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  costLabel: {
    fontSize: 14,
    color: C.warning,
  },
  costValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.warning,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  colorOption: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  colorOptionSelected: {
    backgroundColor: C.accentLight,
    borderRadius: 8,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorCircleBorder: {
    borderWidth: 2,
    borderColor: C.border,
  },
  checkMark: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  colorLabel: {
    fontSize: 10,
    color: C.textSecondary,
    textAlign: 'center',
  },
  selectedColorDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  selectedColorPreview: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  selectedColorText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
  },
  priceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: C.border,
  },
  priceLabel: {
    fontSize: 13,
    color: C.textSecondary,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.textPrimary,
    marginTop: 2,
  },
  profitBadge: {
    backgroundColor: C.successLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  profitText: {
    fontSize: 14,
    color: C.success,
    fontWeight: '600',
  },
  scanAnotherButton: {
    backgroundColor: '#6c757d',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  scanAnotherButtonText: {
    fontSize: 16,
    color: C.surface,
    fontWeight: '600',
  },
});

export default BarcodeScanScreen;
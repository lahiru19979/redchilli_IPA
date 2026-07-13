// screens/InventoryScanScreen.js
import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Vibration,
  TextInput,
  Modal,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import scannedItemsStore from '../store/scannedItemsStore';
import { C } from '../utils/theme';

const InventoryScanScreen = ({navigation}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [scannedCount, setScannedCount] = useState(0);
  const [deviceScannerMode, setDeviceScannerMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const deviceScannerInputRef = useRef(null);

  const device = useCameraDevice('back');

  useEffect(() => {
    checkCameraPermission();
    
    // Subscribe to store updates
    const unsubscribe = scannedItemsStore.subscribe(() => {
      setScannedCount(scannedItemsStore.getTotalCount());
    });
    
    setScannedCount(scannedItemsStore.getTotalCount());
    
    return unsubscribe;
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

  // Shared by both entry methods (camera scan + hardware scanner device),
  // so dedupe/vibrate/store behavior stays identical either way.
  const recordScan = code => {
    if (!code) return;

    console.log('📷 Scanned:', code);
    Vibration.vibrate(100);
    scannedItemsStore.addItem(code);
    setLastScannedCode(code);
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
      if (!isScanning || codes.length === 0) return;

      const scannedCode = codes[0].value;

      // Prevent duplicate rapid scans
      if (scannedCode === lastScannedCode) return;

      recordScan(scannedCode);

      // Brief pause before allowing next scan
      setIsScanning(false);
      setTimeout(() => {
        setIsScanning(true);
      }, 1000);
    },
  });

  // Hardware barcode scanner devices act as a keyboard: they "type" the
  // barcode digits into whatever input is focused, then send Enter/Return.
  // This TextInput stays focused with the on-screen keyboard suppressed so
  // a physical scanner gun can feed codes in without the camera at all.
  const openDeviceScannerMode = () => {
    setManualCode('');
    setDeviceScannerMode(true);
  };

  const closeDeviceScannerMode = () => {
    setDeviceScannerMode(false);
    setManualCode('');
  };

  const handleDeviceScannerSubmit = () => {
    const code = manualCode.trim();
    setManualCode('');
    if (!code) return;

    recordScan(code);
    deviceScannerInputRef.current?.focus();
  };

  const goToScannedList = () => {
    navigation.navigate('ScannedItems');
  };

  // Permission denied screen
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
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading camera
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
        isActive={isScanning}
        codeScanner={codeScanner}
      />

      <View style={styles.overlay}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.titleText}>Barcode Scanner</Text>

          <View style={styles.placeholder} />
        </View>

        {/* Scan Frame */}
        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          {/* Last Scanned Display */}
          {lastScannedCode ? (
            <View style={styles.lastScannedContainer}>
              <Text style={styles.lastScannedLabel}>Last Scanned:</Text>
              <Text style={styles.lastScannedCode}>{lastScannedCode}</Text>
            </View>
          ) : null}
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <Text style={styles.statusText}>
            {isScanning ? 'Point camera at barcode' : 'Processing...'}
          </Text>
          <Text style={styles.hintText}>
            Supports: EAN-13, EAN-8, QR, Code-128, UPC
          </Text>

          {/* Hardware Scanner Device Button */}
          <TouchableOpacity
            style={styles.deviceScannerButton}
            onPress={openDeviceScannerMode}>
            <Text style={styles.deviceScannerButtonText}>
              🔌 Use Scanner Device
            </Text>
          </TouchableOpacity>

          {/* View Scanned Items Button */}
          <TouchableOpacity
            style={styles.viewListButton}
            onPress={goToScannedList}>
            <Text style={styles.viewListButtonText}>
              📋 View Scanned Items ({scannedCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hardware barcode scanner input mode: the scanner device "types" the
          code into this focused, keyboard-suppressed field, then sends Enter. */}
      <Modal
        visible={deviceScannerMode}
        transparent
        animationType="fade"
        onRequestClose={closeDeviceScannerMode}>
        <View style={styles.deviceScannerOverlay}>
          <View style={styles.deviceScannerCard}>
            <Text style={styles.deviceScannerTitle}>Scanner Device Mode</Text>
            <Text style={styles.deviceScannerHint}>
              Scan a barcode with your handheld scanner. It will be added
              automatically — the on-screen keyboard is disabled.
            </Text>

            <TextInput
              ref={deviceScannerInputRef}
              style={styles.deviceScannerInput}
              value={manualCode}
              onChangeText={setManualCode}
              onSubmitEditing={handleDeviceScannerSubmit}
              blurOnSubmit={false}
              autoFocus
              showSoftInputOnFocus={false}
              placeholder="Waiting for scan..."
              placeholderTextColor={C.textPlaceholder}
            />

            <Text style={styles.deviceScannerCount}>
              Scanned so far: {scannedCount}
            </Text>

            <TouchableOpacity
              style={styles.deviceScannerCloseButton}
              onPress={closeDeviceScannerMode}>
              <Text style={styles.deviceScannerCloseButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.textPrimary,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.textPrimary,
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
  titleText: {
    color: C.surface,
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 48,
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
  lastScannedContainer: {
    marginTop: 30,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  lastScannedLabel: {
    color: '#00FF00',
    fontSize: 12,
    marginBottom: 4,
  },
  lastScannedCode: {
    color: C.surface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSection: {
    alignItems: 'center',
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  statusText: {
    color: C.surface,
    fontSize: 18,
    fontWeight: '500',
  },
  hintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  viewListButton: {
    backgroundColor: C.accent,
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  viewListButtonText: {
    color: C.surface,
    fontSize: 18,
    fontWeight: '600',
  },
  deviceScannerButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: C.surface,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceScannerButtonText: {
    color: C.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  deviceScannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deviceScannerCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
  },
  deviceScannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  deviceScannerHint: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  deviceScannerInput: {
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    fontSize: 16,
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  deviceScannerCount: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  deviceScannerCloseButton: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deviceScannerCloseButtonText: {
    color: C.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default InventoryScanScreen;
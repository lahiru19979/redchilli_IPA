import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Switch,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { productAPI } from '../api/apiClient';
import ImagePicker from 'react-native-image-crop-picker';
import { Alert, Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const MOCK_ORIGINS = [
  { id: '1', origin_zone_name: 'Colombo' },
  { id: '2', origin_zone_name: 'Kandana' },
  { id: '3', origin_zone_name: 'Gampaha' },
];

const GENDER_OPTIONS = [
  { id: '', label: '--- select ---' },
  { id: 'Male', label: 'Male' },
  { id: 'Female', label: 'Female' },
  { id: 'Unisex', label: 'Unisex' },
];

// ─── Theme ───────────────────────────────────────────────────────────────────
const C = {
  navy: '#1A237E',
  accent: '#1565C0',
  accentLight: '#E3F2FD',
  green: '#2E7D32',
  red: '#E53E3E',
  surface: '#FFFFFF',
  bg: '#F0F4F8',
  border: '#E2E8F0',
  textPrimary: '#1A202C',
  textSecondary: '#718096',
  textPlaceholder: '#A0AEC0',
};

// ─── Sub-components ──────────────────────────────────────────────────────────
const SectionHeader = ({ number, icon, title }) => (
  <View style={s.sectionHeader}>
    <View style={s.sectionBadge}>
      <Text style={s.sectionBadgeText}>{number}</Text>
    </View>
    <Text style={s.sectionIcon}>{icon}</Text>
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
);

const FieldLabel = ({ label, required, hint }) => (
  <View style={s.fieldLabelRow}>
    <Text style={s.fieldLabel}>
      {label}
      {required && <Text style={s.star}> *</Text>}
    </Text>
    {hint ? <Text style={s.fieldHint}>{hint}</Text> : null}
  </View>
);

const Selector = ({ value, placeholder, onPress, disabled }) => (
  <TouchableOpacity
    style={[s.selector, disabled && s.selectorDisabled]}
    onPress={onPress}
    disabled={!!disabled}
    activeOpacity={0.75}
  >
    <Text
      style={[s.selectorText, !value && s.selectorPlaceholder]}
      numberOfLines={1}
    >
      {value || placeholder}
    </Text>
    <Text style={s.selectorArrow}>⌄</Text>
  </TouchableOpacity>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
const CreateProductScreen = ({ navigation }) => {
  // State — Basic Info
  const [ProductNo, setProductNo] = useState('');
  const [loadingProductNo, setLoadingProductNo] = useState(false);
  const [types, setTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [venders, setVenders] = useState([]);
  const [loadingVenders, setLoadingVenders] = useState(false);
  const [selectedVender, setSelectedVender] = useState(null);
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [sizeCharts, setSizeCharts] = useState([]);
  const [loadingSizeCharts, setLoadingSizeCharts] = useState(false);
  const [selectedSizechart, setSelectedSizechart] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [productName, setProductName] = useState('');
  const [slug, setSlug] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [searchTags, setSearchTags] = useState('');

  // State — Physical
  const [weight, setWeight] = useState('');
  const [dimW, setDimW] = useState('1');
  const [dimH, setDimH] = useState('1');
  const [dimL, setDimL] = useState('1');
  const [volumetric, setVolumetric] = useState('0.0002');

  // State — Flags
  const [isGift, setIsGift] = useState(false);
  const [warranty, setWarranty] = useState(false);
  const [returnAccepted, setReturnAccepted] = useState(false);
  const [descVisible, setDescVisible] = useState(true);
  const [expiryDate, setExpiryDate] = useState('');
  const [deliveryMargin, setDeliveryMargin] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState(null);

  // State — Categories
  const [categories1, setCategories1] = useState([]);
  const [categories2, setCategories2] = useState([]);
  const [categories3, setCategories3] = useState([]);
  const [loadingCat1, setLoadingCat1] = useState(false);
  const [loadingCat2, setLoadingCat2] = useState(false);
  const [loadingCat3, setLoadingCat3] = useState(false);
  const [selectedCat1, setSelectedCat1] = useState(null);
  const [selectedCat2, setSelectedCat2] = useState(null);
  const [selectedCat3, setSelectedCat3] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedSeasons, setSelectedSeasons] = useState([]);
  const [filters, setFilters] = useState({});
  const [loadingFilters, setLoadingFilters] = useState(false);

  // State — Variants
  const [variantInput, setVariantInput] = useState('');
  const [variants, setVariants] = useState([]);

  // State — Descriptions
  const [shortDesc, setShortDesc] = useState('');
  const [productDesc, setProductDesc] = useState('');

  // State — SEO
  const [pageTitle, setPageTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');

  // State — Images (mock colors as placeholders)
  const [socialImage, setSocialImage] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [supportImages, setSupportImages] = useState([null, null, null]);

  // Modal
  const [activeModal, setActiveModal] = useState(null);

  // ─── Auto-slug ───────────────────────────────────────────────────────────
  useEffect(() => {
    setSlug(
      productName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim(),
    );
  }, [productName]);

  // ─── Auto volumetric ──────────────────────────────────────────────────────
  useEffect(() => {
    const v =
      ((parseFloat(dimW) || 1) *
        (parseFloat(dimH) || 1) *
        (parseFloat(dimL) || 1)) /
      5000;
    setVolumetric(v.toFixed(4));
  }, [dimW, dimH, dimL]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const numOnly = t => t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

  const toggleSeason = season =>
    setSelectedSeasons(prev =>
      prev.find(x => x.id === season.id)
        ? prev.filter(x => x.id !== season.id)
        : [...prev, season],
    );

  const toggleFilter = (labelId, filterId) =>
    setSelectedFilters(prev => {
      const cur = prev[labelId] || [];
      return {
        ...prev,
        [labelId]: cur.includes(filterId)
          ? cur.filter(id => id !== filterId)
          : [...cur, filterId],
      };
    });

  const requestPermission = async type => {
    const permission =
      Platform.OS === 'android'
        ? type === 'camera'
          ? PERMISSIONS.ANDROID.CAMERA
          : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE
        : type === 'camera'
        ? PERMISSIONS.IOS.CAMERA
        : PERMISSIONS.IOS.PHOTO_LIBRARY;

    const result = await check(permission);
    if (result === RESULTS.GRANTED) return true;

    const requested = await request(permission);
    return requested === RESULTS.GRANTED;
  };

  const validateImage = image => {
    // Check file size - max 3MB
    const maxSize = 3 * 1024 * 1024; // 3MB in bytes
    if (image.size > maxSize) {
      Alert.alert(
        'Image Too Large',
        `Image size is ${(image.size / (1024 * 1024)).toFixed(
          2,
        )}MB. Maximum allowed is 3MB.`,
        [{ text: 'OK' }],
      );
      return false;
    }
    return true;
  };

  // Show picker options (Camera or Gallery)
  const showImageOptions = onPick => {
    Alert.alert('Select Image', 'Choose image source', [
      {
        text: 'Camera',
        onPress: () => openCamera(onPick),
      },
      {
        text: 'Gallery',
        onPress: () => openGallery(onPick),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  // Open Camera
  const openCamera = async onPick => {
    const hasPermission = await requestPermission('camera');
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required.');
      return;
    }

    try {
      const image = await ImagePicker.openCamera({
        width: 300,
        height: 400,
        cropping: true, // ← enable cropper
        cropperCircleOverlay: false,
        cropperToolbarTitle: 'Crop Image',
        cropperToolbarColor: '#1A237E',
        cropperToolbarWidgetColor: '#FFFFFF',
        cropperActiveWidgetColor: '#1565C0',
        compressImageQuality: 0.8,
        compressImageMaxWidth: 1200,
        compressImageMaxHeight: 1600,
        includeBase64: false,
        mediaType: 'photo',
      });

      if (validateImage(image)) {
        onPick(image);
      }
    } catch (error) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.log('Camera error:', error);
      }
    }
  };

  // Open Gallery
  const openGallery = async onPick => {
    const hasPermission = await requestPermission('gallery');
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Gallery permission is required.');
      return;
    }

    try {
      const image = await ImagePicker.openPicker({
        width: 300,
        height: 400,
        cropping: true, // ← enable cropper
        cropperCircleOverlay: false,
        cropperToolbarTitle: 'Crop Image',
        cropperToolbarColor: '#1A237E',
        cropperToolbarWidgetColor: '#FFFFFF',
        cropperActiveWidgetColor: '#1565C0',
        compressImageQuality: 0.8,
        compressImageMaxWidth: 1200,
        compressImageMaxHeight: 1600,
        includeBase64: false,
        mediaType: 'photo',
      });

      if (validateImage(image)) {
        onPick(image);
      }
    } catch (error) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.log('Gallery error:', error);
      }
    }
  };

  // Social Image
  const pickSocialImage = () => {
    showImageOptions(image => {
      setSocialImage({
        uri: image.path,
        size: image.size,
        width: image.width,
        height: image.height,
      });
    });
  };

  // Product Images
  const addProductImage = () => {
    showImageOptions(image => {
      const newImg = {
        id: Date.now().toString(),
        uri: image.path,
        size: image.size,
        width: image.width,
        height: image.height,
        isFeatured: productImages.length === 0,
      };
      setProductImages(prev => [...prev, newImg]);
    });
  };

  // Support Images
  const pickSupportImage = index => {
    showImageOptions(image => {
      const arr = [...supportImages];
      arr[index] = {
        uri: image.path,
        size: image.size,
        width: image.width,
        height: image.height,
      };
      setSupportImages(arr);
    });
  };

  const addVariant = () => {
    const name = variantInput.trim().toUpperCase();
    if (!name || variants.find(v => v.name === name)) return;
    setVariants(prev => [...prev, { name, price: '' }]);
    setVariantInput('');
  };

  const COLORS = [
    '#FFE0B2',
    '#C8E6C9',
    '#BBDEFB',
    '#F8BBD0',
    '#E1BEE7',
    '#FFF9C4',
  ];
  const rndColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

  const mockPickSocial = () => setSocialImage({ color: rndColor() });
  const mockAddProductImg = () => {
    const img = {
      id: Date.now().toString(),
      color: rndColor(),
      isFeatured: productImages.length === 0,
    };
    setProductImages(prev => [...prev, img]);
  };
  const setFeatured = id =>
    setProductImages(prev =>
      prev.map(img => ({ ...img, isFeatured: img.id === id })),
    );
  const removeProductImg = id =>
    setProductImages(prev => prev.filter(img => img.id !== id));

  const mockPickSupport = i => {
    const arr = [...supportImages];
    arr[i] = { color: rndColor() };
    setSupportImages(arr);
  };

  const fetchMaxProductNo = async () => {
    try {
      setLoadingProductNo(true);
      const response = await productAPI.getMaxProductNo();
      if (response.data.status === 'success') {
        setProductNo(response.data.data);
      } else if (response.data.data) {
        setProductNo(response.data.data);
      }
    } catch (error) {
      console.error('Fetch max product no error:', error);
    } finally {
      setLoadingProductNo(false);
    }
  };

  const fetchTypes = async () => {
    try {
      setLoadingTypes(true);
      const response = await productAPI.getTypes();
      console.log('Types:', JSON.stringify(response.data, null, 2));
      if (response.data.status === 'success') {
        setTypes(response.data.data);
      }
    } catch (error) {
      console.log('Types fetch error:', error.message);
    } finally {
      setLoadingTypes(false);
    }
  };

  const fetchVenders = async () => {
    try {
      setLoadingVenders(true);
      const response = await productAPI.getVenders();
      console.log('Venders:', JSON.stringify(response.data, null, 2));
      if (response.data.status === 'success') {
        setVenders(response.data.data);
      }
    } catch (error) {
      console.log('Venders fetch error:', error.message);
    } finally {
      setLoadingVenders(false);
    }
  };
  const fetchBrands = async () => {
    try {
      setLoadingBrands(true);
      const response = await productAPI.getBrands();
      console.log('Brands:', JSON.stringify(response.data, null, 2));
      if (response.data.status === 'success') {
        setBrands(response.data.data);
      }
    } catch (error) {
      console.log('Brands fetch error:', error.message);
    } finally {
      setLoadingBrands(false);
    }
  };
  const fetchSizeCharts = async () => {
    try {
      setLoadingSizeCharts(true);
      const response = await productAPI.getSizeCharts();
      console.log('Size Charts:', JSON.stringify(response.data, null, 2));
      if (response.data.status === 'success') {
        setSizeCharts(response.data.data);
      }
    } catch (error) {
      console.log('Size Charts fetch error:', error.message);
    } finally {
      setLoadingSizeCharts(false);
    }
  };

  const fetchCategories1 = async () => {
    try {
      setLoadingCat1(true);
      const response = await productAPI.getCategoriesByLevel1();
      console.log('Cat1:', JSON.stringify(response.data, null, 2));
      if (response.data.status === 'success') {
        setCategories1(response.data.data);
      }
    } catch (error) {
      console.log('Cat1 fetch error:', error.message);
    } finally {
      setLoadingCat1(false);
    }
  };

  const fetchCategories2 = async level1Id => {
    try {
      setLoadingCat2(true);
      setCategories2([]); // clear previous
      setCategories3([]); // clear previous
      const response = await productAPI.getCategoriesByLevel2(level1Id);
      console.log('Cat2:', JSON.stringify(response.data, null, 2));
      if (response.data.status === 'success') {
        setCategories2(response.data.data);
      }
    } catch (error) {
      console.log('Cat2 fetch error:', error.message);
    } finally {
      setLoadingCat2(false);
    }
  };

  const fetchCategories3 = async level2Id => {
    try {
      setLoadingCat3(true);
      setCategories3([]); // clear previous
      const response = await productAPI.getCategoriesByLevel3(level2Id);
      console.log('Cat3:', JSON.stringify(response.data, null, 2));
      if (response.data.status === 'success') {
        setCategories3(response.data.data);
      }
    } catch (error) {
      console.log('Cat3 fetch error:', error.message);
    } finally {
      setLoadingCat3(false);
    }
  };

  const fetchFilters = async categoryId => {
    try {
      setLoadingFilters(true);
      setFilters({}); // clear previous
      const response = await productAPI.getFilters(categoryId);
      console.log('Filters:', JSON.stringify(response.data, null, 2));
      if (response.data.status === 'success') {
        setFilters(response.data.data);
      }
    } catch (error) {
      console.log('Filters fetch error:', error.message);
    } finally {
      setLoadingFilters(false);
    }
  };

  const fetchSeasons = async () => {
    try {
      setLoadingSeasons(true);
      const response = await productAPI.getSeasons();
      console.log('Seasons:', JSON.stringify(response.data, null, 2));
      if (response.data.status === 'success') {
        setSeasons(response.data.data);
      }
    } catch (error) {
      console.log('Seasons fetch error:', error.message);
    } finally {
      setLoadingSeasons(false);
    }
  };

  useEffect(() => {
    fetchMaxProductNo();
    fetchTypes(); // ← add this
    fetchVenders(); // ← add this
    fetchBrands(); // ← add this
    fetchSizeCharts(); // ← add this
    fetchCategories1(); // ← add this
    fetchSeasons(); // ← add this
  }, []);

  // ─── Generic Dropdown Modal ──────────────────────────────────────────────
  const DropModal = ({
    mKey,
    title,
    data,
    labelKey,
    onSelect,
    multi = false,
    selected = [],
  }) => (
    <Modal
      visible={activeModal === mKey}
      animationType="slide"
      transparent
      onRequestClose={() => setActiveModal(null)}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{title}</Text>
            <TouchableOpacity
              style={s.sheetDoneBtn}
              onPress={() => setActiveModal(null)}
            >
              <Text style={s.sheetDoneBtnText}>{multi ? 'Done ✓' : '✕'}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={item => item.id?.toString()}
            contentContainerStyle={s.sheetList}
            renderItem={({ item }) => {
              const active = multi
                ? !!selected.find(x => x.id === item.id)
                : false;
              return (
                <TouchableOpacity
                  style={[s.sheetItem, active && s.sheetItemActive]}
                  onPress={() => {
                    onSelect(item);
                    if (!multi) setActiveModal(null);
                  }}
                  activeOpacity={0.65}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      flex: 1,
                    }}
                  >
                    {item.color && (
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: item.color,
                        }}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          s.sheetItemText,
                          active && s.sheetItemTextActive,
                        ]}
                      >
                        {item[labelKey]}
                      </Text>
                      {item.short_name && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: C.textPlaceholder,
                            marginTop: 2,
                          }}
                        >
                          {item.short_name}
                        </Text>
                      )}
                    </View>
                  </View>
                  {active && <Text style={s.sheetCheck}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );

  const sectionOffset = showFilters ? 1 : 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* ── Top Bar ── */}

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ══════════════════════════════════
            01  BASIC INFORMATION
        ══════════════════════════════════ */}
        <View style={s.card}>
          <SectionHeader number="01" icon="📦" title="Basic Information" />

          <FieldLabel label="Product Name" required />
          <TextInput
            style={s.input}
            value={productName}
            onChangeText={setProductName}
            placeholder="e.g. Premium Cotton T-Shirt"
            placeholderTextColor={C.textPlaceholder}
          />

          <FieldLabel label="Slug" required />
          <TextInput
            style={[s.input, s.mono]}
            value={slug}
            onChangeText={setSlug}
            placeholder="premium-cotton-t-shirt"
            placeholderTextColor={C.textPlaceholder}
            autoCapitalize="none"
          />

          <FieldLabel label="Product Code" required />
          <View style={s.readonlyRow}>
            {loadingProductNo ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.readonlyText}>{String(ProductNo || '')}</Text>
            )}
            <View style={s.autoBadge}>
              <Text style={s.autoBadgeText}>AUTO</Text>
            </View>
          </View>

          <FieldLabel label="Video Link" hint="YouTube only" />
          <TextInput
            style={s.input}
            value={videoLink}
            onChangeText={setVideoLink}
            placeholder="https://youtube.com/watch?v=..."
            placeholderTextColor={C.textPlaceholder}
            autoCapitalize="none"
            keyboardType="url"
          />

          <View style={s.row2}>
            <View style={s.col}>
              <FieldLabel label="Type" required />
              {loadingTypes ? (
                <ActivityIndicator size="small" color={C.accent} />
              ) : (
                <Selector
                  value={selectedType?.type_name}
                  placeholder="Select type"
                  onPress={() => setActiveModal('type')}
                />
              )}
            </View>
            <View style={s.col}>
              <FieldLabel label="Vendor" required />
              {loadingVenders ? (
                <ActivityIndicator size="small" color={C.accent} />
              ) : (
                <Selector
                  value={selectedVender?.vender_name}
                  placeholder="Select vendor"
                  onPress={() => setActiveModal('vendor')}
                />
              )}
            </View>
          </View>

          <View style={s.row2}>
            <View style={s.col}>
              <FieldLabel label="Brand" required />
              {loadingBrands ? (
                <ActivityIndicator size="small" color={C.accent} />
              ) : (
                <Selector
                  value={selectedBrand?.brand_name}
                  placeholder="Select brand"
                  onPress={() => setActiveModal('brand')}
                />
              )}
            </View>
            <View style={s.col}>
              <FieldLabel label="Status" required />
              <View style={[s.readonlyRow, { marginTop: 0 }]}>
                <View style={s.statusDot} />
                <Text style={[s.readonlyText, { color: C.red }]}>Inactive</Text>
              </View>
            </View>
          </View>

          <FieldLabel label="Search Tags" hint="comma separated" />
          <TextInput
            style={[s.input, s.multiline]}
            value={searchTags}
            onChangeText={setSearchTags}
            placeholder="cotton, summer, casual..."
            placeholderTextColor={C.textPlaceholder}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* ══════════════════════════════════
            02  PHYSICAL DETAILS
        ══════════════════════════════════ */}
        <View style={s.card}>
          <SectionHeader number="02" icon="⚖️" title="Physical Details" />

          <FieldLabel label="Actual Weight (kg)" required />
          <TextInput
            style={s.input}
            value={weight}
            onChangeText={t => setWeight(numOnly(t))}
            placeholder="0.00"
            placeholderTextColor={C.textPlaceholder}
            keyboardType="decimal-pad"
          />

          <FieldLabel label="Dimensions W × H × L (cm)" required />
          <View style={s.dimRow}>
            {[
              { v: dimW, s: setDimW, p: 'W' },
              { v: dimH, s: setDimH, p: 'H' },
              { v: dimL, s: setDimL, p: 'L' },
            ].map(({ v, s: setter, p }, i) => (
              <React.Fragment key={p}>
                <TextInput
                  style={[s.input, s.dimInput]}
                  value={v}
                  onChangeText={t => setter(numOnly(t))}
                  placeholder={p}
                  placeholderTextColor={C.textPlaceholder}
                  keyboardType="decimal-pad"
                  textAlign="center"
                />
                {i < 2 && <Text style={s.dimX}>×</Text>}
              </React.Fragment>
            ))}
          </View>

          <FieldLabel label="Volumetric Weight" required />
          <View style={s.readonlyRow}>
            <Text style={s.readonlyText}>{volumetric}</Text>
            <Text style={s.unitLabel}>kg</Text>
          </View>
        </View>

        {/* ══════════════════════════════════
            03  OPTIONS & FLAGS
        ══════════════════════════════════ */}
        <View style={s.card}>
          <SectionHeader number="03" icon="⚙️" title="Options & Flags" />

          {[
            { label: 'Gift Card', val: isGift, set: setIsGift },
            { label: 'Warranty Available', val: warranty, set: setWarranty },
            {
              label: 'Return Accepting',
              val: returnAccepted,
              set: setReturnAccepted,
            },
            {
              label: 'Visible Product Details',
              val: descVisible,
              set: setDescVisible,
            },
          ].map(({ label, val, set }) => (
            <View key={label} style={s.switchRow}>
              <Text style={s.switchLabel}>{label}</Text>
              <Switch
                value={val}
                onValueChange={set}
                trackColor={{ false: '#E0E0E0', true: '#A5D6A7' }}
                thumbColor={val ? C.green : '#9E9E9E'}
              />
            </View>
          ))}

          <View style={s.row2}>
            <View style={s.col}>
              <FieldLabel label="Expiry Date" />
              <TextInput
                style={s.input}
                value={expiryDate}
                onChangeText={setExpiryDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.textPlaceholder}
              />
            </View>
            <View style={s.col}>
              <FieldLabel label="Delivery Margin (Days)" />
              <TextInput
                style={s.input}
                value={deliveryMargin}
                onChangeText={setDeliveryMargin}
                placeholder="e.g. 3"
                placeholderTextColor={C.textPlaceholder}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <FieldLabel label="Origin" required />
          <Selector
            value={selectedOrigin?.origin_zone_name}
            placeholder="Select origin city"
            onPress={() => setActiveModal('origin')}
          />
        </View>

        {/* ══════════════════════════════════
            04  CATEGORIES
        ══════════════════════════════════ */}
        <View style={s.card}>
          <SectionHeader number="04" icon="🗂️" title="Categories" />

          <FieldLabel label="Category Level 1" required />
          {loadingCat1 ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <Selector
              value={selectedCat1?.category_name}
              placeholder="Select category"
              onPress={() => setActiveModal('cat1')}
            />
          )}

          <FieldLabel label="Category Level 2" required />
          {loadingCat2 ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <Selector
              value={selectedCat2?.category_name}
              placeholder={
                selectedCat1 ? 'Select sub-category' : 'Select Level 1 first'
              }
              onPress={() => selectedCat1 && setActiveModal('cat2')}
              disabled={!selectedCat1}
            />
          )}

          <FieldLabel label="Category Level 3" required />
          {loadingCat3 ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <Selector
              value={selectedCat3?.category_name}
              placeholder={
                selectedCat2 ? 'Select sub-category' : 'Select Level 2 first'
              }
              onPress={() => selectedCat2 && setActiveModal('cat3')}
              disabled={!selectedCat2}
            />
          )}

          <View style={s.row2}>
            <View style={s.col}>
              <FieldLabel label="Gender" />
              <Selector
                value={selectedGender || undefined}
                placeholder="Select gender"
                onPress={() => setActiveModal('gender')}
              />
            </View>
            <View style={s.col}>
              <FieldLabel label="Size Chart" />
              {loadingSizeCharts ? (
                <ActivityIndicator size="small" color={C.accent} />
              ) : (
                <Selector
                  value={selectedSizechart?.sizechart_code}
                  placeholder="Select chart"
                  onPress={() => setActiveModal('sizechart')}
                />
              )}
            </View>
          </View>

          <FieldLabel label="Season" required />
          {loadingSeasons ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <Selector
              value={
                selectedSeasons.length > 0
                  ? selectedSeasons.map(x => x.short_name).join(', ') // ← use short_name
                  : undefined
              }
              placeholder="Select season(s)"
              onPress={() => setActiveModal('season')}
            />
          )}

          {selectedSeasons.length > 0 && (
            <View style={s.chipRow}>
              {selectedSeasons.map(ss => (
                <View
                  key={ss.id}
                  style={[
                    s.chip,
                    { backgroundColor: ss.color + '22', borderColor: ss.color },
                  ]} // ← use season color
                >
                  <Text style={[s.chipText, { color: ss.color }]}>
                    {ss.short_name}
                  </Text>
                  <TouchableOpacity onPress={() => toggleSeason(ss)}>
                    <Text style={[s.chipX, { color: ss.color }]}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ══════════════════════════════════
            05  FILTERS (after Cat3 chosen)
        ══════════════════════════════════ */}
        {showFilters && (
          <View style={s.card}>
            <SectionHeader number="05" icon="🔍" title="Filters" />

            {/* Loading State */}
            {loadingFilters ? (
              <View style={s.filterLoading}>
                <ActivityIndicator size="small" color={C.accent} />
                <Text style={s.filterLoadingText}>Loading filters...</Text>
              </View>
            ) : Object.keys(filters).length === 0 ? (
              // Empty State
              <Text style={s.filterEmpty}>
                No filters available for this category
              </Text>
            ) : (
              // Filters List
              Object.entries(filters).map(([groupName, items]) => (
                <View key={groupName} style={s.filterGroup}>
                  <Text style={s.filterGroupLabel}>{groupName}</Text>
                  <View style={s.filterChips}>
                    {items.map(f => {
                      const on = (selectedFilters[f.label_id] || []).includes(
                        f.id,
                      );
                      return (
                        <TouchableOpacity
                          key={f.id}
                          style={[s.fChip, on && s.fChipOn]}
                          onPress={() => toggleFilter(f.label_id, f.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.fChipText, on && s.fChipTextOn]}>
                            {f.lable_data}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ══════════════════════════════════
            VARIANTS
        ══════════════════════════════════ */}
        <View style={s.card}>
          <SectionHeader
            number={`0${5 + sectionOffset}`}
            icon="🏷️"
            title="Variants"
          />

          <View style={s.variantAddRow}>
            <TextInput
              style={[s.input, s.variantTextField]}
              value={variantInput}
              onChangeText={setVariantInput}
              placeholder="Variant name (e.g. RED-L)"
              placeholderTextColor={C.textPlaceholder}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={addVariant}
            />
            <TouchableOpacity
              style={s.variantAddBtn}
              onPress={addVariant}
              activeOpacity={0.8}
            >
              <Text style={s.variantAddBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {variants.map(v => (
            <View key={v.name} style={s.variantRow}>
              <View style={s.variantBadge}>
                <Text style={s.variantBadgeText}>{v.name}</Text>
              </View>
              <TextInput
                style={s.variantPriceInput}
                value={v.price}
                onChangeText={t =>
                  setVariants(prev =>
                    prev.map(x =>
                      x.name === v.name ? { ...x, price: numOnly(t) } : x,
                    ),
                  )
                }
                placeholder="Price"
                placeholderTextColor={C.textPlaceholder}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                style={s.variantDelBtn}
                onPress={() =>
                  setVariants(prev => prev.filter(x => x.name !== v.name))
                }
              >
                <Text style={s.variantDelText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════════
            DESCRIPTIONS
        ══════════════════════════════════ */}
        <View style={s.card}>
          <SectionHeader
            number={`0${6 + sectionOffset}`}
            icon="📝"
            title="Descriptions"
          />

          <FieldLabel label="Short Description" />
          <TextInput
            style={[s.input, s.multiline]}
            value={shortDesc}
            onChangeText={setShortDesc}
            placeholder="Brief product summary..."
            placeholderTextColor={C.textPlaceholder}
            multiline
            numberOfLines={3}
          />

          <FieldLabel label="Product Details" />
          <TextInput
            style={[s.input, { minHeight: 130, textAlignVertical: 'top' }]}
            value={productDesc}
            onChangeText={setProductDesc}
            placeholder="Full description, specs, materials, care instructions..."
            placeholderTextColor={C.textPlaceholder}
            multiline
            numberOfLines={6}
          />
        </View>

        {/* ══════════════════════════════════
            IMAGES
        ══════════════════════════════════ */}
        <View style={s.card}>
          <SectionHeader
            number={`0${7 + sectionOffset}`}
            icon="🖼️"
            title="Images"
          />

          {/* Social Image */}
          <FieldLabel label="Social Media Image" hint="1:1 ratio • max 3MB" />
          <TouchableOpacity
            style={[
              s.imgPickArea,
              socialImage && {
                borderStyle: 'solid',
                padding: 0,
                overflow: 'hidden',
              },
            ]}
            onPress={pickSocialImage}
            activeOpacity={0.8}
          >
            {socialImage ? (
              <View style={s.socialPreview}>
                <Image
                  source={{ uri: socialImage.uri }}
                  style={s.socialPreviewImg}
                  resizeMode="cover"
                />
                <View style={s.imgOverlay}>
                  <Text style={s.imgOverlayText}>Tap to change</Text>
                </View>
              </View>
            ) : (
              <View style={s.imgPickInner}>
                <Text style={s.imgPickIcon}>📷</Text>
                <Text style={s.imgPickText}>Choose Social Image</Text>
                <Text style={s.imgPickHint}>
                  jpeg · png · jpg · webp • max 3MB
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Product Images */}
          <FieldLabel
            label="Product Images"
            required
            hint="3:4 ratio • max 3MB"
          />
          <TouchableOpacity
            style={s.imgAddBtn}
            onPress={addProductImage}
            activeOpacity={0.8}
          >
            <Text style={s.imgPickIcon}>📷</Text>
            <Text style={s.imgPickText}>Add Product Image</Text>
          </TouchableOpacity>

          {productImages.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.productImgScroll}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {productImages.map(img => (
                <View key={img.id} style={s.productImgWrapper}>
                  <Image
                    source={{ uri: img.uri }}
                    style={[
                      s.productImgThumb,
                      img.isFeatured && s.productImgThumbFeatured,
                    ]}
                    resizeMode="cover"
                  />
                  {/* Size badge */}
                  <View style={s.imgSizeBadge}>
                    <Text style={s.imgSizeBadgeText}>
                      {(img.size / (1024 * 1024)).toFixed(1)}MB
                    </Text>
                  </View>
                  {/* Remove button */}
                  <TouchableOpacity
                    style={s.imgRemoveBtn}
                    onPress={() => removeProductImg(img.id)}
                  >
                    <Text style={s.imgRemoveText}>×</Text>
                  </TouchableOpacity>
                  {/* Featured button */}
                  <TouchableOpacity
                    style={[s.featuredTag, img.isFeatured && s.featuredTagOn]}
                    onPress={() => setFeatured(img.id)}
                  >
                    <Text
                      style={[
                        s.featuredTagText,
                        img.isFeatured && s.featuredTagTextOn,
                      ]}
                    >
                      {img.isFeatured ? '⭐ Featured' : 'Set Featured'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Support Images */}
          <FieldLabel label="Support Images" hint="max 3MB each" />
          <View style={s.supportRow}>
            {[0, 1, 2].map(i => (
              <TouchableOpacity
                key={i}
                style={s.supportBox}
                onPress={() => pickSupportImage(i)}
                activeOpacity={0.8}
              >
                {supportImages[i] ? (
                  <>
                    <Image
                      source={{ uri: supportImages[i].uri }}
                      style={s.supportImgFull}
                      resizeMode="cover"
                    />
                    <View style={s.supportDoneOverlay}>
                      <Text style={s.supportDone}>✓</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={s.imgPickIcon}>📷</Text>
                    <Text style={s.supportLabel}>Image {i + 1}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════
            SEO
        ══════════════════════════════════ */}
        <View style={s.card}>
          <SectionHeader
            number={`0${8 + sectionOffset}`}
            icon="🔎"
            title="SEO Fields"
          />

          {[
            {
              label: 'Page Title',
              val: pageTitle,
              set: setPageTitle,
              ph: 'Product page title',
            },
            {
              label: 'Meta Tag Description',
              val: metaDesc,
              set: setMetaDesc,
              ph: 'Short description for search engines',
            },
            {
              label: 'Meta Keywords',
              val: metaKeywords,
              set: setMetaKeywords,
              ph: 'keyword1, keyword2',
            },
            {
              label: 'Canonical URL',
              val: canonicalUrl,
              set: setCanonicalUrl,
              ph: 'https://...',
            },
          ].map(({ label, val, set, ph }) => (
            <View key={label}>
              <FieldLabel label={label} />
              <TextInput
                style={s.input}
                value={val}
                onChangeText={set}
                placeholder={ph}
                placeholderTextColor={C.textPlaceholder}
                autoCapitalize="none"
              />
            </View>
          ))}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Bottom Bar ── */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={s.cancelBtn}
          activeOpacity={0.7}
          onPress={() => navigation?.goBack?.()}
        >
          <Text style={s.cancelBtnText}>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.submitBtn} activeOpacity={0.85}>
          <Text style={s.submitBtnText}>Create Product</Text>
        </TouchableOpacity>
      </View>

      {/* ═══════════ MODALS ═══════════ */}
      <DropModal
        mKey="type"
        title="Select Type"
        data={types}
        labelKey="type_name"
        onSelect={setSelectedType}
      />
      <DropModal
        mKey="vendor"
        title="Select Vendor"
        data={venders}
        labelKey="vender_name"
        onSelect={setSelectedVender}
      />
      <DropModal
        mKey="brand"
        title="Select Brand"
        data={brands}
        labelKey="brand_name"
        onSelect={setSelectedBrand}
      />
      <DropModal
        mKey="origin"
        title="Select Origin"
        data={MOCK_ORIGINS}
        labelKey="origin_zone_name"
        onSelect={setSelectedOrigin}
      />
      <DropModal
        mKey="sizechart"
        title="Select Size Chart"
        data={sizeCharts}
        labelKey="sizechart_code"
        onSelect={setSelectedSizechart}
      />
      <DropModal
        mKey="gender"
        title="Select Gender"
        data={GENDER_OPTIONS}
        labelKey="label"
        onSelect={item => setSelectedGender(item.id === '' ? '' : item.label)}
      />
      <DropModal
        mKey="season"
        title="Select Season(s)"
        data={seasons} // ← real data
        labelKey="season_name" // ← full name in dropdown
        onSelect={toggleSeason}
        multi
        selected={selectedSeasons}
      />
      <DropModal
        mKey="cat1"
        title="Category Level 1"
        data={categories1} // ← real data
        labelKey="category_name"
        onSelect={item => {
          setSelectedCat1(item);
          setSelectedCat2(null);
          setSelectedCat3(null);
          setCategories2([]);
          setCategories3([]);
          setShowFilters(false);
          fetchCategories2(item.id); // ← fetch level2 when level1 selected
        }}
      />

      <DropModal
        mKey="cat2"
        title="Category Level 2"
        data={categories2} // ← real data
        labelKey="category_name"
        onSelect={item => {
          setSelectedCat2(item);
          setSelectedCat3(null);
          setCategories3([]);
          setShowFilters(false);
          fetchCategories3(item.id); // ← fetch level3 when level2 selected
        }}
      />

      <DropModal
        mKey="cat3"
        title="Category Level 3"
        data={categories3} // ← real data
        labelKey="category_name"
        onSelect={item => {
          setSelectedCat3(item);
          setShowFilters(true);
          setSelectedFilters({}); // ← clear previous filters
          fetchFilters(item.id);
        }}
      />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Top Bar
  topBar: {
    backgroundColor: C.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: { fontSize: 22, color: '#fff', marginTop: -2 },
  topBarMid: { flex: 1 },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  topBarSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  draftBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  draftBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
  },

  scroll: { flex: 1 },

  // Card
  card: {
    backgroundColor: C.surface,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: C.accentLight,
  },
  sectionBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  sectionIcon: { fontSize: 17, marginRight: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
    flex: 1,
  },

  // Field Label
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 7,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  star: { color: C.red },
  fieldHint: { fontSize: 11, color: C.textPlaceholder },

  // Input
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '500',
  },
  mono: { fontFamily: 'monospace', fontSize: 13, color: '#553C9A' },
  multiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },

  // Readonly
  readonlyRow: {
    backgroundColor: '#EDF2F7',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  readonlyText: {
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  unitLabel: { fontSize: 12, color: C.textPlaceholder, fontWeight: '600' },
  autoBadge: {
    backgroundColor: '#C6F6D5',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  autoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#276749',
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.red,
    marginRight: 8,
  },

  // Selector
  selector: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorDisabled: { opacity: 0.45 },
  selectorText: {
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  selectorPlaceholder: { color: C.textPlaceholder, fontWeight: '400' },
  selectorArrow: { fontSize: 20, color: C.textPlaceholder, marginTop: -3 },

  // 2-col
  row2: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  // Dimensions
  dimRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dimInput: { flex: 1 },
  dimX: { fontSize: 20, color: C.textPlaceholder, fontWeight: '300' },

  // Switch
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  switchLabel: {
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '500',
    flex: 1,
  },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    backgroundColor: C.accentLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  chipText: { fontSize: 13, color: C.accent, fontWeight: '600' },
  chipX: { fontSize: 17, color: C.accent, marginLeft: 6, fontWeight: 'bold' },

  // Filters
  filterGroup: { marginBottom: 18 },
  filterGroupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: '#F7FAFC',
  },
  fChipOn: { borderColor: C.accent, backgroundColor: C.accentLight },
  fChipText: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
  fChipTextOn: { color: C.accent, fontWeight: '700' },

  // Variants
  variantAddRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  variantTextField: { flex: 1, marginBottom: 0 },
  variantAddBtn: {
    backgroundColor: C.green,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantAddBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 10,
    gap: 10,
    marginTop: 10,
  },
  variantBadge: {
    backgroundColor: C.navy,
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  variantBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  variantPriceInput: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '500',
  },
  variantDelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  variantDelText: { color: C.red, fontWeight: '700', fontSize: 16 },

  // Images
  imgPickArea: {
    borderWidth: 2,
    borderColor: C.accent,
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imgAddBtn: {
    borderWidth: 2,
    borderColor: C.accent,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accentLight,
  },
  imgPickInner: { alignItems: 'center', padding: 24 },
  imgPickIcon: { fontSize: 28 },
  imgPickText: { fontSize: 14, color: C.accent, fontWeight: '600' },
  imgPickHint: { fontSize: 11, color: C.textPlaceholder, marginTop: 4 },
  socialPreview: {
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imgPreviewLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.35)',
  },
  imgTapChange: { fontSize: 11, color: 'rgba(0,0,0,0.3)', marginTop: 4 },
  productImgScroll: { marginTop: 12 },
  productImgWrapper: {
    marginRight: 12,
    alignItems: 'center',
    position: 'relative',
  },
  productImgThumb: {
    width: 82,
    height: 110,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.border,
  },
  productImgThumbFeatured: { borderColor: '#D69E2E', borderWidth: 2.5 },
  productImgText: { fontSize: 12, fontWeight: '700', color: 'rgba(0,0,0,0.3)' },
  imgRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: C.red,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imgRemoveText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 16,
  },
  featuredTag: {
    marginTop: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: C.border,
  },
  featuredTagOn: { backgroundColor: '#FEFCBF', borderColor: '#D69E2E' },
  featuredTagText: { fontSize: 9, color: C.textPlaceholder },
  featuredTagTextOn: { color: '#744210', fontWeight: '700' },
  supportRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  supportBox: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.accent,
    borderStyle: 'dashed',
    backgroundColor: C.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportLabel: {
    fontSize: 11,
    color: C.accent,
    fontWeight: '600',
    marginTop: 4,
  },
  supportDone: { fontSize: 28, color: C.green },

  // Bottom Bar
  bottomBar: {
    backgroundColor: C.surface,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1.5,
    borderTopColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  cancelBtnText: { fontSize: 15, color: C.textSecondary, fontWeight: '700' },
  submitBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: C.navy,
    alignItems: 'center',
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Modal Sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '72%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: C.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: C.textPrimary },
  sheetDoneBtn: {
    backgroundColor: C.accentLight,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  sheetDoneBtnText: { fontSize: 13, color: C.accent, fontWeight: '700' },
  sheetList: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  sheetItemActive: {
    backgroundColor: C.accentLight,
    marginHorizontal: -4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderBottomColor: 'transparent',
  },

  filterLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  filterLoadingText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '500',
  },
  filterEmpty: {
    fontSize: 13,
    color: C.textPlaceholder,
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  socialPreviewImg: {
    width: '100%',
    height: 110,
  },
  imgOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 6,
    alignItems: 'center',
  },
  imgOverlayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  imgSizeBadge: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  imgSizeBadgeText: {
    fontSize: 9,
    color: 'rgba(0,0,0,0.4)',
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  supportImgFull: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  supportDoneOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  sheetItemText: { fontSize: 15, color: C.textPrimary, fontWeight: '500' },
  sheetItemTextActive: { color: C.accent, fontWeight: '700' },
  sheetCheck: { fontSize: 16, color: C.accent, fontWeight: '800' },
});

export default CreateProductScreen;

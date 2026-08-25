// screens/WholesaleBarcodeScreen.js
//
// The web CRM's "WholeSale Barcode" page. The web generates labels for printing;
// a phone has no printer, so tapping an item shows its barcode full-screen at a
// size a scanner can read off the display.

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  useWindowDimensions,
  Alert,
} from 'react-native';
import {inventoryAPI} from '../api/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import Barcode128 from '../components/Barcode128';
import {C} from '../utils/theme';

const SIZES = [
  'S', 'M', 'L', 'XL', '2XL', '3XL', '3M', '6M', '9M', '12M', '18M',
  '2Y', '3Y', '4Y', '5Y', '6Y', '7Y', '8Y', '9Y', '10Y', '11Y', '12Y', '13Y', '14Y',
];

// Backdrop padding (20 each side), card padding (18 each side) and the white
// plate's own padding (14 each side) — what the bars have to fit inside.
const MODAL_CHROME = (20 + 18 + 14) * 2;

// The server stores image paths relative ('images/uploads/...'). Anything that
// is not an absolute URL cannot load, and an <Image> that fails leaves a blank
// box where its neighbours show a placeholder — so treat it as no image at all.
const imageUri = value =>
  /^https?:\/\//i.test(String(value || '')) ? value : null;

const WholesaleBarcodeScreen = () => {
  const {width: screenWidth} = useWindowDimensions();
  const barcodeMaxWidth = screenWidth - MODAL_CHROME;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [searchGSM, setSearchGSM] = useState('');
  const [size, setSize] = useState('');
  const [selected, setSelected] = useState(null);

  // Add Inventory: how many of the open item to add, and whether it is saving.
  const [addQty, setAddQty] = useState('1');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async (pageNo = 1, gsm = '', sizeFilter = '') => {
    const res = await inventoryAPI.getBarcodes(pageNo, {
      searchGSM: gsm,
      size_search: sizeFilter,
    });
    const payload = res.data?.data;

    setHasMore(!!payload?.next_page_url);
    setPage(payload?.current_page || pageNo);
    setRows(prev =>
      pageNo === 1 ? payload?.data || [] : [...prev, ...(payload?.data || [])],
    );
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      load(1, searchGSM, size)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(handle);
  }, [searchGSM, size, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(1, searchGSM, size).catch(() => {});
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await load(page + 1, searchGSM, size).catch(() => {});
    setLoadingMore(false);
  };

  const openItem = item => {
    setSelected(item);
    setAddQty('1');
  };

  // The web's Add Inventory button scans a barcode and files it under
  // item code + colour + size. Same endpoint here, with the barcode the label
  // carries, so a phone add and a scanned add land on the same row.
  const addToInventory = async () => {
    if (adding || !selected) return;

    const quantity = parseInt(addQty, 10);

    if (!quantity || quantity < 1) {
      Alert.alert('Enter a quantity', 'How many of these are you adding?');
      return;
    }

    setAdding(true);

    try {
      const res = await inventoryAPI.saveInventory({
        items: [{barcode: selected.barcode, quantity}],
        total_items: 1,
        total_quantity: quantity,
      });

      // The endpoint answers 200 even when the barcode matched nothing, so
      // check that it actually saved something before saying it worked.
      if (!res.data?.total_items) {
        Alert.alert('Not added', 'That barcode did not match an item.');
        return;
      }

      setSelected(null);
      Alert.alert('Added', quantity + ' x ' + (selected.itemcode_td || 'item') + ' added to inventory.');
    } catch (error) {
      Alert.alert(
        'Not added',
        error?.response?.data?.message || 'Could not add that to inventory.',
      );
    } finally {
      setAdding(false);
    }
  };

  const renderRow = ({item}) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => openItem(item)}>
      {imageUri(item.image_se) ? (
        <Image
          source={{uri: imageUri(item.image_se)}}
          style={styles.thumb}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Text style={styles.thumbEmptyText}>▤</Text>
        </View>
      )}

      <View style={styles.meta}>
        <Text style={styles.desc} numberOfLines={2}>
          {item.desc_td || 'No description'}
        </Text>
        <Text style={styles.code}>{item.itemcode_td}</Text>

        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{item.size_se || '—'}</Text>
          </View>
          <View style={[styles.chip, styles.chipColor]}>
            <Text style={styles.chipText}>{item.color || '—'}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.action}>▥</Text>
    </TouchableOpacity>
  );

  if (loading && rows.length === 0) {
    return <LoadingSpinner message="Loading items..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by GSM, e.g. 220"
          placeholderTextColor={C.textSecondary}
          value={searchGSM}
          onChangeText={setSearchGSM}
        />
        {searchGSM.length > 0 && (
          <TouchableOpacity onPress={() => setSearchGSM('')}>
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sizeBar}
        contentContainerStyle={styles.sizeBarContent}>
        <TouchableOpacity
          style={[styles.sizeChip, size === '' && styles.sizeChipOn]}
          onPress={() => setSize('')}>
          <Text
            style={[styles.sizeText, size === '' && styles.sizeTextOn]}>
            All sizes
          </Text>
        </TouchableOpacity>

        {SIZES.map(option => (
          <TouchableOpacity
            key={option}
            style={[styles.sizeChip, size === option && styles.sizeChipOn]}
            onPress={() => setSize(size === option ? '' : option)}>
            <Text
              style={[styles.sizeText, size === option && styles.sizeTextOn]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={rows}
        keyExtractor={item => String(item.id)}
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <Text style={styles.empty}>No items match those filters.</Text>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footer} color={C.accent} />
          ) : null
        }
      />

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle} numberOfLines={2}>
              {selected?.desc_td}
            </Text>
            <Text style={styles.modalSub}>
              {selected?.color} · {selected?.size_se}
            </Text>

            {/* White plate behind the bars: scanners need the contrast, and the
                card colour could change with the theme. */}
            <View style={styles.barcodePlate}>
              {!!selected && (
                <Barcode128
                  value={selected.barcode}
                  displayValue={selected.itemcode_td}
                  height={90}
                  moduleWidth={2}
                  maxWidth={barcodeMaxWidth}
                />
              )}
            </View>

            <Text style={styles.payload}>{selected?.barcode}</Text>

            <Text style={styles.modalHint}>
              Hold a scanner up to the screen, or print the label from the web
              CRM for a physical copy.
            </Text>

            <View style={styles.addRow}>
              <TextInput
                style={styles.qtyInput}
                keyboardType="number-pad"
                value={addQty}
                onChangeText={setAddQty}
                placeholder="Qty"
                placeholderTextColor={C.textSecondary}
                selectTextOnFocus
              />

              <TouchableOpacity
                style={[styles.addBtn, adding && styles.addBtnOff]}
                onPress={addToInventory}
                disabled={adding}>
                {adding ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.addBtnText}>Add Inventory</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelected(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: C.bg},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  searchInput: {flex: 1, paddingVertical: 12, fontSize: 14.5, color: C.textPrimary},
  clear: {fontSize: 16, color: C.textSecondary, paddingHorizontal: 6},
  sizeBar: {
    flexGrow: 0,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  sizeBarContent: {
    paddingHorizontal: 12,
    // The chips sat flush against the search input without this.
    paddingTop: 2,
    paddingBottom: 10,
    gap: 6,
    alignItems: 'center',
  },
  sizeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: C.bgAlt,
  },
  sizeChipOn: {backgroundColor: C.accent},
  sizeText: {fontSize: 12, fontWeight: '600', color: C.textSecondary},
  sizeTextOn: {color: '#fff'},
  listContent: {padding: 12, paddingBottom: 24},
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  thumb: {width: 54, height: 54, borderRadius: 8, backgroundColor: C.bgAlt},
  thumbEmpty: {alignItems: 'center', justifyContent: 'center'},
  thumbEmptyText: {fontSize: 20, color: C.textPlaceholder},
  meta: {flex: 1, minWidth: 0},
  desc: {fontSize: 14, fontWeight: '600', color: C.textPrimary, lineHeight: 19},
  code: {fontSize: 12, color: C.textSecondary, marginTop: 2},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6},
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: C.accentLight,
  },
  chipColor: {backgroundColor: C.successLight},
  chipText: {fontSize: 10.5, fontWeight: '700', color: C.textPrimary},
  // Nudged onto the description's optical centre-line rather than the top.
  action: {fontSize: 22, color: C.accent, marginTop: 12},
  empty: {textAlign: 'center', color: C.textSecondary, marginTop: 40},
  footer: {marginVertical: 16},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
  },
  modalSub: {fontSize: 12.5, color: C.textSecondary, marginTop: 3},
  barcodePlate: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  payload: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  modalHint: {
    fontSize: 11.5,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
  addRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 16,
  },
  qtyInput: {
    width: 72,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
    backgroundColor: C.surface,
    textAlign: 'center',
  },
  addBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.success,
  },
  addBtnOff: {opacity: 0.6},
  addBtnText: {color: '#fff', fontWeight: '700', fontSize: 14},
  modalClose: {
    marginTop: 16,
    alignSelf: 'stretch',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: C.accent,
  },
  modalCloseText: {color: '#fff', fontWeight: '700', fontSize: 14},
});

export default WholesaleBarcodeScreen;

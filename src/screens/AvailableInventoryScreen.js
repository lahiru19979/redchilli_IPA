// screens/AvailableInventoryScreen.js
//
// The web CRM's "Available Inventory" page: one row per product variant with its
// master and reserved quantities, plus stock-in and stock-out for anyone holding
// update_inventory. Movements go through the same endpoints and write the same
// history rows the web CRM does.

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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {inventoryAPI} from '../api/apiClient';
import {useAuth} from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {C} from '../utils/theme';

const STATUS_FILTERS = [
  {id: '', label: 'All'},
  {id: '1', label: 'In Stock'},
  {id: '0', label: 'Out of Stock'},
];

// The web page's Product Source dropdown: global = mapped to an AliExpress
// product, local = our own.
const SOURCE_FILTERS = [
  {id: '', label: 'All Sources'},
  {id: 'global', label: 'Global'},
  {id: 'local', label: 'Local'},
];

const AvailableInventoryScreen = () => {
  const {hasPermission} = useAuth();
  const canUpdate = hasPermission('update_inventory');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');

  // The stock movement sheet: which variant, which direction, and the figures.
  const [movement, setMovement] = useState(null); // {row, mode: 'in' | 'out'}
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (pageNo = 1, term = '', stockStatus = '', productSource = '') => {
      const res = await inventoryAPI.getAvailable(
        pageNo,
        term,
        stockStatus,
        productSource,
      );
      const payload = res.data?.data;

      setHasMore(!!payload?.next_page_url);
      setPage(payload?.current_page || pageNo);
      setRows(prev =>
        pageNo === 1
          ? payload?.data || []
          : [...prev, ...(payload?.data || [])],
      );
    },
    [],
  );

  useEffect(() => {
    // Debounced so typing doesn't fire a request per keystroke.
    const handle = setTimeout(() => {
      setLoading(true);
      load(1, search, status, source)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(handle);
  }, [search, status, source, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(1, search, status, source).catch(() => {});
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await load(page + 1, search, status, source).catch(() => {});
    setLoadingMore(false);
  };

  const openMovement = (row, mode) => {
    setMovement({row, mode});
    setQuantity('');
    setReason('');
  };

  const submitMovement = async () => {
    if (saving || !movement) return;

    const amount = parseInt(quantity, 10);

    if (!amount || amount < 1) {
      Alert.alert('Enter a quantity', 'How many units are moving?');
      return;
    }

    if (movement.mode === 'out' && !reason.trim()) {
      Alert.alert('Add a reason', 'Stock-out needs a reason for the record.');
      return;
    }

    setSaving(true);

    try {
      const res =
        movement.mode === 'in'
          ? await inventoryAPI.stockIn(movement.row.id, amount)
          : await inventoryAPI.stockOut(movement.row.id, amount, reason.trim());

      // Patch the card from the server's own figures rather than adding locally,
      // so the row cannot drift from what was actually stored.
      setRows(prev =>
        prev.map(row =>
          row.id === movement.row.id
            ? {
                ...row,
                master_quantity: res.data.master_quantity,
                reserved_quantity: res.data.reserved_quantity,
                stock_out_quantity: res.data.stock_out_quantity,
              }
            : row,
        ),
      );

      setMovement(null);
      Alert.alert('Saved', res.data.message || 'Stock updated.');
    } catch (error) {
      Alert.alert(
        'Not saved',
        error?.response?.data?.message || 'Could not update that stock.',
      );
    } finally {
      setSaving(false);
    }
  };

  const renderRow = ({item}) => {
    const inStock = item.master_quantity > 0;

    return (
      <View style={styles.card}>
        {item.image ? (
          <Image source={{uri: item.image}} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Text style={styles.thumbEmptyText}>No{'\n'}image</Text>
          </View>
        )}

        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={2}>
            {item.product_name || 'Unnamed product'}
          </Text>

          <Text style={styles.code}>
            {item.product_code} · {item.variant_name}
          </Text>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                {backgroundColor: inStock ? C.successLight : C.dangerLight},
              ]}>
              <Text
                style={[
                  styles.badgeText,
                  {color: inStock ? C.success : C.danger},
                ]}>
                {inStock ? 'In stock' : 'Out of stock'}
              </Text>
            </View>

            {item.status !== 1 && (
              <View style={[styles.badge, {backgroundColor: C.divider}]}>
                <Text style={[styles.badgeText, {color: C.textSecondary}]}>
                  Inactive
                </Text>
              </View>
            )}
          </View>

          <View style={styles.qtyRow}>
            <View style={styles.qtyItem}>
              <Text style={styles.qtyValue}>{item.master_quantity}</Text>
              <Text style={styles.qtyLabel}>Available</Text>
            </View>

            <View style={styles.qtyItem}>
              <Text style={styles.qtyValue}>{item.reserved_quantity}</Text>
              <Text style={styles.qtyLabel}>Reserved</Text>
            </View>

            <View style={styles.qtyItem}>
              <Text style={styles.qtyValue}>{item.stock_out_quantity}</Text>
              <Text style={styles.qtyLabel}>Stocked out</Text>
            </View>
          </View>

          {canUpdate && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.inBtn]}
                onPress={() => openMovement(item, 'in')}>
                <Text style={styles.actionText}>+ Stock In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.outBtn,
                  item.master_quantity < 1 && styles.actionOff,
                ]}
                disabled={item.master_quantity < 1}
                onPress={() => openMovement(item, 'out')}>
                <Text style={styles.actionText}>− Stock Out</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading && rows.length === 0) {
    return <LoadingSpinner message="Loading inventory..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by product name or code..."
          placeholderTextColor={C.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(filter => (
          <TouchableOpacity
            key={filter.id || 'all'}
            style={[styles.filter, status === filter.id && styles.filterOn]}
            onPress={() => setStatus(filter.id)}>
            <Text
              style={[
                styles.filterText,
                status === filter.id && styles.filterTextOn,
              ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.filterRow, styles.sourceRow]}>
        {SOURCE_FILTERS.map(filter => (
          <TouchableOpacity
            key={filter.id || 'any'}
            style={[styles.filter, source === filter.id && styles.filterOn]}
            onPress={() => setSource(filter.id)}>
            <Text
              style={[
                styles.filterText,
                source === filter.id && styles.filterTextOn,
              ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        visible={!!movement}
        transparent
        animationType="fade"
        onRequestClose={() => setMovement(null)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {movement?.mode === 'in' ? 'Stock In' : 'Stock Out'}
            </Text>

            <Text style={styles.modalProduct} numberOfLines={2}>
              {movement?.row.product_name} · {movement?.row.variant_name}
            </Text>

            <Text style={styles.modalCurrent}>
              {movement?.row.master_quantity} in stock now
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Quantity"
              placeholderTextColor={C.textSecondary}
              keyboardType="number-pad"
              value={quantity}
              onChangeText={setQuantity}
              autoFocus
            />

            {movement?.mode === 'out' && (
              <TextInput
                style={[styles.modalInput, styles.modalInputTall]}
                placeholder="Reason (recorded in the history)"
                placeholderTextColor={C.textSecondary}
                multiline
                value={reason}
                onChangeText={setReason}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setMovement(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSave,
                  movement?.mode === 'out' && styles.modalSaveOut,
                  saving && styles.actionOff,
                ]}
                onPress={submitMovement}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {movement?.mode === 'in' ? 'Add to stock' : 'Stock out'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
          <Text style={styles.empty}>No products match that search.</Text>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footer} color={C.accent} />
          ) : null
        }
      />
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
  },
  searchInput: {flex: 1, paddingVertical: 12, fontSize: 14.5, color: C.textPrimary},
  clear: {fontSize: 16, color: C.textSecondary, paddingHorizontal: 6},
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: C.bgAlt,
  },
  filterOn: {backgroundColor: C.accent},
  filterText: {fontSize: 12.5, fontWeight: '600', color: C.textSecondary},
  filterTextOn: {color: '#fff'},
  listContent: {padding: 12, paddingBottom: 24},
  card: {
    flexDirection: 'row',
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
  thumb: {width: 66, height: 66, borderRadius: 8, backgroundColor: C.bgAlt},
  thumbEmpty: {alignItems: 'center', justifyContent: 'center'},
  thumbEmptyText: {fontSize: 10, color: C.textPlaceholder, textAlign: 'center'},
  meta: {flex: 1, minWidth: 0},
  name: {fontSize: 14.5, fontWeight: '700', color: C.textPrimary},
  code: {fontSize: 12, color: C.textSecondary, marginTop: 2},
  badgeRow: {flexDirection: 'row', gap: 6, marginTop: 6},
  badge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10},
  badgeText: {fontSize: 10.5, fontWeight: '700'},
  qtyRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.divider,
  },
  qtyItem: {flex: 1},
  qtyValue: {fontSize: 16, fontWeight: '800', color: C.textPrimary},
  qtyLabel: {fontSize: 10.5, color: C.textSecondary, marginTop: 1},
  sourceRow: {paddingTop: 0},
  actionRow: {flexDirection: 'row', gap: 8, marginTop: 10},
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  inBtn: {backgroundColor: C.success},
  outBtn: {backgroundColor: C.danger},
  actionOff: {opacity: 0.5},
  actionText: {color: '#fff', fontWeight: '700', fontSize: 12.5},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {backgroundColor: C.surface, borderRadius: 14, padding: 18},
  modalTitle: {fontSize: 17, fontWeight: '800', color: C.textPrimary},
  modalProduct: {fontSize: 13.5, color: C.textPrimary, marginTop: 6},
  modalCurrent: {fontSize: 12, color: C.textSecondary, marginTop: 2},
  modalInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: C.textPrimary,
    backgroundColor: C.surface,
    marginTop: 12,
  },
  modalInputTall: {minHeight: 70, textAlignVertical: 'top'},
  modalActions: {flexDirection: 'row', gap: 10, marginTop: 16},
  modalCancel: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: C.bgAlt,
  },
  modalCancelText: {color: C.textSecondary, fontWeight: '700', fontSize: 14},
  modalSave: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.success,
  },
  modalSaveOut: {backgroundColor: C.danger},
  modalSaveText: {color: '#fff', fontWeight: '700', fontSize: 14},
  empty: {textAlign: 'center', color: C.textSecondary, marginTop: 40},
  footer: {marginVertical: 16},
});

export default AvailableInventoryScreen;

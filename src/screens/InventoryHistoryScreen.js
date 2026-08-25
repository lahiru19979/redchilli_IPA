// screens/InventoryHistoryScreen.js
//
// The web CRM's "Inventory History" page: every stock movement recorded against
// a product variant. Rows start collapsed — a variant can carry dozens of
// movements, and the reason for opening this screen is usually one product.

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
} from 'react-native';
import {inventoryAPI} from '../api/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import {C} from '../utils/theme';

// Stock coming in reads green, going out reads red, anything else neutral.
const operationColor = operation => {
  const value = String(operation || '').toLowerCase();

  if (value.includes('in') && !value.includes('initial')) return C.success;
  if (value.includes('out') || value.includes('reserve')) return C.danger;

  return C.textSecondary;
};

const InventoryHistoryScreen = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async (pageNo = 1, term = '') => {
    const res = await inventoryAPI.getHistory(pageNo, term);
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
      load(1, search)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(handle);
  }, [search, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(1, search).catch(() => {});
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await load(page + 1, search).catch(() => {});
    setLoadingMore(false);
  };

  const renderRow = ({item}) => {
    const open = openId === item.id;
    const movements = item.history || [];

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.head}
          activeOpacity={0.7}
          onPress={() => setOpenId(open ? null : item.id)}>
          {item.image ? (
            <Image source={{uri: item.image}} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]} />
          )}

          <View style={styles.meta}>
            <Text style={styles.name} numberOfLines={2}>
              {item.product_name || 'Unnamed product'}
            </Text>
            <Text style={styles.code}>
              {item.product_code} · {item.variant_name}
            </Text>
            <Text style={styles.count}>
              {movements.length === 0
                ? 'No movements'
                : `${movements.length} movement${movements.length === 1 ? '' : 's'}`}
            </Text>
          </View>

          <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
        </TouchableOpacity>

        {open && movements.length > 0 && (
          <View style={styles.historyBox}>
            {movements.map(row => (
              <View key={row.id} style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Text
                    style={[
                      styles.operation,
                      {color: operationColor(row.operation)},
                    ]}>
                    {row.operation || 'movement'}
                  </Text>
                  <Text style={styles.when}>
                    {row.when}
                    {' · '}
                    {row.processed_by || '-'}
                  </Text>

                  {!!row.order_number && (
                    <Text style={styles.order}>Order {row.order_number}</Text>
                  )}
                  {!!row.notes && (
                    <Text style={styles.notes} numberOfLines={2}>
                      {row.notes}
                    </Text>
                  )}
                </View>

                <View style={styles.historyRight}>
                  <Text style={styles.qty}>{row.quantity}</Text>
                  <Text style={styles.running}>→ {row.running_quantity}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading && rows.length === 0) {
    return <LoadingSpinner message="Loading history..." />;
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  searchInput: {flex: 1, paddingVertical: 12, fontSize: 14.5, color: C.textPrimary},
  clear: {fontSize: 16, color: C.textSecondary, paddingHorizontal: 6},
  listContent: {padding: 12, paddingBottom: 24},
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  head: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12},
  thumb: {width: 54, height: 54, borderRadius: 8, backgroundColor: C.bgAlt},
  thumbEmpty: {backgroundColor: C.divider},
  meta: {flex: 1, minWidth: 0},
  name: {fontSize: 14, fontWeight: '700', color: C.textPrimary},
  code: {fontSize: 12, color: C.textSecondary, marginTop: 2},
  count: {fontSize: 11.5, color: C.accent, fontWeight: '600', marginTop: 3},
  chevron: {fontSize: 16, color: C.textSecondary},
  historyBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.divider,
    backgroundColor: C.bgAlt,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  historyLeft: {flex: 1, minWidth: 0},
  operation: {fontSize: 13, fontWeight: '700', textTransform: 'capitalize'},
  when: {fontSize: 11.5, color: C.textSecondary, marginTop: 1},
  order: {fontSize: 11.5, color: C.accent, marginTop: 2},
  notes: {fontSize: 11.5, color: C.textSecondary, marginTop: 2, fontStyle: 'italic'},
  historyRight: {alignItems: 'flex-end'},
  qty: {fontSize: 15, fontWeight: '800', color: C.textPrimary},
  running: {fontSize: 11, color: C.textSecondary, marginTop: 1},
  empty: {textAlign: 'center', color: C.textSecondary, marginTop: 40},
  footer: {marginVertical: 16},
});

export default InventoryHistoryScreen;

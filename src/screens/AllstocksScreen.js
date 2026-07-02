// screens/AllStocksScreen.js
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {inventoryAPI} from '../api/apiClient';
import AllInventoryCard from '../components/AllInventoryCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { C } from '../utils/theme';

const AllStocksScreen = ({navigation}) => {
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInventories = async (pageNum = 1, refresh = false) => {
    try {
      if (pageNum === 1) {
        refresh ? setRefreshing(true) : setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await inventoryAPI.getAll(pageNum);
      
      console.log('Inventory Response:', response.data);
      
      const responseData = response.data;
      let newInventories = [];
      let totalPages = 1;

      if (responseData.status === 'success' && responseData.data) {
        newInventories = responseData.data.data || [];
        totalPages = responseData.data.last_page || 1;
      } else if (Array.isArray(responseData.data)) {
        newInventories = responseData.data;
      } else if (Array.isArray(responseData)) {
        newInventories = responseData;
      }

      setLastPage(totalPages);

      if (pageNum === 1) {
        setInventories(newInventories);
      } else {
        setInventories(prev => [...prev, ...newInventories]);
      }
      
      setPage(pageNum);
    } catch (error) {
      console.error('Fetch inventories error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchInventories();
  }, []);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchInventories(1, true);
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    fetchInventories(1, true);
  }, []);

  const loadMore = () => {
    if (!loadingMore && page < lastPage) {
      fetchInventories(page + 1);
    }
  };

  // Filter inventories based on search
  const filteredInventories = inventories.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.itemcode_td?.toLowerCase().includes(query) ||
      item.desc_td?.toLowerCase().includes(query) ||
      item.colortable?.toLowerCase().includes(query) ||
      item.size_se?.toLowerCase().includes(query)
    );
  });

  // Calculate total stock count
  const totalStock = filteredInventories.reduce((sum, item) => sum + (item.count || 0), 0);

  const renderInventoryItem = ({item}) => (
    <AllInventoryCard
      inventory={item}
      onPress={() => navigation.navigate('InventoryDetail', {inventory: item})}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={C.accent} />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  if (loading && inventories.length === 0) {
    return <LoadingSpinner message="Loading inventory..." />;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by code, description, color, size..."
          placeholderTextColor={C.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Card */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{filteredInventories.length}</Text>
          <Text style={styles.summaryLabel}>Items</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalStock}</Text>
          <Text style={styles.summaryLabel}>Total Stock</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{page}/{lastPage}</Text>
          <Text style={styles.summaryLabel}>Page</Text>
        </View>
      </View>

      {/* Inventory List */}
      <FlatList
        data={filteredInventories}
        renderItem={renderInventoryItem}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[C.accent]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No inventory found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery 
                ? 'Try a different search term' 
                : 'Scan items to add inventory'}
            </Text>
          </View>
        }
      />

      {/* FAB - Scan Inventory */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('InventoryScan')}>
        <Text style={styles.fabText}>📷</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    shadowColor: C.textPrimary,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: C.textPrimary,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: C.textSecondary,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: C.textPrimary,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: C.border,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: C.accent,
  },
  summaryLabel: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: C.textPrimary,
  },
  emptySubtext: {
    fontSize: 14,
    color: C.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: C.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.textPrimary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontSize: 26,
  },
});

export default AllStocksScreen;
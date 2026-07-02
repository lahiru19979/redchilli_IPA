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
  Alert,
} from 'react-native';
import {productAPI} from '../api/apiClient';
import ProductCard from '../components/AllProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { C } from '../utils/theme';

const AllProductScreen = ({navigation}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProducts = async (pageNum = 1, refresh = false) => {
    try {
      if (pageNum === 1) {
        refresh ? setRefreshing(true) : setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await productAPI.getAllproducts(pageNum);
      
      console.log('Product Response data:', response.data);
      
      // Handle API structure: response.data.data.data
      const responseData = response.data;
      let newProducts = [];
      let totalPages = 1;

      if (responseData.status === 'success' && responseData.data) {
        newProducts = responseData.data.data || [];
        totalPages = responseData.data.last_page || 1;
      } else if (Array.isArray(responseData.data)) {
        newProducts = responseData.data;
      } else if (Array.isArray(responseData)) {
        newProducts = responseData;
      }

      setLastPage(totalPages);

      if (pageNum === 1) {
        setProducts(newProducts);
      } else {
        setProducts(prev => [...prev, ...newProducts]);
      }
      
      setPage(pageNum);
    } catch (error) {
      console.error('Fetch products error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProducts(1, true);
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    fetchProducts(1, true);
  }, []);

  const loadMore = () => {
    if (!loadingMore && page < lastPage) {
      fetchProducts(page + 1);
    }
  };

  // Filter products based on search
  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.product_name?.toLowerCase().includes(query) ||
      product.product_code?.toLowerCase().includes(query) ||
      product.slug?.toLowerCase().includes(query) ||
      product.search_tags?.toLowerCase().includes(query) ||
      product.model?.toLowerCase().includes(query)
    );
  });

  const handleToggleStatus = product => {
    const activating = product.status !== 1;
    Alert.alert(
      activating ? 'Activate Product' : 'Deactivate Product',
      `Are you sure you want to ${activating ? 'activate' : 'deactivate'} "${
        product.product_name || 'this product'
      }"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: activating ? 'Activate' : 'Deactivate',
          style: activating ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const res = await productAPI.toggleProductStatus(product.id);
              if (res.data?.status === 'success') {
                const newStatus = res.data.data.new_status;
                setProducts(prev =>
                  prev.map(p =>
                    p.id === product.id ? {...p, status: newStatus} : p,
                  ),
                );
              } else {
                Alert.alert('Error', res.data?.message || 'Could not update status.');
              }
            } catch (e) {
              Alert.alert('Error', 'Could not update the product status.');
            }
          },
        },
      ],
    );
  };

  const renderProduct = ({item, index}) => (
    <ProductCard
      product={item}
      onPress={() => navigation.navigate('ProductDetail', {product: item})}
      onEdit={() => navigation.navigate('EditProduct', {product: item})}
      onToggleStatus={() => handleToggleStatus(item)}
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

  if (loading && products.length === 0) {
    return <LoadingSpinner message="Loading products..." />;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, code, model..."
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

      {/* Product Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredProducts.length} product(s) found
          {page < lastPage ? ` • Page ${page} of ${lastPage}` : ''}
        </Text>
      </View>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[C.accent]}
            tintColor={C.accent}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery 
                ? 'Try a different search term' 
                : 'Add your first product to get started'}
            </Text>
          </View>
        }
      />

      {/* FAB - Create Product */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateProduct')}>
        <Text style={styles.fabText}>+</Text>
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
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontWeight: '600',
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
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
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: C.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.accent,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: C.surface,
    fontWeight: '300',
    marginTop: -2,
  },
});

export default AllProductScreen;
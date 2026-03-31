import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import {productAPI} from '../api/apiClient';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';

const ProductScreen = ({navigation}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProducts = async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);

      const response = await productAPI.getAll();

      console.log('Product Response:', response.data);

      const responseData = response.data;
      let newProducts = [];

      if (responseData.status === 'success' && responseData.data) {
        // Handles: { status: 'success', data: { data: [...] } }  OR  { status: 'success', data: [...] }
        newProducts = responseData.data.data || responseData.data || [];
      } else if (Array.isArray(responseData.data)) {
        newProducts = responseData.data;
      } else if (Array.isArray(responseData)) {
        newProducts = responseData;
      }

      // Deduplicate by product id (API may return same id multiple times)
      const unique = newProducts.filter(
        (item, index, self) => index === self.findIndex(p => p.id === item.id),
      );

      setProducts(unique);
    } catch (error) {
      console.error('Fetch products error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProducts(true);
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    fetchProducts(true);
  }, []);

  // Filter products based on search
  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.product_name?.toLowerCase().includes(query) ||
      product.product_code?.toLowerCase().includes(query) ||
      product.search_tags?.toLowerCase().includes(query) ||
      product.gender?.toLowerCase().includes(query)
    );
  });

  const renderProduct = ({item}) => (
    <ProductCard
      product={item}
      onPress={() => navigation.navigate('ProductDetail', {product: item})}
    />
  );

  if (loading && products.length === 0) {
    return <LoadingSpinner message="Loading products..." />;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, code, tags..."
          placeholderTextColor="#999"
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
            colors={['#007AFF']}
          />
        }
        contentContainerStyle={styles.listContent}
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

      {/* FAB - Add Product */}
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
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#999',
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 13,
    color: '#666',
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
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
});

export default ProductScreen;

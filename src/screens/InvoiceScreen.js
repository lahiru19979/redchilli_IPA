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
import {invoiceAPI} from '../api/apiClient';
import InvoiceCard from '../components/InvoiceCard';
import LoadingSpinner from '../components/LoadingSpinner';

const InvoiceScreen = ({navigation}) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInvoices = async (pageNum = 1, refresh = false) => {
    try {
      if (pageNum === 1) {
        refresh ? setRefreshing(true) : setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await invoiceAPI.getAll(pageNum);
      
      console.log('Invoice Response:', response.data);
      
      // Handle YOUR API structure: response.data.data.data
      const responseData = response.data;
      let newInvoices = [];
      let totalPages = 1;

      if (responseData.status === 'success' && responseData.data) {
        newInvoices = responseData.data.data || [];
        totalPages = responseData.data.last_page || 1;
      } else if (Array.isArray(responseData.data)) {
        newInvoices = responseData.data;
      } else if (Array.isArray(responseData)) {
        newInvoices = responseData;
      }

      setLastPage(totalPages);

      if (pageNum === 1) {
        setInvoices(newInvoices);
      } else {
        setInvoices(prev => [...prev, ...newInvoices]);
      }
      
      setPage(pageNum);
    } catch (error) {
      console.error('Fetch invoices error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchInvoices(1, true);
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    fetchInvoices(1, true);
  }, []);

  const loadMore = () => {
    if (!loadingMore && page < lastPage) {
      fetchInvoices(page + 1);
    }
  };

  // Filter invoices based on search
  const filteredInvoices = invoices.filter(invoice => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      invoice.inv_no?.toLowerCase().includes(query) ||
      invoice.cus_name?.toLowerCase().includes(query) ||
      invoice.phone?.includes(query) ||
      invoice.cus_id?.toLowerCase().includes(query)
    );
  });

  const renderInvoice = ({item}) => (
    <InvoiceCard
      invoice={item}
      onPress={() => navigation.navigate('InvoiceDetail', {invoice: item})}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  if (loading && invoices.length === 0) {
    return <LoadingSpinner message="Loading invoices..." />;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by invoice #, name, phone..."
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

      {/* Invoice Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredInvoices.length} invoice(s) found
          {page < lastPage ? ` • Page ${page} of ${lastPage}` : ''}
        </Text>
      </View>

      {/* Invoice List */}
      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoice}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#007AFF']}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyText}>No invoices found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery 
                ? 'Try a different search term' 
                : 'Create your first invoice to get started'}
            </Text>
          </View>
        }
      />

      {/* FAB - Create Invoice */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateInvoice')}>
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
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
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

export default InvoiceScreen;
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {invoiceAPI} from '../api/apiClient';
import {useAuth} from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const HomeScreen = ({navigation}) => {
  const {user, getFullName} = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await invoiceAPI.getDashboard();
      setDashboard(response.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  const StatCard = ({title, value, color, onPress}) => (
    <TouchableOpacity
      style={[styles.statCard, {borderLeftColor: color}]}
      onPress={onPress}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={styles.header}>
        {/* 👇 UPDATED: Use first_name or getFullName() */}
        <Text style={styles.greeting}>
          Hello, {user?.first_name || 'User'}! 👋
        </Text>
        <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          title="Total Invoices"
          value={dashboard?.total_invoices || 0}
          color="#007AFF"
          onPress={() => navigation.navigate('Invoice')}
        />
        <StatCard
          title="Pending"
          value={dashboard?.pending_invoices || 0}
          color="#FF9800"
        />
        <StatCard
          title="Paid"
          value={dashboard?.paid_invoices || 0}
          color="#4CAF50"
        />
        <StatCard
          title="Total Revenue"
          value={`$${dashboard?.total_revenue?.toFixed(2) || '0.00'}`}
          color="#9C27B0"
        />
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CreateInvoice')}>
          <Text style={styles.actionIcon}>➕</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Create Invoice</Text>
            <Text style={styles.actionSubtitle}>Create a new invoice</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('BarcodeScan')}>
          <Text style={styles.actionIcon}>📷</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Scan Barcode</Text>
            <Text style={styles.actionSubtitle}>Add product by scanning</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CreateProduct')}>
          <Text style={styles.actionIcon}>🛍️</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Create Product</Text>
            <Text style={styles.actionSubtitle}>Create a new product</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 24,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  date: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    marginTop: -20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '46%',
    margin: '2%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  quickActions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default HomeScreen;
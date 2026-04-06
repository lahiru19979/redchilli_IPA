
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {revAPI} from '../api/apiClient';
import SalesChart from '../components/SalesChart';
import MonthlyRevenueChart from '../components/MonthlyRevenueChart';
import NotClosedInvoicesChart from '../components/NotClosedInvoicesChart';

const TABS = [
  {id: 'daily', label: '📊 Daily Sales'},
  {id: 'dtf', label: '🎨 DTF Revenue'},
  {id: 'monthly', label: '📈 Monthly Revenue'},
  {id: 'notclosed', label: '📋 Not Closed'},
];

const RevDashboardScreen = ({navigation}) => {
  const [activeTab, setActiveTab] = useState('daily');
  const [refreshing, setRefreshing] = useState(false);
  
  // Daily Sales Data
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // DTF Revenue Data
  const [dtfData, setDtfData] = useState(null);
  const [dtfLoading, setDtfLoading] = useState(true);
  const [dtfError, setDtfError] = useState(null);

  // Fetch Daily Sales Data
  const fetchDashboardData = async (refresh = false) => {
    try {
      if (!refresh) setLoading(true);
      setError(null);

      const response = await revAPI.getdailysales();
      console.log('📊 Dashboard Response:', response.data);

      // Handle different response structures
      if (response.data.status === 'success' && response.data.data) {
        setChartData(response.data.data);
      } else if (response.data.labels && response.data.values) {
        setChartData(response.data);
      } else if (response.data.data) {
        setChartData(response.data.data);
      } else {
        setChartData(response.data);
      }
    } catch (err) {
      console.error('❌ Fetch dashboard error:', err);
      setError('Failed to load daily sales');
    } finally {
      setLoading(false);
    }
  };

  // Fetch DTF Revenue Data
  const fetchDtfData = async () => {
    try {
      setDtfLoading(true);
      setDtfError(null);

      const response = await revAPI.getDtfRevenue();
      console.log('🎨 DTF Revenue Response:', JSON.stringify(response.data, null, 2));

      // Handle different response structures
      let data = null;

      if (response.data.status === 'success' && response.data.data) {
        data = response.data.data;
      } else if (response.data.labels && response.data.values) {
        data = response.data;
      } else if (response.data.data) {
        data = response.data.data;
      } else {
        data = response.data;
      }

      console.log('🎨 Parsed DTF Data:', data);

      if (data && data.labels && data.values) {
        setDtfData(data);
      } else {
        console.error('❌ Invalid DTF data structure:', data);
        setDtfError('Invalid data format');
      }
    } catch (err) {
      console.error('❌ Fetch DTF revenue error:', err);
      console.error('❌ Error details:', err.response?.data || err.message);
      setDtfError('Failed to load DTF revenue');
    } finally {
      setDtfLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchDtfData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboardData(true);
      fetchDtfData();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchDashboardData(true), fetchDtfData()]).finally(() => {
      setRefreshing(false);
    });
  }, []);

  // Calculate totals for daily chart
  const totalSales = chartData?.values?.reduce((sum, val) => sum + parseFloat(val || 0), 0) || 0;

  // Calculate totals for DTF chart
  const totalDtfSales = dtfData?.values?.reduce((sum, val) => sum + parseFloat(val || 0), 0) || 0;

  // Render error state
  const renderError = (message, onRetry) => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Render empty state
  const renderEmpty = (message) => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#007AFF']}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Sales Overview</Text>
      </View>

      {/* Quick Stats Cards - Only show on Daily tab */}
      {activeTab === 'daily' && (
        <View style={styles.quickStatsContainer}>
          <View style={[styles.quickStatCard, {backgroundColor: '#E3F2FD'}]}>
            <Text style={styles.quickStatIcon}>💰</Text>
            <Text style={styles.quickStatValue}>
              Rs. {totalSales.toLocaleString()}
            </Text>
            <Text style={styles.quickStatLabel}>Total Sales</Text>
          </View>

          <View style={[styles.quickStatCard, {backgroundColor: '#E8F5E9'}]}>
            <Text style={styles.quickStatIcon}>📊</Text>
            <Text style={styles.quickStatValue}>
              {chartData?.labels?.length || 0}
            </Text>
            <Text style={styles.quickStatLabel}>Days Active</Text>
          </View>

          <View style={[styles.quickStatCard, {backgroundColor: '#FFF3E0'}]}>
            <Text style={styles.quickStatIcon}>📈</Text>
            <Text style={styles.quickStatValue}>
              Rs.{' '}
              {chartData?.values
                ? Math.max(...chartData.values.map(v => parseFloat(v || 0))).toLocaleString()
                : 0}
            </Text>
            <Text style={styles.quickStatLabel}>Best Day</Text>
          </View>
        </View>
      )}

      {/* Quick Stats Cards - Only show on DTF tab */}
      {activeTab === 'dtf' && (
        <View style={styles.quickStatsContainer}>
          <View style={[styles.quickStatCard, {backgroundColor: '#FCE4EC'}]}>
            <Text style={styles.quickStatIcon}>🎨</Text>
            <Text style={styles.quickStatValue}>
              Rs. {totalDtfSales.toLocaleString()}
            </Text>
            <Text style={styles.quickStatLabel}>Total DTF</Text>
          </View>

          <View style={[styles.quickStatCard, {backgroundColor: '#F3E5F5'}]}>
            <Text style={styles.quickStatIcon}>📊</Text>
            <Text style={styles.quickStatValue}>
              {dtfData?.labels?.length || 0}
            </Text>
            <Text style={styles.quickStatLabel}>Days Active</Text>
          </View>

          <View style={[styles.quickStatCard, {backgroundColor: '#E8EAF6'}]}>
            <Text style={styles.quickStatIcon}>📈</Text>
            <Text style={styles.quickStatValue}>
              Rs.{' '}
              {dtfData?.values
                ? Math.max(...dtfData.values.map(v => parseFloat(v || 0))).toLocaleString()
                : 0}
            </Text>
            <Text style={styles.quickStatLabel}>Best Day</Text>
          </View>
        </View>
      )}

      {/* Tab Switcher */}
      <View style={[
        styles.tabContainer,
        (activeTab === 'monthly' || activeTab === 'notclosed') && styles.tabContainerMonthly
      ]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ===================== DAILY TAB ===================== */}
      {activeTab === 'daily' && (
        <>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading chart...</Text>
            </View>
          ) : error ? (
            renderError(error, fetchDashboardData)
          ) : !chartData || !chartData.labels || chartData.labels.length === 0 ? (
            renderEmpty('No daily sales data available')
          ) : (
            <>
              <SalesChart 
                data={chartData} 
                title="Daily Sales" 
                barColor="#007AFF"
                highColor="#28a745"
                lowColor="#dc3545"
              />
              
              {/* Recent Sales List */}
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>Recent Sales</Text>
                {chartData?.labels?.slice(-5).reverse().map((label, index) => {
                  const valueIndex = chartData.labels.length - 1 - index;
                  const value = parseFloat(chartData.values[valueIndex] || 0);
                  const isHigh = value > (totalSales / chartData.values.length);

                  return (
                    <View key={index} style={styles.recentItem}>
                      <View style={styles.recentLeft}>
                        <Text style={styles.recentDateText}>{label}</Text>
                      </View>
                      <Text
                        style={[
                          styles.recentValue,
                          {color: isHigh ? '#28a745' : '#666'},
                        ]}
                      >
                        Rs. {value.toLocaleString()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </>
      )}

      {/* ===================== DTF TAB ===================== */}
      {activeTab === 'dtf' && (
        <>
          {dtfLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#9C27B0" />
              <Text style={styles.loadingText}>Loading DTF chart...</Text>
            </View>
          ) : dtfError ? (
            renderError(dtfError, fetchDtfData)
          ) : !dtfData || !dtfData.labels || dtfData.labels.length === 0 ? (
            renderEmpty('No DTF revenue data available')
          ) : (
            <>
              <SalesChart 
                data={dtfData} 
                title="DTF Revenue" 
                barColor="#9C27B0"
                highColor="#4CAF50"
                lowColor="#FF5722"
              />
              
              {/* Recent DTF Sales List */}
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>Recent DTF Sales</Text>
                {dtfData?.labels?.slice(-5).reverse().map((label, index) => {
                  const valueIndex = dtfData.labels.length - 1 - index;
                  const value = parseFloat(dtfData.values[valueIndex] || 0);
                  const isHigh = value > (totalDtfSales / dtfData.values.length);

                  return (
                    <View key={index} style={styles.recentItem}>
                      <View style={styles.recentLeft}>
                        <Text style={styles.recentDateText}>{label}</Text>
                      </View>
                      <Text
                        style={[
                          styles.recentValue,
                          {color: isHigh ? '#9C27B0' : '#666'},
                        ]}
                      >
                        Rs. {value.toLocaleString()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </>
      )}

      {/* ===================== MONTHLY TAB ===================== */}
      {activeTab === 'monthly' && (
        <MonthlyRevenueChart title="Monthly Revenue" />
      )}

       {activeTab === 'notclosed' && (
        <NotClosedInvoicesChart title="Not Closed Invoices" />
      )}

      <View style={styles.bottomPadding} />
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
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: -20,
    marginBottom: 12,
  },
  quickStatCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickStatIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  quickStatLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // Tab Styles
  tabContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    padding: 4,
  },
  tabContainerMonthly: {
    marginTop: -10,
  },
  tabScrollContent: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 10,
    minWidth: 110,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
  },

  // Loading
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 60,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },

  // Error
  errorContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Empty
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  // Recent Section
  recentSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentDateText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  recentValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 30,
  },
});

export default RevDashboardScreen;

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { revAPI } from '../api/apiClient';
import SalesChart from '../components/SalesChart';
import MonthlyRevenueChart from '../components/MonthlyRevenueChart';
import NotClosedInvoicesChart from '../components/NotClosedInvoicesChart';
import HeatpressRevenueChart from '../components/HeatpressRevenueChart';
import RevenuePeriodFilter, { filterValue } from '../components/RevenuePeriodFilter';
import { C } from '../utils/theme';

const TABS = [
  { id: 'daily', label: '📊 Total Revenue' },
  { id: 'dtf', label: '🎨 DTF Revenue' },
  { id: 'monthly', label: '📈 RC Revenue' },
  { id: 'notclosed', label: '⏳ Not Closed Invoices' },
  { id: 'degsign', label: '📋 Degsign Revenue' },
 { id: 'heatpress', label: '🔥 Heatpress Revenue' },
];

const RevDashboardScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('daily');

  // Period selection per tab. Kept separate so switching tabs does not silently
  // change the range you were looking at on the other one.
  const [dailyFilter, setDailyFilter] = useState('30d');
  const [dtfFilter, setDtfFilter] = useState('30d');
  const [degsignFilter, setDegsignFilter] = useState('30d');

  // Series reported upward by the three self-contained chart components, so the
  // Sales Overview at the foot of the page can total whichever tab is open.
  const [monthlyData, setMonthlyData] = useState(null);
  const [notClosedData, setNotClosedData] = useState(null);
  const [heatpressData, setHeatpressData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Daily Sales Data
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // DTF Revenue Data
  const [dtfData, setDtfData] = useState(null);
  const [dtfLoading, setDtfLoading] = useState(true);
  const [dtfError, setDtfError] = useState(null);

  // degsign revanue data
  const [degsignData, setDegsignData] = useState(null);
  const [degsignLoading, setDegsignLoading] = useState(true);
  const [degsignError, setDegsignError] = useState(null);

  // Fetch Daily Sales Data
  const fetchDashboardData = async (refresh = false) => {
    try {
      if (!refresh) setLoading(true);
      setError(null);

      const response = await revAPI.getdailysales(filterValue(dailyFilter));
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

      const response = await revAPI.getDtfRevenue(filterValue(dtfFilter));
      console.log(
        '🎨 DTF Revenue Response:',
        JSON.stringify(response.data, null, 2),
      );

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

  const fetchDegsignData = async () => {
    try {
      setDegsignLoading(true);
      setDegsignError(null);
      const response = await revAPI.getDegsignRevenue(filterValue(degsignFilter));
      console.log(
        '🎨 Degsign Revenue Response:',
        JSON.stringify(response.data, null, 2),
      );

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

      console.log('🎨 Parsed Degsign Data:', data);

      if (data && data.labels && data.values) {
        setDegsignData(data);
      } else {
        console.error('❌ Invalid Degsign data structure:', data);
        setDegsignError('Invalid data format');
      }
    } catch (err) {
      console.error('❌ Fetch Degsign revenue error:', err);
      console.error('❌ Error details:', err.response?.data || err.message);
      setDegsignError('Failed to load Degsign revenue');
    } finally {
      setDegsignLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyFilter]);

  useEffect(() => {
    fetchDtfData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dtfFilter]);

  useEffect(() => {
    fetchDegsignData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [degsignFilter]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboardData(true);
      fetchDtfData();
      fetchDegsignData();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, dailyFilter, dtfFilter, degsignFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchDashboardData(true),
      fetchDtfData(),
      fetchDegsignData(),
    ]).finally(() => {
      setRefreshing(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyFilter, dtfFilter, degsignFilter]);

  // Which series the Sales Overview should summarise, and how to label it.
  // 'Not Closed Invoices' is a count of invoices, not money, so it skips the
  // Rs. prefix the revenue tabs use.
  const OVERVIEW = {
    daily: {data: chartData, label: 'Total Sales', icon: '💰', money: true, recent: 'Recent Sales'},
    dtf: {data: dtfData, label: 'Total DTF', icon: '🎨', money: true, recent: 'Recent DTF Sales'},
    degsign: {data: degsignData, label: 'Total Degsign', icon: '📋', money: true, recent: 'Recent Degsign Sales'},
    monthly: {data: monthlyData, label: 'Total RC Revenue', icon: '📈', money: true, recent: 'Recent RC Revenue'},
    notclosed: {data: notClosedData, label: 'Not Closed', icon: '⏳', money: false, recent: 'Recent Not Closed'},
    heatpress: {data: heatpressData, label: 'Total Heatpress', icon: '🔥', money: true, recent: 'Recent Heatpress'},
  };

  const overview = (() => {
    const config = OVERVIEW[activeTab] || OVERVIEW.daily;
    const {data, label, icon, money} = config;

    const labels = data?.labels || [];
    const values = (data?.values || []).map(v => parseFloat(v || 0));
    const total = values.reduce((sum, v) => sum + v, 0);
    const average = values.length ? total / values.length : 0;

    // The five most recent points, newest first, each flagged against the
    // period's own average — which is what colours the figure green.
    const recent = labels
      .slice(-5)
      .reverse()
      .map((rowLabel, index) => {
        const value = values[labels.length - 1 - index] || 0;
        return {label: rowLabel, value: Math.round(value), isHigh: value > average};
      });

    return {
      label,
      icon,
      money,
      recentTitle: config.recent,
      recent,
      total: Math.round(total),
      periods: labels.length,
      // Math.max() of nothing is -Infinity, which would print on an empty tab.
      best: values.length ? Math.round(Math.max(...values)) : 0,
    };
  })();

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
  const renderEmpty = message => (
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
          colors={[C.accent]}
        />
      }
    >
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
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
          <RevenuePeriodFilter active={dailyFilter} onChange={setDailyFilter} />

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={C.accent} />
              <Text style={styles.loadingText}>Loading chart...</Text>
            </View>
          ) : error ? (
            renderError(error, fetchDashboardData)
          ) : !chartData ||
            !chartData.labels ||
            chartData.labels.length === 0 ? (
            renderEmpty('No daily sales data available')
          ) : (
            <>
              <SalesChart
                data={chartData}
                title="Daily Sales"
                barColor="#C4212D"
                highColor="#28a745"
                lowColor="#dc3545"
              />
            </>
          )}
        </>
      )}

      {/* ===================== DTF TAB ===================== */}
      {activeTab === 'dtf' && (
        <>
          <RevenuePeriodFilter active={dtfFilter} onChange={setDtfFilter} />

          {dtfLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={C.accent} />
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
            </>
          )}
        </>
      )}

      {activeTab === 'degsign' && (
        <>
          <RevenuePeriodFilter active={degsignFilter} onChange={setDegsignFilter} />

          {degsignLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={C.accent} />
              <Text style={styles.loadingText}>Loading Degsign chart...</Text>
            </View>
          ) : degsignError ? (
            renderError(degsignError, fetchDtfData)
          ) : !degsignData ||
            !degsignData.labels ||
            degsignData.labels.length === 0 ? (
            renderEmpty('No Degsign revenue data available')
          ) : (
            <>
              <SalesChart
                data={degsignData}
                title="Degsign Revenue"
                barColor="#9C27B0"
                highColor="#4CAF50"
                lowColor="#FF5722"
              />
            </>
          )}
        </>
      )}

      {/* ===================== MONTHLY TAB ===================== */}
      {activeTab === 'monthly' && (
        <MonthlyRevenueChart title="Monthly Revenue" onData={setMonthlyData} />
      )}

      {activeTab === 'notclosed' && (
        <NotClosedInvoicesChart
          title="Not Closed Invoices"
          onData={setNotClosedData}
        />
      )}
      {activeTab === 'heatpress' && ( 
        <HeatpressRevenueChart
          title="Heatpress Revenue"
          onData={setHeatpressData}
        />
      )}

      {/* ===================== RECENT ===================== */}
      {/* Was three copies, one per inline tab, and absent from the other three.
          Driven by the same series the Sales Overview totals, so every tab now
          reads the same way. */}
      {overview.periods > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>{overview.recentTitle}</Text>

          {overview.recent.map((row, index) => (
            <View key={index} style={styles.recentItem}>
              <View style={styles.recentLeft}>
                <Text style={styles.recentDateText}>{row.label}</Text>
              </View>

              <Text
                style={[
                  styles.recentValue,
                  // eslint-disable-next-line react-native/no-inline-styles
                  { color: row.isHigh ? '#28a745' : '#666' },
                ]}
              >
                {overview.money
                  ? `Rs. ${row.value.toLocaleString()}`
                  : row.value.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ===================== SALES OVERVIEW ===================== */}
      {/* One block for every tab, fed by whichever series is on screen. */}
      <Text style={styles.dashboardIntro}>Sales Overview</Text>

      <View style={styles.quickStatsContainer}>
        <View style={[styles.quickStatCard, { backgroundColor: C.accentLight }]}>
          <Text style={styles.quickStatIcon}>{overview.icon}</Text>
          <Text style={styles.quickStatValue}>
            {overview.money ? `Rs. ${overview.total.toLocaleString()}` : overview.total.toLocaleString()}
          </Text>
          <Text style={styles.quickStatLabel}>{overview.label}</Text>
        </View>

        <View style={[styles.quickStatCard, { backgroundColor: C.successLight }]}>
          <Text style={styles.quickStatIcon}>📊</Text>
          <Text style={styles.quickStatValue}>{overview.periods}</Text>
          <Text style={styles.quickStatLabel}>Periods</Text>
        </View>

        <View style={[styles.quickStatCard, { backgroundColor: C.warningLight }]}>
          <Text style={styles.quickStatIcon}>📈</Text>
          <Text style={styles.quickStatValue}>
            {overview.money ? `Rs. ${overview.best.toLocaleString()}` : overview.best.toLocaleString()}
          </Text>
          <Text style={styles.quickStatLabel}>Best Period</Text>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  dashboardIntro: {
    fontSize: 13,
    color: C.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  quickStatCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
    color: C.textPrimary,
  },
  quickStatLabel: {
    fontSize: 10,
    color: C.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // Tab Styles
  tabContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: C.divider,
    borderRadius: 12,
    padding: 4,
  },
  tabScrollContent: {
    flexDirection: 'row',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 10,
    minWidth: 110,
  },
  tabActive: {
    backgroundColor: C.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
  },
  tabTextActive: {
    color: C.accent,
  },

  // Loading
  loadingContainer: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 60,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: C.textSecondary,
  },

  // Error
  errorContainer: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 40,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
    color: C.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: C.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: C.surface,
    fontWeight: '600',
    fontSize: 14,
  },

  // Empty
  emptyContainer: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 40,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
    color: C.textSecondary,
    textAlign: 'center',
  },

  // Recent Section
  recentSection: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: C.textPrimary,
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentDateText: {
    fontSize: 14,
    color: C.textPrimary,
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

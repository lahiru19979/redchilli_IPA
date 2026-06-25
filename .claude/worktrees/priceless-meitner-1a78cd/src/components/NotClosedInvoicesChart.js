// components/NotClosedInvoicesChart.js
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {revAPI} from '../api/apiClient';

const FILTERS = [
  {id: '30d', label: '30 Days', value: '30d'},
  {id: '3m', label: '3 Months', value: '3m'},
  {id: '6m', label: '6 Months', value: '6m'},
  {id: '1y', label: '1 Year', value: new Date().getFullYear().toString()},
  {id: '5y', label: '5 Years', value: '5y'},
];

const NotClosedInvoicesChart = ({title = 'Not Closed Invoices'}) => {
  const [activeFilter, setActiveFilter] = useState('1y');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChartData();
  }, [activeFilter]);

  const fetchChartData = async () => {
    setLoading(true);
    setError(null);

    try {
      const filter = FILTERS.find(f => f.id === activeFilter);
      const response = await revAPI.getNotClosedInvoices(filter.value);

      console.log('📋 Not Closed Invoices Response:', response.data);

      if (response.data.status === 'success' && response.data.data) {
        setChartData(response.data.data);
      } else if (response.data.labels && response.data.values) {
        setChartData(response.data);
      } else {
        setError('Invalid data format');
      }
    } catch (err) {
      console.error('❌ Not Closed Invoices fetch error:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Format number with commas
  const formatNumber = (value) => {
    return Math.round(value).toLocaleString();
  };

  // Render filter tabs
  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterTab,
              activeFilter === filter.id && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter(filter.id)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter.id && styles.filterTabTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {renderFilterTabs()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || !chartData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {renderFilterTabs()}
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || 'No data available'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchChartData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate statistics
  const values = chartData.values || [];
  const totalInvoices = values.reduce((sum, val) => sum + parseFloat(val || 0), 0);
  const nonZeroValues = values.filter(v => parseFloat(v) > 0);
  const avgInvoices = nonZeroValues.length > 0 ? totalInvoices / nonZeroValues.length : 0;
  const maxInvoices = Math.max(...values.map(v => parseFloat(v || 0)));
  const minInvoices = nonZeroValues.length > 0 ? Math.min(...nonZeroValues.map(v => parseFloat(v))) : 0;

  // Chart dimensions based on filter
  const getBarWidth = () => {
    switch (activeFilter) {
      case '30d': return 35;
      case '3m': return 45;
      case '6m': return 55;
      case '1y': return 50;
      case '5y': return 65;
      default: return 50;
    }
  };

  const BAR_WIDTH = getBarWidth();
  const BAR_GAP = 8;
  const CHART_HEIGHT = 180;
  const maxValue = maxInvoices > 0 ? maxInvoices * 1.15 : 10;

  // Get period label
  const getPeriodLabel = () => {
    const filter = FILTERS.find(f => f.id === activeFilter);
    return filter?.label || '';
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatNumber(totalInvoices)}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatNumber(avgInvoices)}</Text>
          <Text style={styles.statLabel}>Average</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, {color: '#FF6B6B'}]}>
            {formatNumber(maxInvoices)}
          </Text>
          <Text style={styles.statLabel}>Highest</Text>
        </View>
      </View>

      {/* Chart */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.chartArea}>
          {values.map((value, index) => {
            const numValue = parseFloat(value || 0);
            const barHeight = maxValue > 0 
              ? Math.max((numValue / maxValue) * CHART_HEIGHT, 8) 
              : 8;
            const isHighest = numValue === maxInvoices && numValue > 0;
            const isLowest = numValue === minInvoices && numValue > 0;
            const isZero = numValue === 0;

            // Get label based on filter type
            const label = chartData.labels[index] || '';
            let displayLabel = label;
            
            // Shorten label for 30 days (show only day number)
            if (activeFilter === '30d') {
              displayLabel = label.split(' ')[1] || label;
            }
            // For 3 months show week start date
            else if (activeFilter === '3m') {
              displayLabel = label.split(' ')[1] || label;
            }
            // For 6 months show short month
            else if (activeFilter === '6m') {
              displayLabel = label.split(' ')[0] || label;
            }
            // For 1 year show month abbreviation
            else if (activeFilter === '1y') {
              displayLabel = label.substring(0, 3);
            }
            // For 5 years show full year
            else if (activeFilter === '5y') {
              displayLabel = label;
            }

            return (
              <View
                key={index}
                style={[
                  styles.barColumn,
                  {width: BAR_WIDTH, marginHorizontal: BAR_GAP / 2},
                ]}
              >
                {/* Value on top */}
                <View style={styles.valueLabelContainer}>
                  <Text
                    style={[
                      styles.valueLabel,
                      isHighest && styles.valueLabelHighest,
                      isLowest && styles.valueLabelLowest,
                      isZero && styles.valueLabelZero,
                    ]}
                    numberOfLines={1}
                  >
                    {isZero ? '0' : formatNumber(numValue)}
                  </Text>
                </View>

                {/* Bar */}
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: isZero
                          ? '#e0e0e0'
                          : isHighest
                          ? '#FF6B6B'
                          : isLowest
                          ? '#4CAF50'
                          : '#FFA726',
                      },
                    ]}
                  />
                </View>

                {/* Label */}
                <View style={styles.dateLabelContainer}>
                  <Text style={styles.dateLabel} numberOfLines={1}>
                    {displayLabel}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Period Info */}
      <View style={styles.periodContainer}>
        <Text style={styles.periodLabel}>
          📅 {getPeriodLabel()}
        </Text>
        <Text style={styles.periodCount}>
          {chartData.labels?.length || 0} periods
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterScrollContent: {
    paddingVertical: 4,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#FF6B6B',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#FFE0E0',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  barColumn: {
    alignItems: 'center',
  },
  valueLabelContainer: {
    minHeight: 30,
    justifyContent: 'flex-end',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  valueLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  valueLabelHighest: {
    color: '#FF6B6B',
    fontSize: 12,
  },
  valueLabelLowest: {
    color: '#4CAF50',
  },
  valueLabelZero: {
    color: '#999',
  },
  barContainer: {
    height: 180,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 30,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 8,
  },
  dateLabelContainer: {
    marginTop: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    width: '100%',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  periodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  periodLabel: {
    fontSize: 12,
    color: '#666',
  },
  periodCount: {
    fontSize: 12,
    color: '#888',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  loadingContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default NotClosedInvoicesChart;
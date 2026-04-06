// components/DtfRevenueChart.js
import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';

const DtfRevenueChart = ({data, title = 'last 30 days Dtf Revenue'}) => {
  if (!data || !data.labels || !data.values) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No chart data available</Text>
      </View>
    );
  }

  // Format number with commas (e.g., 17815 -> 17,815)
  const formatNumber = (value) => {
    return Math.round(value).toLocaleString();
  };

 // Format for stats (shortened - K format)
  const formatShort = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return Math.round(value).toString();
  };

  // Calculate statistics
  const totalSales = data.values.reduce((sum, val) => sum + val, 0);
  const avgSales = totalSales / data.values.length;
  const maxSales = Math.max(...data.values);

  // Chart dimensions
  const BAR_WIDTH = 50;
  const BAR_GAP = 10;
  const CHART_HEIGHT = 180;
  const maxValue = maxSales * 1.15;

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>Rs. {formatShort(totalSales)}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>Rs. {formatShort(avgSales)}</Text>
          <Text style={styles.statLabel}>Average</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, {color: '#28a745'}]}>
            Rs. {formatShort(maxSales)}
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
          {/* Bars with Labels */}
          {data.values.map((value, index) => {
            const barHeight = Math.max((value / maxValue) * CHART_HEIGHT, 8);
            const isHighest = value === maxSales;
            const isLowest = value === Math.min(...data.values);

            // Extract day from label (e.g., "Mar 09" -> "09")
            const dayLabel = data.labels[index].split(' ')[1] || data.labels[index];
            // Extract month (e.g., "Mar 09" -> "Mar")
            const monthLabel = data.labels[index].split(' ')[0] || '';

            return (
              <View
                key={index}
                style={[
                  styles.barColumn,
                  {width: BAR_WIDTH, marginHorizontal: BAR_GAP / 2},
                ]}
              >
                {/* Actual Value on top - Full number with commas */}
                <View style={styles.valueLabelContainer}>
                  <Text
                    style={[
                      styles.valueLabel,
                      isHighest && styles.valueLabelHighest,
                      isLowest && styles.valueLabelLowest,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {formatNumber(value)}
                  </Text>
                </View>

                {/* Bar */}
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: isHighest
                          ? '#28a745'
                          : isLowest
                          ? '#dc3545'
                          : '#007AFF',
                      },
                    ]}
                  />
                </View>

                {/* Date label */}
                <View style={styles.dateLabelContainer}>
                  <Text style={styles.dayLabel}>{dayLabel}</Text>
                  <Text style={styles.monthLabel}>{monthLabel}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Period */}
      <View style={styles.periodContainer}>
        <Text style={styles.periodLabel}>
          📅 {data.labels[0]} → {data.labels[data.labels.length - 1]}
        </Text>
        <Text style={styles.periodCount}>{data.labels.length} days</Text>
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
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#e0e0e0',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
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
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  valueLabelHighest: {
    color: '#28a745',
    fontSize: 10,
  },
  valueLabelLowest: {
    color: '#dc3545',
  },
  barContainer: {
    height: 180,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 35,
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
  dayLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  monthLabel: {
    fontSize: 9,
    color: '#888',
    marginTop: 2,
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
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
});

export default DtfRevenueChart;
// components/RevenuePeriodFilter.js
//
// The 30 Days / 3 Months / 6 Months / 1 Year / 5 Years selector shared by every
// revenue tab. The list lived inside MonthlyRevenueChart, NotClosedInvoicesChart
// and HeatpressRevenueChart as three identical copies; anything that needs it now
// imports it from here instead of growing a fourth.

import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';

// `value` is what the API's searchKey expects. "1 Year" sends the current year
// because that branch of the endpoint reads a plain year number.
export const REV_FILTERS = [
  {id: '30d', label: '30 Days', value: '30d'},
  {id: '3m', label: '3 Months', value: '3m'},
  {id: '6m', label: '6 Months', value: '6m'},
  {id: '1y', label: '1 Year', value: new Date().getFullYear().toString()},
  {id: '5y', label: '5 Years', value: '5y'},
];

export const filterValue = id =>
  (REV_FILTERS.find(f => f.id === id) || REV_FILTERS[0]).value;

export const filterLabel = id =>
  (REV_FILTERS.find(f => f.id === id) || REV_FILTERS[0]).label;

const RevenuePeriodFilter = ({active, onChange}) => (
  <View style={styles.container}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {REV_FILTERS.map(filter => (
        <TouchableOpacity
          key={filter.id}
          style={[styles.tab, active === filter.id && styles.tabActive]}
          onPress={() => onChange(filter.id)}
        >
          <Text
            style={[
              styles.tabText,
              active === filter.id && styles.tabTextActive,
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  // Matches the 16pt gutter the dashboard's cards use. Without it the pills sit
  // flush against the screen edge while everything below them is inset.
  container: {marginHorizontal: 16, marginBottom: 12},
  scrollContent: {paddingVertical: 4, paddingRight: 16},
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
  },
  tabActive: {backgroundColor: '#C4212D'},
  tabText: {fontSize: 13, fontWeight: '600', color: '#666'},
  tabTextActive: {color: '#fff'},
});

export default RevenuePeriodFilter;

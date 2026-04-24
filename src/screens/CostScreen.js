

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { invoiceAPI } from '../api/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';

const ACTION_CARDS = [
  {
    id: 'all_costtypes',
    icon: '💵',
    title: 'Cost Types',
    subtitle: 'View & create cost types',
    color: '#007AFF',
    screen: 'AllCostTypes_screen',
    // permission: 'Invoice module',
  },
  {
    id: 'all_costgroups',
    icon: '💵',
    title: 'Cost Groups',
    subtitle: 'View & create cost groups',
    color: '#4CAF50',
    screen: 'AllCostGroups_screen',
    // permission: 'Products Section',
  },
  {
    id: 'all_costdescriptions',
    icon: '💵',
    title: 'Cost Descriptions',
    subtitle: 'View & create cost descriptions',
    color: '#FF9800',
    screen: 'AllCostDescriptions_screen',
    // permission: 'Inventory module',
  },
];

const STAT_CARDS = [
  {
    id: 'total_invoices',
    title: 'Total Invoices',
    key: 'total_invoices',
    color: '#007AFF',
    prefix: '',
  },
  {
    id: 'total_products',
    title: 'Total Products',
    key: 'total_products',
    color: '#4CAF50',
    prefix: '',
  },
  {
    id: 'total_stock',
    title: 'Total Stock',
    key: 'total_stock',
    color: '#FF9800',
    prefix: '',
  },
  {
    id: 'total_revenue',
    title: 'Total Revenue',
    key: 'total_revenue',
    color: '#9C27B0',
    prefix: '$',
  },
];

const CostScreen = ({ navigation }) => {
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
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  const StatCard = ({ title, value, color, prefix = '' }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>
        {prefix}{value || 0}
      </Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const ActionCard = ({ icon, title, subtitle, color, onPress }) => (
    <TouchableOpacity
      style={[styles.actionCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Stats Section */}
      {dashboard && (
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            {STAT_CARDS.map(card => (
              <StatCard
                key={card.id}
                title={card.title}
                value={dashboard[card.key]}
                color={card.color}
                prefix={card.prefix}
              />
            ))}
          </View>
        </View>
      )}

      {/* Quick Actions Section */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        {ACTION_CARDS.length > 0 ? (
          <View style={styles.actionCardsGrid}>
            {ACTION_CARDS.map(card => (
              <ActionCard
                key={card.id}
                icon={card.icon}
                title={card.title}
                subtitle={card.subtitle}
                color={card.color}
                onPress={() => navigation.navigate(card.screen)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.noPermissionsContainer}>
            <Text style={styles.noPermissionsIcon}>🔒</Text>
            <Text style={styles.noPermissionsText}>
              No actions available. Please contact your administrator.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statsContainer: {
    padding: 16,
    marginTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  actionsContainer: {
    padding: 16,
  },
  actionCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  noPermissionsContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noPermissionsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noPermissionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSpacing: {
    height: 30,
  },
});

export default CostScreen;
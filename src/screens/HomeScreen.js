// screens/HomeScreen.js

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
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

// Define action cards with required permissions
// Use the EXACT permission names from your database
const ACTION_CARDS = [
  {
    id: 'all_invoices',
    icon: '🧾',
    title: 'Invoices',
    subtitle: 'View & create invoices',
    color: '#007AFF',
    screen: 'Invoice',
    permission: 'Invoice module',
  },
 
  {
    id: 'create_product',
    icon: '📦',
    title: 'Products',
    subtitle: 'Add a new product',
    color: '#4CAF50',
    screen: 'AllProducts_screen',
    permission: 'Products Section',
  },
  {
    id: 'all_inventory',
    icon: '🗃️',
    title: 'Inventories',
    subtitle: 'View & manage stock',
    color: '#FF9800',
    screen: 'AllStocks',
    permission: 'Inventory module',
  },
  {
    id: 'revenue_reports',
    icon: '📊',
    title: 'Revenue Reports',
    subtitle: 'View detailed reports',
    color: '#9C27B0',
    screen: 'reports',
    permission: 'Revanue module',
  },
];

// Stat cards configuration
const STAT_CARDS = [
  {
    id: 'today_sales',
    title: "Today's Sales",
    key: 'today_sales',
    prefix: 'Rs ',
    color: '#4CAF50',
    permission: 'view_reports',
  },
  {
    id: 'total_products',
    title: 'Total Products',
    key: 'total_products',
    prefix: '',
    color: '#2196F3',
    permission: 'view_products',
  },
  {
    id: 'pending_orders',
    title: 'Pending Orders',
    key: 'pending_orders',
    prefix: '',
    color: '#FF9800',
    permission: 'view_invoices',
  },
  {
    id: 'total_customers',
    title: 'Total Customers',
    key: 'total_customers',
    prefix: '',
    color: '#9C27B0',
    permission: 'view_customers',
  },
];

const HomeScreen = ({ navigation }) => {
  const { user, hasPermission, refreshPermissions, isAdmin } = useAuth();
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

  useEffect(() => {
  console.table({
    'User ID': user?.id,
    'Name': `${user?.first_name} ${user?.last_name}`,
    'Email': user?.email,
    'role': user?.role_id,
    'Is Admin': isAdmin(),
    
  });
},);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboard(),
      refreshPermissions(),
    ]);
    setRefreshing(false);
  }, []);

  // Filter action cards based on permissions
  const visibleActionCards = ACTION_CARDS.filter(card => {
    if (!card.permission) return true;
    return hasPermission(card.permission);
  });

  // Filter stat cards based on permissions
  const visibleStatCards = STAT_CARDS.filter(card => {
    if (!card.permission) return true;
    return hasPermission(card.permission);
  });

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  // Stat Card Component
  const StatCard = ({ title, value, color, prefix = '' }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>
        {prefix}{value || 0}
      </Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  // Action Card Component
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>
            Hello, {user?.first_name || 'User'}! 👋
          </Text>
          <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>
          {isAdmin() && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats Section */}
      {dashboard && visibleStatCards.length > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            {visibleStatCards.map(card => (
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

        {visibleActionCards.length > 0 ? (
          <View style={styles.actionCardsGrid}>
            {visibleActionCards.map(card => (
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
              No actions available.{'\n'}Please contact your administrator.
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Header Styles
  header: {
    backgroundColor: '#007AFF',
    padding: 24,
    paddingTop: 50,
    paddingBottom: 30,
  },
  headerContent: {
    position: 'relative',
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
  adminBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadgeText: {
    color: '#333',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },

  // Stats Styles
  statsContainer: {
    padding: 16,
    marginTop: -20,
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

  // Action Cards Styles
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

  // No Permissions Styles
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

  // Bottom Spacing
  bottomSpacing: {
    height: 30,
  },
});

export default HomeScreen;
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { invoiceAPI, whatsappAPI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { C } from '../utils/theme';

// Define action cards with required permissions
// Use the EXACT permission names from your database
const ACTION_CARDS = [
  {
    id: 'all_invoices',
    icon: '🧾',
    title: 'Invoices',
    subtitle: 'View & create invoices',
    color: C.accent,
    screen: 'Invoice',
    permission: 'view_CRM_management',
  },

  {
    id: 'create_product',
    icon: '📦',
    title: 'Products',
    subtitle: 'Add a new product',
    color: C.success,
    screen: 'AllProducts_screen',
    permission: 'add_products',
  },
  {
    id: 'all_inventory',
    icon: '🗃️',
    title: 'Inventories',
    subtitle: 'View & manage stock',
    color: C.warning,
    screen: 'AllStocks',
    permission: 'view_inventory',
  },
  {
    id: 'revenue_reports',
    icon: '📊',
    title: 'Revenue Reports',
    subtitle: 'View detailed reports',
    color: C.accent,
    screen: 'reports',
    permission: 'View revenue dashboard',
  },
  {
    id: 'cost_module',
    icon: '💰',
    title: 'Cost Module',
    subtitle: 'View detailed cost Module',
    color: C.success,
    screen: 'Cost',
    permission: 'view_finance_master',
  },
  {
    id: 'task_manager',
    icon: '🗂️',
    title: 'Task Manager',
    subtitle: 'Job cards & my tasks',
    color: C.warning,
    screen: 'TaskManager',
    permission: 'view_my_tasks',
  },
  {
    id: 'whatsapp',
    icon: '💬',
    title: 'WhatsApp',
    subtitle: 'Customer chats',
    color: '#25D366',
    screen: 'WhatsAppChats',
    // Reading the inbox needs no extra permission, matching the web CRM.
    permission: null,
  },
];

// Stat cards configuration
const STAT_CARDS = [
  {
    id: 'today_sales',
    title: "Today's Sales",
    key: 'today_sales',
    prefix: 'Rs ',
    color: C.success,
    permission: 'View revenue dashboard',
  },
  {
    id: 'total_products',
    title: 'Total Products',
    key: 'total_products',
    prefix: '',
    color: C.accent,
    permission: 'view_products',
  },
  {
    id: 'pending_orders',
    title: 'Pending Orders',
    key: 'pending_orders',
    prefix: '',
    color: C.warning,
    permission: 'View CK invoices',
  },
  {
    id: 'total_customers',
    title: 'Total Customers',
    key: 'total_customers',
    prefix: '',
    color: C.accent,
    permission: 'view_customers',
  },
];

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, hasPermission, refreshPermissions, isAdmin, permissions } = useAuth();
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
console.log('Permissions:', permissions);
console.log('Can access Invoice module:', hasPermission('Invoice module'));
  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
  console.table({
    'User ID': user?.id,
    'Name': `${user?.first_name} ${user?.last_name}`,
    'Email': user?.email,
    'role': user?.role_id,
    'Permissions': hasPermission,

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

  // Unread WhatsApp messages, shown as a badge on that tile.
  const [waUnread, setWaUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      const poll = () => {
        whatsappAPI
          .getUnread()
          .then(res => {
            // The screen can be left mid-request; setting state afterwards
            // warns and, worse, shows a count for a screen nobody is on.
            if (alive) setWaUnread(Number(res.data?.total) || 0);
          })
          .catch(() => {});
      };

      poll();
      const timer = setInterval(poll, 15000);

      return () => {
        alive = false;
        clearInterval(timer);
      };
    }, []),
  );

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
  const ActionCard = ({ icon, title, subtitle, color, badge, onPress }) => (
    <TouchableOpacity
      style={[styles.actionCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.actionIconWrap}>
        <Text style={styles.actionIcon}>{icon}</Text>

        {badge > 0 && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </View>

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
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
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
                badge={card.id === 'whatsapp' ? waUnread : 0}
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
    backgroundColor: C.bg,
  },

  actionBadge: {
    position: 'absolute',
    // Anchored to the glyph itself, overlapping its top-right corner the way a
    // phone's app badge does. These cards are only 48% wide, so a badge that
    // sits any further out runs into the title beside it.
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#E53E3E',
    alignItems: 'center',
    justifyContent: 'center',
    // A ring in the card's colour, so the badge reads as sitting on top of it.
    borderWidth: 2,
    borderColor: C.surface,
  },
  actionBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    textAlign: 'center',
  },

  // Header Styles
  header: {
    backgroundColor: C.accent,
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
    color: C.surface,
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
    backgroundColor: C.warning,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadgeText: {
    color: C.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.textPrimary,
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
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: C.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: C.textPrimary,
  },
  statTitle: {
    fontSize: 13,
    color: C.textSecondary,
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
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 14,
    borderLeftWidth: 4,
    shadowColor: C.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconWrap: {
    marginRight: 10,
  },
  actionIcon: {
    fontSize: 26,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textPrimary,
  },
  actionSubtitle: {
    fontSize: 11,
    color: C.textSecondary,
    marginTop: 2,
  },

  // No Permissions Styles
  noPermissionsContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    shadowColor: C.textPrimary,
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
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 30,
  },
});

export default HomeScreen;

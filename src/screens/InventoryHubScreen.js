// screens/InventoryHubScreen.js
//
// One entry point for the four inventory modules, mirroring the web CRM's
// Inventory menu. Keeps the Home screen to a single Inventory card instead of
// four tiles competing with the rest of the modules.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {C} from '../utils/theme';

// Same four items, in the same order, as the web sidebar's Inventory menu.
const MODULES = [
  {
    id: 'available',
    icon: '📦',
    title: 'Available Inventory',
    subtitle: 'Product stock, reservations and stock-outs',
    screen: 'AvailableInventory',
    color: C.accent,
    permission: 'view_inventory',
  },
  {
    id: 'history',
    icon: '🧾',
    title: 'Inventory History',
    subtitle: 'Every movement recorded against a variant',
    screen: 'InventoryHistory',
    color: C.navy,
    // The web menu gates this one separately from view_inventory.
    permission: 'view_inventory_history',
  },
  {
    id: 'barcode',
    icon: '🏷️',
    title: 'WholeSale Barcode',
    subtitle: 'Show a scannable label for an item',
    screen: 'WholesaleBarcode',
    color: C.success,
    permission: 'view_inventory',
  },
  {
    id: 'wholesale',
    icon: '🗃️',
    title: 'WholeSale Inventory',
    subtitle: 'Stock on hand by colour and size',
    screen: 'AllStocks',
    color: C.warning,
    permission: 'view_inventory',
  },
];

const InventoryHubScreen = ({navigation}) => {
  const {hasPermission} = useAuth();

  const visible = MODULES.filter(
    module => !module.permission || hasPermission(module.permission),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {visible.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyText}>
            You don't have permission to view inventory.{'\n'}
            Please contact your administrator.
          </Text>
        </View>
      ) : (
        visible.map(module => (
          <TouchableOpacity
            key={module.id}
            style={[styles.card, {borderLeftColor: module.color}]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(module.screen)}>
            <Text style={styles.icon}>{module.icon}</Text>

            <View style={styles.meta}>
              <Text style={styles.title}>{module.title}</Text>
              <Text style={styles.subtitle}>{module.subtitle}</Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: C.bg},
  content: {padding: 16, paddingBottom: 32},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  icon: {fontSize: 28},
  meta: {flex: 1, minWidth: 0},
  title: {fontSize: 15.5, fontWeight: '700', color: C.textPrimary},
  subtitle: {fontSize: 12.5, color: C.textSecondary, marginTop: 3},
  chevron: {fontSize: 26, color: C.textPlaceholder},
  empty: {alignItems: 'center', paddingTop: 60},
  emptyIcon: {fontSize: 40, marginBottom: 12},
  emptyText: {textAlign: 'center', color: C.textSecondary, lineHeight: 20},
});

export default InventoryHubScreen;

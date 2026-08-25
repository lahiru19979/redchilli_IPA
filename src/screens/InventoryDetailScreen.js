// screens/InventoryDetailScreen.js
//
// One inventory line in full. Everything shown here comes from the row the list
// already fetched and passes through route params — there is no single-item
// endpoint on the API (only /inventories), so a request here would 404.

import React from 'react';
import {View, Text, StyleSheet, ScrollView, Image} from 'react-native';
import {C} from '../utils/theme';

// Same thresholds the list card uses, so a row cannot read "Low Stock" in one
// place and "In Stock" in the other.
const stockStatus = count => {
  if (count <= 0) {
    return {label: 'Out of Stock', color: C.danger, bg: C.dangerLight};
  }

  if (count <= 5) {
    return {label: 'Low Stock', color: C.warning, bg: C.warningLight};
  }

  return {label: 'In Stock', color: C.success, bg: C.successLight};
};

const formatDate = value => {
  if (!value) return '—';

  const date = new Date(value);

  return isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString([], {day: 'numeric', month: 'short', year: 'numeric'});
};

const Row = ({label, value}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value ?? '—'}</Text>
  </View>
);

const InventoryDetailScreen = ({route}) => {
  const inventory = route.params?.inventory ?? {};
  const status = stockStatus(inventory.count);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.code}>{inventory.itemcode_td || 'No code'}</Text>

          <View style={[styles.badge, {backgroundColor: status.bg}]}>
            <Text style={[styles.badgeText, {color: status.color}]}>
              {status.label}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>
          {inventory.desc_td || 'No description'}
        </Text>

        {!!inventory.image_se && (
          <Image source={{uri: inventory.image_se}} style={styles.image} />
        )}

        <View style={styles.quantityBox}>
          <Text style={styles.quantityLabel}>Available Quantity</Text>
          <Text style={[styles.quantityValue, {color: status.color}]}>
            {inventory.count ?? 0}
            <Text style={styles.quantityUnit}> pcs</Text>
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ATTRIBUTES</Text>
        <Row label="Colour" value={inventory.colortable} />
        <Row label="Size" value={inventory.size_se} />
        <Row label="Item Code" value={inventory.itemcode_td} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>RECORD</Text>
        <Row label="Added" value={formatDate(inventory.created_at)} />
        <Row label="Last Updated" value={formatDate(inventory.updated_at)} />
        <Row label="Reference" value={inventory.id ? `#${inventory.id}` : null} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: C.bg},
  content: {padding: 16, paddingBottom: 32},
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  code: {fontSize: 17, fontWeight: '700', color: C.accent},
  badge: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12},
  badgeText: {fontSize: 11, fontWeight: '700', textTransform: 'uppercase'},
  description: {fontSize: 15, color: C.textPrimary, lineHeight: 21},
  image: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginTop: 12,
    backgroundColor: C.bgAlt,
  },
  quantityBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    alignItems: 'center',
  },
  quantityLabel: {fontSize: 12, color: C.textSecondary, marginBottom: 4},
  quantityValue: {fontSize: 32, fontWeight: '800'},
  quantityUnit: {fontSize: 14, fontWeight: '600', color: C.textSecondary},
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: C.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  rowLabel: {fontSize: 13.5, color: C.textSecondary},
  rowValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: C.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
});

export default InventoryDetailScreen;

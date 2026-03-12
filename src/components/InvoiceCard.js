import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {getStatusInfo,formatDate} from '../utils/helpers';

const InvoiceCard = ({invoice, onPress}) => {
  const statusInfo = getStatusInfo(invoice.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.invoiceNumber}>{invoice.inv_no}</Text>
        <View style={[styles.statusBadge, {backgroundColor: statusInfo.color}]}>
          <Text style={styles.statusText}>{statusInfo.label}</Text>
        </View>
      </View>
      
      {/* Customer Info */}
      <View style={styles.body}>
        <Text style={styles.customerName}>{invoice.cus_name}</Text>
        <Text style={styles.phone}>📞 {invoice.phone}</Text>
        <Text style={styles.date}>📅 {formatDate(invoice.inv_date)}</Text>
        {invoice.address && (
          <Text style={styles.address} numberOfLines={1}>
            📍 {invoice.address}
          </Text>
        )}
      </View>
      
      {/* Footer - Amount */}
      <View style={styles.footer}>
        <Text style={styles.typeLabel}>{invoice.type?.replace('_', ' ')}</Text>
        <Text style={styles.amount}>Rs. {invoice.grand_total}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  body: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  phone: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  date: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  address: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  typeLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'capitalize',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
});

export default InvoiceCard;
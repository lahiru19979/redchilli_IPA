import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {getStatusInfo, formatDate} from '../utils/helpers';
import {downloadInvoicePdf, sendInvoiceViaCrm} from '../utils/whatsapp';
import {useAuth} from '../context/AuthContext';

const InvoiceCard = ({invoice, onPress}) => {
  const {hasPermission} = useAuth();
  // The send goes through the WhatsApp CRM and the server checks this same
  // permission, so showing the button without it only produces a 403.
  const canSendWhatsapp = hasPermission('send_whatsapp_message');

  const statusInfo = getStatusInfo(invoice.status_label);

  // Rendering the PDF takes a moment on the server, so each action shows its
  // own spinner rather than freezing the whole list.
  const [busy, setBusy] = useState(null); // 'download' | 'share' | null

  const run = async (kind, task) => {
    if (busy) return;

    setBusy(kind);

    try {
      await task();
    } finally {
      setBusy(null);
    }
  };

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

      {/* Same two actions the web invoice list offers on each row. */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.downloadBtn]}
          onPress={() => run('download', () => downloadInvoicePdf({id: invoice.id}))}
          disabled={!!busy}>
          {busy === 'download' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionText}>⤓  Download</Text>
          )}
        </TouchableOpacity>

        {canSendWhatsapp && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.shareBtn]}
            onPress={() =>
              run('share', () =>
                sendInvoiceViaCrm({
                  id: invoice.id,
                  invNo: invoice.inv_no,
                  phone: invoice.phone,
                }),
              )
            }
            disabled={!!busy}>
            {busy === 'share' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionText}>Send WhatsApp</Text>
            )}
          </TouchableOpacity>
        )}
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
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtn: {backgroundColor: '#E53E3E'},
  shareBtn: {backgroundColor: '#25D366'},
  actionText: {color: '#fff', fontWeight: '700', fontSize: 12.5},
});

export default InvoiceCard;
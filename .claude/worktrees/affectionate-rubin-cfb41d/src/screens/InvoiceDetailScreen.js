import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {invoiceAPI} from '../api/apiClient';
import {getStatusInfo, formatDate} from '../utils/helpers';

const InvoiceDetailScreen = ({route, navigation}) => {
  const {invoice} = route.params;
  const [invoiceDetails, setInvoiceDetails] = useState(invoice);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const statusInfo = getStatusInfo(invoiceDetails.status);

  // Fetch full invoice details if needed
  useEffect(() => {
    fetchInvoiceDetails();
  }, [fetchInvoiceDetails]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      const response = await invoiceAPI.getById(invoice.id);
      const data = response.data.data || response.data;
      setInvoiceDetails(data);
      setItems(data.items || data.invoice_items || []);
    } catch (error) {
      console.error('Fetch invoice details error:', error);
      // Use the passed invoice data if API fails
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (invoiceDetails.phone) {
      Linking.openURL(`tel:${invoiceDetails.phone}`);
    }
  };

  // const handleWhatsApp = () => {
  //   if (invoiceDetails.phone) {
  //     // Remove leading 0 and add country code
  //     let phone = invoiceDetails.phone;
  //     if (phone.startsWith('0')) {
  //       phone = '94' + phone.substring(1); // Sri Lanka country code
  //     }
  //     Linking.openURL(`whatsapp://send?phone=${phone}`);
  //   }
  // };

  const handleWhatsApp = async () => {
    if (!invoiceDetails.phone || !invoiceDetails.id) {
        Alert.alert('Error', 'Missing phone number or invoice ID.');
        return;
    }

    try {
        setLoading(true);

        // 1. Call the new API endpoint to generate and get the shareable PDF URL
        const response = await invoiceAPI.getShareablePdfUrl(invoiceDetails.id);// Assuming apiClient is configured for the base API URL
        
        if (response.data.success && response.data.pdf_url) {
            const { pdf_url, phone } = response.data;
            let targetPhone = phone;

            // Remove leading 0 and add country code (as you did previously)
            if (targetPhone.startsWith('0')) {
                // Assuming Sri Lanka country code '94'
                targetPhone = '94' + targetPhone.substring(1); 
            }
            
            // 2. Construct the WhatsApp deep link
            // We'll use the URL and a pre-filled text message. WhatsApp deep linking for files is limited, 
            // so sending the URL in the text is the standard way.
            const message = `Dear Customer, please find your invoice attached.\n\nInvoice No: ${invoiceDetails.inv_no}\nTotal: Rs. ${invoiceDetails.grand_total}\n\nView/Download PDF: ${pdf_url}`;

            const url = `whatsapp://send?phone=${targetPhone}&text=${encodeURIComponent(message)}`;

            // 3. Open the WhatsApp link
            const supported = await Linking.canOpenURL(url);

            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'WhatsApp is not installed.');
            }
        } else {
            Alert.alert('Error', 'Failed to generate shareable PDF link.');
        }

    } catch (error) {
        console.error('WhatsApp share error:', error);
        Alert.alert('Error', 'Failed to prepare invoice for sharing. Please try again.');
    } finally {
        setLoading(false);
    }
};

  const handleDelete = () => {
    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await invoiceAPI.delete(invoice.id);
              Alert.alert('Success', 'Invoice deleted successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete invoice');
            }
          },
        },
      ],
    );
  };

  const handleMarkAsPaid = async () => {
    try {
      await invoiceAPI.update(invoice.id, {status: '11'}); // 11 = Paid
      Alert.alert('Success', 'Invoice marked as paid');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update invoice');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.invoiceNumber}>{invoiceDetails.inv_no}</Text>
          <Text style={styles.customerId}>Customer ID: {invoiceDetails.cus_id}</Text>
        </View>
        <View style={[styles.statusBadge, {backgroundColor: statusInfo.color}]}>
          <Text style={styles.statusText}>{statusInfo.label}</Text>
        </View>
      </View>

      {/* Amount Card */}
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Total Amount</Text>
        <Text style={styles.amountValue}>Rs. {invoiceDetails.grand_total}</Text>
      </View>

      {/* Customer Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CUSTOMER INFORMATION</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{invoiceDetails.cus_name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone</Text>
          <TouchableOpacity onPress={handleCall}>
            <Text style={[styles.infoValue, styles.link]}>
              {invoiceDetails.phone}
            </Text>
          </TouchableOpacity>
        </View>

        {invoiceDetails.address && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{invoiceDetails.address}</Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionBtn} onPress={handleCall}>
            <Text style={styles.quickActionIcon}>📞</Text>
            <Text style={styles.quickActionText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionBtn} onPress={handleWhatsApp}>
            <Text style={styles.quickActionIcon}>💬</Text>
            <Text style={styles.quickActionText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Invoice Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INVOICE DETAILS</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Invoice Date</Text>
          <Text style={styles.infoValue}>{formatDate(invoiceDetails.inv_date)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Type</Text>
          <Text style={styles.infoValue}>
            {invoiceDetails.type?.replace('_', ' ')}
          </Text>
        </View>

        {invoiceDetails.paydate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Date</Text>
            <Text style={styles.infoValue}>{formatDate(invoiceDetails.paydate)}</Text>
          </View>
        )}

        {invoiceDetails.tracking_no && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tracking No</Text>
            <Text style={styles.infoValue}>{invoiceDetails.tracking_no}</Text>
          </View>
        )}

        {invoiceDetails.remarks && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Remarks</Text>
            <Text style={styles.infoValue}>{invoiceDetails.remarks}</Text>
          </View>
        )}
      </View>

      {/* Items Section */}
      {items.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ITEMS</Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>
                  {item.product_name || item.name || `Item ${index + 1}`}
                </Text>
                <Text style={styles.itemQty}>Qty: {item.quantity || 1}</Text>
              </View>
              <Text style={styles.itemPrice}>
                Rs. {item.price || item.amount || '0.00'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Timestamps */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TIMESTAMPS</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created</Text>
          <Text style={styles.infoValue}>
            {formatDate(invoiceDetails.created_at)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Updated</Text>
          <Text style={styles.infoValue}>
            {formatDate(invoiceDetails.updated_at)}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {invoiceDetails.status !== '11' && invoiceDetails.status !== '9' && (
          <TouchableOpacity
            style={styles.paidButton}
            onPress={handleMarkAsPaid}>
            <Text style={styles.buttonText}>✓ Mark as Paid</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => navigation.navigate('EditInvoice', {invoice: invoiceDetails})}>
          <Text style={styles.buttonText}>✏️ Edit Invoice</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.buttonText}>🗑️ Delete Invoice</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  customerId: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  amountCard: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  link: {
    color: '#007AFF',
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'center',
    gap: 16,
  },
  quickActionBtn: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  itemQty: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  actions: {
    padding: 16,
    paddingBottom: 40,
  },
  paidButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  editButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default InvoiceDetailScreen;
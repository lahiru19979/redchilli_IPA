import React, {useState, useEffect} from 'react';
import {View, Text, ActivityIndicator, Alert, StyleSheet} from 'react-native';
import {invoiceAPI, productAPI} from '../api/apiClient';
import invoiceStore from '../store/invoiceStore';
import {C} from '../utils/theme';
import {shareInvoiceOnWhatsApp} from '../utils/whatsapp';
import InvoiceForm from './invoice/InvoiceForm';
import {reconstructEditItems} from './invoice/invoiceHelpers';
import {useInvoiceSession} from './invoice/useInvoiceSession';

// Matches the "1,700.00" formatting used everywhere else in the invoice UI.
const money = value =>
  Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const EditInvoiceScreen = ({navigation, route}) => {
  const invoice = route.params.invoice;
  const rawItems = route.params.items || [];

  // Claim the store for this invoice before anything reads it, so a draft
  // left over from another invoice cannot leak into this one.
  useInvoiceSession(`edit:${invoice.id}`);

  const [products, setProducts] = useState([]);
  const [preparing, setPreparing] = useState(true);

  // Load the saved invoice into the store before the form mounts, so the
  // form reads a fully seeded draft on its first render.
  useEffect(() => {
    let cancelled = false;

    const prepare = async () => {
      invoiceStore.setCustomerInfo({
        id: null,
        cus_id: invoice.cus_id || '',
        name: invoice.cus_name || '',
        phone: invoice.phone || '',
        address: invoice.address || '',
        customerType: invoice.invoice_type || '',
      });

      let productList = [];
      try {
        const response = await productAPI.getAll();
        if (response.data.status === 'success') {
          productList = response.data.data || [];
        } else if (Array.isArray(response.data.data)) {
          productList = response.data.data;
        }
      } catch (error) {
        console.error('Fetch products error:', error);
      }

      if (cancelled) {
        return;
      }

      const {built, skippedCodes} = reconstructEditItems(rawItems, productList);
      invoiceStore.loadItems(built);

      setProducts(productList);
      setPreparing(false);

      if (skippedCodes.length > 0) {
        Alert.alert(
          'Some items could not be reloaded',
          `These products could not be matched to the current product list, so they were skipped: ${skippedCodes.join(
            ', ',
          )}. Please re-add them manually if still needed.`,
        );
      }
    };

    prepare();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdate = async invoiceData => {
    try {
      const response = await invoiceAPI.updateFull(invoice.id, invoiceData);
      console.log('✅ Invoice updated:', response.data);

      invoiceStore.clearAll();

      // Offer to send the customer the updated invoice straight away. The
      // PDF is generated on demand, so it always reflects what was just
      // saved. Either way we go back, where the detail screen re-fetches.
      Alert.alert(
        'Success ✅',
        `Invoice ${invoice.inv_no} updated successfully!\n\nSend the updated invoice to the customer on WhatsApp?`,
        [
          {text: 'Not now', style: 'cancel', onPress: () => navigation.goBack()},
          {
            text: 'Send on WhatsApp',
            onPress: async () => {
              await shareInvoiceOnWhatsApp({
                id: invoice.id,
                invNo: invoice.inv_no,
                phone: invoiceData.phone,
                total: money(invoiceData.grand_total),
              });
              navigation.goBack();
            },
          },
        ],
      );
    } catch (error) {
      console.error('Update invoice error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update invoice',
      );
    }
  };

  if (preparing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading invoice...</Text>
      </View>
    );
  }

  return (
    <InvoiceForm
      navigation={navigation}
      invoiceNo={invoice.inv_no}
      initialProducts={products}
      submitLabel="Preview & Update Invoice"
      submittingLabel="Updating..."
      confirmLabel="✓ Confirm & Update"
      busyLabel="Updating Invoice..."
      onSubmit={handleUpdate}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: C.textSecondary,
  },
});

export default EditInvoiceScreen;

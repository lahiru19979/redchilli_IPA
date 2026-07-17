import React, {useState, useEffect} from 'react';
import {Alert} from 'react-native';
import {invoiceAPI} from '../api/apiClient';
import invoiceStore from '../store/invoiceStore';
import InvoiceForm from './invoice/InvoiceForm';
import {useInvoiceSession} from './invoice/useInvoiceSession';

const CreateInvoiceScreen = ({navigation}) => {
  // Claim the store for a new invoice before InvoiceForm renders, so it
  // cannot pick up the draft left behind by an abandoned edit.
  useInvoiceSession('create');

  const [invoiceNo, setInvoiceNo] = useState('');
  const [loadingInvoiceNo, setLoadingInvoiceNo] = useState(true);

  const fetchMaxInvoiceNo = async () => {
    try {
      setLoadingInvoiceNo(true);
      const response = await invoiceAPI.getMaxInvoiceNo();
      if (response.data.status === 'success' || response.data.data) {
        setInvoiceNo(response.data.data);
      }
    } catch (error) {
      console.error('Fetch max invoice no error:', error);
    } finally {
      setLoadingInvoiceNo(false);
    }
  };

  useEffect(() => {
    fetchMaxInvoiceNo();
  }, []);

  const handleCreate = async invoiceData => {
    try {
      const response = await invoiceAPI.create(invoiceData);
      console.log('✅ Invoice created:', response.data);

      invoiceStore.clearAll();

      Alert.alert('Success ✅', `Invoice ${invoiceNo} created successfully!`, [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      console.error('Create invoice error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create invoice',
      );
    }
  };

  return (
    <InvoiceForm
      navigation={navigation}
      invoiceNo={invoiceNo}
      loadingInvoiceNo={loadingInvoiceNo}
      submitLabel="Preview & Create Invoice"
      submittingLabel="Creating..."
      confirmLabel="✓ Confirm & Create"
      busyLabel="Creating Invoice..."
      onSubmit={handleCreate}
    />
  );
};

export default CreateInvoiceScreen;

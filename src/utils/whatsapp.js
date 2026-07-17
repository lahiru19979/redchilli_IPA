import {Alert, Linking} from 'react-native';
import {invoiceAPI} from '../api/apiClient';

// Local numbers are stored as 0771234567; WhatsApp needs the country code.
const SRI_LANKA_CODE = '94';

export const toWhatsAppNumber = phone => {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (!digits) {
    return '';
  }
  return digits.startsWith('0')
    ? SRI_LANKA_CODE + digits.substring(1)
    : digits;
};

/**
 * Asks the API to render the invoice PDF, then hands WhatsApp a message
 * with the link. WhatsApp deep links can't attach a file, so the URL in the
 * message body is the supported way to deliver it.
 *
 * Returns true when WhatsApp was opened. Reports its own failures via Alert.
 */
export const shareInvoiceOnWhatsApp = async ({id, invNo, phone, total}) => {
  if (!id || !phone) {
    Alert.alert('Error', 'Missing phone number or invoice ID.');
    return false;
  }

  try {
    const response = await invoiceAPI.getShareablePdfUrl(id);

    if (!response.data?.success || !response.data?.pdf_url) {
      Alert.alert('Error', 'Failed to generate shareable PDF link.');
      return false;
    }

    const targetPhone = toWhatsAppNumber(response.data.phone || phone);
    const message =
      'Dear Customer, please find your invoice attached.\n\n' +
      `Invoice No: ${invNo}\n` +
      `Total: Rs. ${total}\n\n` +
      `View/Download PDF: ${response.data.pdf_url}`;

    const url = `whatsapp://send?phone=${targetPhone}&text=${encodeURIComponent(
      message,
    )}`;

    if (!(await Linking.canOpenURL(url))) {
      Alert.alert('Error', 'WhatsApp is not installed.');
      return false;
    }

    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.error('WhatsApp share error:', error);
    Alert.alert(
      'Error',
      'Failed to prepare invoice for sharing. Please try again.',
    );
    return false;
  }
};

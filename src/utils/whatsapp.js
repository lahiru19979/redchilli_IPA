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
 * Renders the invoice PDF and opens it, which on Android puts it through the
 * download manager and on iOS opens the share sheet. Same endpoint the WhatsApp
 * share uses, so an invoice is only ever rendered one way.
 *
 * Returns true when the PDF was opened. Reports its own failures via Alert.
 */
export const downloadInvoicePdf = async ({id}) => {
  if (!id) {
    Alert.alert('Error', 'Missing invoice ID.');
    return false;
  }

  try {
    const response = await invoiceAPI.getShareablePdfUrl(id);

    if (!response.data?.success || !response.data?.pdf_url) {
      Alert.alert('Error', 'Failed to generate the invoice PDF.');
      return false;
    }

    await Linking.openURL(response.data.pdf_url);
    return true;
  } catch (error) {
    console.error('Invoice download error:', error);
    Alert.alert('Error', 'Could not download that invoice. Please try again.');
    return false;
  }
};

/**
 * Sends the invoice through the WhatsApp CRM: the server renders the PDF and
 * delivers it as a document message from the business number, so it lands in the
 * customer's chat and is logged in the CRM thread like any other message.
 *
 * Confirms first, because it sends immediately with no draft to review — the
 * same guard the web invoice list puts on its WhatsApp button.
 */
const performCrmSend = async id => {
  try {
    const res = await invoiceAPI.sendViaWhatsAppCrm(id);
    Alert.alert('Sent', res.data?.message || 'Invoice sent.');
    return true;
  } catch (error) {
    Alert.alert(
      'Not sent',
      error?.response?.data?.message
        || 'Could not send that invoice via WhatsApp.',
    );
    return false;
  }
};

export const sendInvoiceViaCrm = ({id, invNo, phone, confirm = true}) => {
  if (!id) {
    Alert.alert('Error', 'Missing invoice ID.');
    return Promise.resolve(false);
  }

  // Pass confirm: false where the caller has already asked — otherwise the agent
  // gets two dialogs in a row for one decision.
  if (!confirm) {
    return performCrmSend(id);
  }

  return new Promise(resolve => {
    Alert.alert(
      'Send via WhatsApp?',
      `Invoice ${invNo} will be sent to ${phone} from the business WhatsApp number.`,
      [
        {text: 'Cancel', style: 'cancel', onPress: () => resolve(false)},
        {text: 'Send', onPress: () => performCrmSend(id).then(resolve)},
      ],
    );
  });
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

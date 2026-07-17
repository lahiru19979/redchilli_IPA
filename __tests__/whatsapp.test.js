import {Alert, Linking} from 'react-native';
import {invoiceAPI} from '../src/api/apiClient';
import {shareInvoiceOnWhatsApp, toWhatsAppNumber} from '../src/utils/whatsapp';

jest.mock('../src/api/apiClient', () => ({
  invoiceAPI: {getShareablePdfUrl: jest.fn()},
}));

const inv = {id: 42, invNo: 'AAAA01942', phone: '0771234567', total: '3,400.00'};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  invoiceAPI.getShareablePdfUrl.mockResolvedValue({
    data: {success: true, pdf_url: 'https://x.test/inv.pdf', phone: '0771234567'},
  });
});

describe('toWhatsAppNumber', () => {
  test('swaps a local leading 0 for the country code', () => {
    expect(toWhatsAppNumber('0771234567')).toBe('94771234567');
  });
  test('leaves an already-international number alone', () => {
    expect(toWhatsAppNumber('94771234567')).toBe('94771234567');
  });
  test('strips spaces and dashes', () => {
    expect(toWhatsAppNumber('077-123 4567')).toBe('94771234567');
  });
  test('handles empty input', () => {
    expect(toWhatsAppNumber('')).toBe('');
    expect(toWhatsAppNumber(null)).toBe('');
  });
});

describe('shareInvoiceOnWhatsApp', () => {
  test('opens WhatsApp with the invoice number, total and pdf link', async () => {
    const ok = await shareInvoiceOnWhatsApp(inv);

    expect(ok).toBe(true);
    expect(invoiceAPI.getShareablePdfUrl).toHaveBeenCalledWith(42);

    const url = Linking.openURL.mock.calls[0][0];
    expect(url).toContain('whatsapp://send?phone=94771234567');
    const text = decodeURIComponent(url.split('&text=')[1]);
    expect(text).toContain('AAAA01942');
    expect(text).toContain('Rs. 3,400.00');
    expect(text).toContain('https://x.test/inv.pdf');
  });

  test('generates the PDF fresh each send, so it reflects the latest save', async () => {
    await shareInvoiceOnWhatsApp(inv);
    await shareInvoiceOnWhatsApp(inv);
    expect(invoiceAPI.getShareablePdfUrl).toHaveBeenCalledTimes(2);
  });

  test('reports when WhatsApp is not installed and does not open', async () => {
    Linking.canOpenURL.mockResolvedValue(false);
    const ok = await shareInvoiceOnWhatsApp(inv);
    expect(ok).toBe(false);
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'WhatsApp is not installed.');
  });

  test('reports a failed PDF generation instead of opening WhatsApp', async () => {
    invoiceAPI.getShareablePdfUrl.mockResolvedValue({data: {success: false}});
    const ok = await shareInvoiceOnWhatsApp(inv);
    expect(ok).toBe(false);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  test('does not throw when the API errors', async () => {
    invoiceAPI.getShareablePdfUrl.mockRejectedValue(new Error('network'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(shareInvoiceOnWhatsApp(inv)).resolves.toBe(false);
  });

  test('refuses without a phone number', async () => {
    const ok = await shareInvoiceOnWhatsApp({...inv, phone: ''});
    expect(ok).toBe(false);
    expect(invoiceAPI.getShareablePdfUrl).not.toHaveBeenCalled();
  });
});

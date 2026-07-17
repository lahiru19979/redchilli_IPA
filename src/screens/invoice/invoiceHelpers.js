// Shared pieces for the create/edit invoice screens.

import {getColorName, PRODUCT_COLORS} from '../../utils/colors';
import {getSizeByID, SIZES, NUMERIC_SIZES} from '../../utils/sizes';

export const CUSTOMER_TYPES = [
  {id: '1', label: 'Working', color: '#4CAF50'},
  {id: '2', label: 'Online', color: '#2196F3'},
  {id: '3', label: 'Redex', color: '#FF5722'},
];

const normalizeCode = value => String(value || '').trim().toLowerCase();

// desc_td is stored as "item_name/gsm", but older mobile-saved rows used
// "item_name / gsm". Collapse the spaces so both compare equal.
const normalizeDesc = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, '/');

// Resolves a saved Invoice3 row back to a live product. Rows carry no
// product_id, so they are matched by item_code first, then by desc_td —
// invoices saved from the web leave itemCode_se empty and only ever write
// desc_td, so the fallback is what makes those rows editable here.
const findProductForRow = (row, productList) => {
  const code = normalizeCode(row.itemCode_se);
  if (code) {
    const byCode = productList.find(p => normalizeCode(p.item_code) === code);
    if (byCode) {
      return byCode;
    }
  }

  const desc = normalizeDesc(row.desc_td);
  if (desc) {
    return productList.find(
      p => normalizeDesc(`${p.item_name}/${p.gsm}`) === desc,
    );
  }

  return undefined;
};

// Reconstructs invoiceStore-shaped items from an existing invoice's saved
// line items (Invoice3 rows). Rows that resolve to no live product are
// reported back as skipped so the user can re-add them manually.
export const reconstructEditItems = (rawItems, productList) => {
  const built = [];
  const skippedCodes = [];

  rawItems.forEach((row, index) => {
    const product = findProductForRow(row, productList);
    if (!product) {
      skippedCodes.push(row.itemCode_se || row.desc_td || `#${index + 1}`);
      return;
    }

    const colorMatch = PRODUCT_COLORS.find(
      c => c.name.toLowerCase() === String(row.color_se || '').toLowerCase(),
    );
    const sizeMatch = [...SIZES, ...NUMERIC_SIZES].find(
      s => s.name.toLowerCase() === String(row.size_se || '').toLowerCase(),
    );

    built.push({
      id: Date.now() + index,
      product,
      quantity: Number(row.qty_txt) || 1,
      priceType: `sell_price${row.slab_se || '1'}`,
      color: colorMatch ? colorMatch.id : 'white',
      size: sizeMatch ? sizeMatch.id : 'm',
      discount: toAmount(row.discountRate_txt),
      extra: toAmount(row.extra_txt),
    });
  });

  return {built, skippedCodes};
};

// Values arrive from the DB as strings like "1,700.00" and from the qty/
// discount/extra inputs as free text, so everything gets normalized here.
export const toAmount = value => {
  if (typeof value === 'number') {
    return isFinite(value) ? value : 0;
  }
  const parsed = parseFloat(String(value || '').replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

export const getItemPrice = item =>
  toAmount(item.product[item.priceType] || item.product.sell_price1 || '0');

// Both are per-unit amounts, not percentages - the web's discountRate_txt
// is a rate only in name.
export const getItemDiscount = item => toAmount(item.discount);
export const getItemExtra = item => toAmount(item.extra);

// Mirrors the web's line total: qty * (unit price - discount + extra).
export const getLineTotal = item =>
  item.quantity * (getItemPrice(item) - getItemDiscount(item) + getItemExtra(item));

export const calculateTotal = items =>
  items.reduce((sum, item) => sum + getLineTotal(item), 0);

export const calculateTotalQty = items =>
  items.reduce((sum, item) => sum + item.quantity, 0);

// The web's footer "Amount" sums the unit prices themselves, NOT unit price
// x qty - see tblFooterDetails() in edit_joborder.blade.php.
export const calculateTotalUnitPrice = items =>
  items.reduce((sum, item) => sum + getItemPrice(item), 0);

export const calculateTotalDiscount = items =>
  items.reduce((sum, item) => sum + getItemDiscount(item) * item.quantity, 0);

export const calculateTotalExtra = items =>
  items.reduce((sum, item) => sum + getItemExtra(item) * item.quantity, 0);

// Builds the request body shared by the create and update endpoints.
export const buildInvoicePayload = ({
  invoiceNo,
  customer,
  customerType,
  items,
}) => ({
  inv_no: invoiceNo,
  inv_date: new Date().toISOString().split('T')[0],
  cus_id: customer.cus_id || null,
  cus_name: customer.customer_name,
  phone: customer.phone,
  address: customer.address || '',
  customer_type: customerType,
  type: 'job_order',

  items: items.map((item, index) => ({
    row_no: index + 1,
    product_id: item.product.id,
    item_code: item.product.item_code,
    item_name: item.product.item_name,
    style: item.product.style,
    gsm: item.product.gsm,
    fabric: item.product.fabric_up,

    color: item.color,
    color_name: getColorName(item.color),

    size: item.size,
    size_name: getSizeByID(item.size).name,

    quantity: item.quantity,
    price_type: item.priceType,
    unit_price: getItemPrice(item),
    discount: getItemDiscount(item),
    extra: getItemExtra(item),
    line_total: getLineTotal(item),
  })),

  item_row_count: items.length,
  total_quantity: calculateTotalQty(items),

  // Footer totals, named to match the columns the web writes on invoice2s.
  total_unit_price: calculateTotalUnitPrice(items),
  total_discount: calculateTotalDiscount(items),
  total_extra: calculateTotalExtra(items),
  grand_total: calculateTotal(items),
});

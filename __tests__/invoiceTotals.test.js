import {
  getLineTotal, calculateTotal, calculateTotalQty, calculateTotalUnitPrice,
  calculateTotalDiscount, calculateTotalExtra, buildInvoicePayload, toAmount,
  reconstructEditItems,
} from '../src/screens/invoice/invoiceHelpers';

// The discount/extra money math must agree with the web job order page.
// The reference implementations below are ports of that page's own JS
// (tblFooterDetails / calculateextra in edit_joborder.blade.php).

const mk = (price, qty, discount, extra) => ({
  id: Math.random(), quantity: qty, priceType: 'sell_price1',
  color: 'white', size: 'm', discount, extra,
  product: {id: 1, item_code: 'I1', item_name: 'TSHIRT', style: 'CREW', gsm: '170',
            fabric_up: 'COTTON', sell_price1: price},
});

const num = v => parseFloat(String(v).replace(/[^0-9-.]/g, '')) || 0;
const webLineTotal = it =>
  (num(it.product.sell_price1) * it.quantity - num(it.discount) * it.quantity) +
  (num(it.extra) * it.quantity);
const webFooter = items => {
  let qty = 0, amount = 0, discount = 0, extra = 0, total = 0;
  for (const it of items) {
    amount += num(it.product.sell_price1);
    qty += it.quantity;
    discount += num(it.discount) * it.quantity;
    extra += num(it.extra) * it.quantity;
    total += webLineTotal(it);
  }
  return {qty, amount, discount, extra, total};
};

const items = [
  mk('1,700.00', 3, 200, 50),
  mk('490.00', 2, 0, 0),
  mk('870.00', 4, 70, 0),
  mk('440.00', 1, 0, 25),
];

test('line total matches the web formula qty*(price-discount+extra)', () => {
  items.forEach(it => expect(getLineTotal(it)).toBe(webLineTotal(it)));
  expect(getLineTotal(items[0])).toBe(4650); // 3 * (1700 - 200 + 50)
});

test('footer totals match the web tblFooterDetails', () => {
  const w = webFooter(items);
  expect(calculateTotalQty(items)).toBe(w.qty);
  expect(calculateTotalUnitPrice(items)).toBe(w.amount);
  expect(calculateTotalDiscount(items)).toBe(w.discount);
  expect(calculateTotalExtra(items)).toBe(w.extra);
  expect(calculateTotal(items)).toBe(w.total);

  expect(calculateTotalUnitPrice(items)).toBe(1700 + 490 + 870 + 440);
  expect(calculateTotalDiscount(items)).toBe(200 * 3 + 70 * 4);
  expect(calculateTotalExtra(items)).toBe(50 * 3 + 25 * 1);
});

test('total unit prices sums unit prices, not unit price x qty', () => {
  expect(calculateTotalUnitPrice([mk('100', 5, 0, 0)])).toBe(100);
});

test('payload carries per-line and footer discount/extra', () => {
  const p = buildInvoicePayload({
    invoiceNo: 'INV1', customerType: '1', items,
    customer: {cus_id: 'C1', customer_name: 'A', phone: '1', address: 'x'},
  });
  expect(p.items[0]).toMatchObject({unit_price: 1700, discount: 200, extra: 50, line_total: 4650});
  expect(p.total_unit_price).toBe(3500);
  expect(p.total_discount).toBe(880);
  expect(p.total_extra).toBe(175);
  expect(p.grand_total).toBe(webFooter(items).total);
});

test('editing an invoice loads its saved discount/extra back', () => {
  const products = [{id: 1, item_code: 'ITEM0001', item_name: 'TSHIRT', gsm: '170', sell_price1: '1,700.00'}];
  const rows = [{
    itemCode_se: 'ITEM0001', desc_td: 'TSHIRT/170', qty_txt: '3', slab_se: '1',
    color_se: 'White', size_se: 'M',
    amount_txt: '1,700.00', discountRate_txt: '200.00', extra_txt: '50.00',
    totAmout_td: '4,650.00',
  }];

  const {built, skippedCodes} = reconstructEditItems(rows, products);
  expect(skippedCodes).toHaveLength(0);
  expect(built[0].discount).toBe(200);
  expect(built[0].extra).toBe(50);
  // and the reloaded line still totals what was saved
  expect(getLineTotal(built[0])).toBe(4650);
});

test('rows saved before discount/extra existed load as zero, not NaN', () => {
  const products = [{id: 1, item_code: 'ITEM0001', item_name: 'TSHIRT', gsm: '170', sell_price1: '1,700.00'}];
  const rows = [{itemCode_se: 'ITEM0001', desc_td: 'TSHIRT/170', qty_txt: '2', slab_se: '1',
                 discountRate_txt: null, extra_txt: null}];

  const {built} = reconstructEditItems(rows, products);
  expect(built[0].discount).toBe(0);
  expect(built[0].extra).toBe(0);
  expect(getLineTotal(built[0])).toBe(3400);
});

test('toAmount tolerates the strings these fields really carry', () => {
  expect(toAmount('1,700.00')).toBe(1700);
  expect(toAmount('')).toBe(0);
  expect(toAmount(null)).toBe(0);
  expect(toAmount('abc')).toBe(0);
  expect(toAmount(250)).toBe(250);
});

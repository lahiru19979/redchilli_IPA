import React, {useState} from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import invoiceStore from '../src/store/invoiceStore';
import {useInvoiceSession} from '../src/screens/invoice/useInvoiceSession';

// invoiceStore is a singleton shared by CreateInvoiceScreen and
// EditInvoiceScreen. These cover the leak that caused Create to open
// pre-filled with an abandoned edit's customer and items.

const prod = {
  id: 1,
  item_code: 'ITEM0001',
  item_name: 'TSHIRT',
  gsm: '170',
  sell_price1: '1700',
};

// Stands in for InvoiceForm, which reads the store during render.
let seen;
const FormStub = () => {
  const [items] = useState(() => invoiceStore.getItems());
  const [customer] = useState(() => invoiceStore.getCustomerInfo());
  seen = {items, customer};
  return null;
};

const Screen = ({sessionId}) => {
  useInvoiceSession(sessionId);
  return <FormStub />;
};

const leaveAbandonedEditDraft = () => {
  invoiceStore.beginSession('edit:42');
  invoiceStore.setCustomerInfo({cus_id: 'CUS9', name: 'ACME', phone: '0771'});
  invoiceStore.addItem(prod);
};

beforeEach(() => {
  seen = undefined;
  invoiceStore.clearAll();
});

test('create opens empty after an abandoned edit', () => {
  leaveAbandonedEditDraft();

  act(() => {
    TestRenderer.create(<Screen sessionId="create" />);
  });

  expect(seen.items).toHaveLength(0);
  expect(seen.customer.cus_id).toBe('');
  expect(seen.customer.name).toBe('');
  expect(seen.customer.phone).toBe('');
});

test('one invoice does not inherit another invoice edit draft', () => {
  leaveAbandonedEditDraft();

  act(() => {
    TestRenderer.create(<Screen sessionId="edit:43" />);
  });

  expect(seen.items).toHaveLength(0);
  expect(seen.customer.cus_id).toBe('');
});

test('re-entering the same invoice keeps its draft', () => {
  invoiceStore.beginSession('create');
  invoiceStore.addItem(prod);
  invoiceStore.setCustomerInfo({cus_id: 'CUS1'});

  act(() => {
    TestRenderer.create(<Screen sessionId="create" />);
  });

  expect(seen.items).toHaveLength(1);
  expect(seen.customer.cus_id).toBe('CUS1');
});

test('re-rendering does not wipe the in-progress draft', () => {
  let tree;
  act(() => {
    tree = TestRenderer.create(<Screen sessionId="create" />);
  });

  invoiceStore.addItem(prod);
  act(() => {
    tree.update(<Screen sessionId="create" />);
  });

  expect(invoiceStore.getItems()).toHaveLength(1);
});

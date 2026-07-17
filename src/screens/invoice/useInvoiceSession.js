import {useRef} from 'react';
import invoiceStore from '../../store/invoiceStore';

/**
 * Claims the shared invoiceStore for one invoice, during render.
 *
 * This deliberately runs in render rather than in an effect. Children are
 * committed before their parent's effects run, so InvoiceForm would read
 * the store - and copy the previous screen's draft into its own state -
 * before a parent effect ever got the chance to clear it. Claiming here
 * means the store is already correct by the time the form first reads it.
 *
 * beginSession only wipes when the invoice actually changes, so re-renders
 * and re-entering the same invoice keep the draft intact.
 */
export const useInvoiceSession = sessionId => {
  const claimed = useRef(null);

  if (claimed.current !== sessionId) {
    invoiceStore.beginSession(sessionId);
    claimed.current = sessionId;
  }
};

export default useInvoiceSession;

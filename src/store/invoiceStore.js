// store/invoiceStore.js

const emptyCustomerInfo = () => ({
  id: null,
  cus_id: '',
  name: '',
  phone: '',
  address: '',
  customerType: 'working', // working, online, redex
});

// Simple store to hold invoice items in memory
let invoiceItems = [];
let customerInfo = emptyCustomerInfo();

// Which invoice this in-memory draft belongs to ('create', 'edit:12', ...).
// The store is a module-level singleton shared by the create and edit
// screens, so without this an abandoned edit would leave its customer and
// items behind and the next create would open pre-filled with them.
let currentSession = null;

const invoiceStore = {
  // Claims the store for one invoice. Switching to a different invoice
  // wipes the previous draft; re-entering the same one (e.g. coming back
  // from the barcode scanner) keeps it, so work in progress survives.
  beginSession: sessionId => {
    if (currentSession !== sessionId) {
      invoiceItems = [];
      customerInfo = emptyCustomerInfo();
      currentSession = sessionId;
    }
    return sessionId;
  },

  getSession: () => currentSession,

  // Get all items
  getItems: () => {
    return [...invoiceItems];
  },

  // Add item (Updated to include size)
  addItem: (product, priceType = 'sell_price1', color = 'white', size = 'm') => {
    console.log('🛒 Store: Adding item:', product.item_code, priceType, color, size);
    
    // Check if exists (Same product, same price, same color, AND same size)
    const existingIndex = invoiceItems.findIndex(
      item =>
        item.product.id === product.id &&
        item.priceType === priceType &&
        item.color === color &&
        item.size === size, 
    );

    if (existingIndex >= 0) {
      invoiceItems[existingIndex].quantity += 1;
      console.log('🛒 Store: Incremented quantity');
    } else {
      // unshift, not push: the newest line goes to the top of the list, so the
      // product just scanned or tapped is the one on screen rather than being
      // pushed below everything already added.
      invoiceItems.unshift({
        id: Date.now(), // Unique ID for this specific row
        product: product,
        quantity: 1,
        priceType: priceType,
        color: color,
        size: size, // Store the size
        // Per-unit adjustments, matching the web's discountRate_txt/extra_txt.
        discount: 0,
        extra: 0,
      });
      console.log('🛒 Store: Added new item');
    }

    console.log('🛒 Store: Total items now:', invoiceItems.length);
    return [...invoiceItems];
  },

  // Update quantity
  updateQuantity: (itemId, change) => {
    invoiceItems = invoiceItems
      .map(item => {
        if (item.id === itemId) {
          return {...item, quantity: item.quantity + change};
        }
        return item;
      })
      .filter(item => item.quantity > 0);

    return [...invoiceItems];
  },

  // Change price
  changePrice: (itemId, newPriceType) => {
    invoiceItems = invoiceItems.map(item => {
      if (item.id === itemId) {
        return {...item, priceType: newPriceType};
      }
      return item;
    });

    return [...invoiceItems];
  },

  // Change color
  changeColor: (itemId, newColor) => {
    invoiceItems = invoiceItems.map(item => {
      if (item.id === itemId) {
        return {...item, color: newColor};
      }
      return item;
    });

    return [...invoiceItems];
  },

  // Change size (New Function)
  changeSize: (itemId, newSize) => {
    invoiceItems = invoiceItems.map(item => {
      if (item.id === itemId) {
        return {...item, size: newSize};
      }
      return item;
    });

    return [...invoiceItems];
  },

  // Per-unit discount taken off this line's unit price.
  changeDiscount: (itemId, newDiscount) => {
    invoiceItems = invoiceItems.map(item => {
      if (item.id === itemId) {
        return {...item, discount: newDiscount};
      }
      return item;
    });

    return [...invoiceItems];
  },

  // Per-unit extra charge added onto this line's unit price.
  changeExtra: (itemId, newExtra) => {
    invoiceItems = invoiceItems.map(item => {
      if (item.id === itemId) {
        return {...item, extra: newExtra};
      }
      return item;
    });

    return [...invoiceItems];
  },

  // Bulk-replace all items at once (used when reloading an existing
  // invoice's items for editing) - bypasses addItem's dedupe/increment
  // logic since each row already carries its own exact quantity.
  loadItems: (items) => {
    invoiceItems = items;
    return [...invoiceItems];
  },

  // Remove item
  removeItem: (itemId) => {
    invoiceItems = invoiceItems.filter(item => item.id !== itemId);
    return [...invoiceItems];
  },

  // Clear all items
  clearItems: () => {
    invoiceItems = [];
    return [];
  },

  // Get customer info
  getCustomerInfo: () => {
    return {...customerInfo};
  },

  // Set customer info
  setCustomerInfo: (info) => {
    customerInfo = {...customerInfo, ...info};
    return {...customerInfo};
  },

  // Clear everything and release the session, so the next screen to open
  // starts from a clean draft rather than inheriting this one.
  clearAll: () => {
    invoiceItems = [];
    customerInfo = emptyCustomerInfo();
    currentSession = null;
  },
};

export default invoiceStore;
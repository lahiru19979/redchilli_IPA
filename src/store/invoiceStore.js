// store/invoiceStore.js

// Simple store to hold invoice items in memory
let invoiceItems = [];
let customerInfo = {
  id: null,
  cus_id: '',
  name: '',
  phone: '',
  address: '',
  customerType: 'working', // working, online, redex
};

const invoiceStore = {
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
      invoiceItems.push({
        id: Date.now(), // Unique ID for this specific row
        product: product,
        quantity: 1,
        priceType: priceType,
        color: color,
        size: size, // Store the size
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

  // Clear everything
  clearAll: () => {
    invoiceItems = [];
    customerInfo = {
      id: null,
      cus_id: '',
      name: '',
      phone: '',
      address: '',
      customerType: 'working',
    };
  },
};

export default invoiceStore;
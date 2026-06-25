import React, {createContext, useState, useContext} from 'react';

const CartContext = createContext({});

export const CartProvider = ({children}) => {
  const [cartItems, setCartItems] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
  });

  // Add product to cart
  const addToCart = (product, priceType = 'sell_price1', color = 'white') => {
    console.log('🛒 CartContext: Adding product:', product.item_code, priceType, color);

    setCartItems((prevItems) => {
      // Check if product already exists with same price type AND color
      const existingIndex = prevItems.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.priceType === priceType &&
          item.color === color,
      );

      if (existingIndex >= 0) {
        // Increment quantity
        const updatedItems = [...prevItems];
        updatedItems[existingIndex].quantity += 1;
        console.log('📊 Updated quantity for existing item');
        return updatedItems;
      } else {
        // Add new item
        const newItem = {
          id: Date.now(), // Unique ID for the cart item
          product: product,
          quantity: 1,
          priceType: priceType,
          color: color,
        };
        console.log('✅ Added new item to cart');
        return [...prevItems, newItem];
      }
    });
  };

  // Update quantity
  const updateQuantity = (itemId, change) => {
    setCartItems((prevItems) => {
      const updatedItems = prevItems.map((item) => {
        if (item.id === itemId) {
          return {...item, quantity: item.quantity + change};
        }
        return item;
      });

      // Remove items with quantity <= 0
      return updatedItems.filter((item) => item.quantity > 0);
    });
  };

  // Change price type
  const changePrice = (itemId, newPriceType) => {
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          return {...item, priceType: newPriceType};
        }
        return item;
      }),
    );
  };

  // Change color
  const changeColor = (itemId, newColor) => {
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          return {...item, color: newColor};
        }
        return item;
      }),
    );
  };

  // Remove item
  const removeFromCart = (itemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
    setCustomerInfo({name: '', phone: '', address: ''});
  };

  // Get item price
  const getItemPrice = (item) => {
    const priceStr = item.product[item.priceType] || item.product.sell_price1 || '0';
    const price =
      typeof priceStr === 'string'
        ? parseFloat(priceStr.replace(/,/g, ''))
        : priceStr;
    return isNaN(price) ? 0 : price;
  };

  // Calculate total
  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => {
      return sum + getItemPrice(item) * item.quantity;
    }, 0);
  };

  // Get cart count
  const getCartCount = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        customerInfo,
        setCustomerInfo,
        addToCart,
        updateQuantity,
        changePrice,
        changeColor,
        removeFromCart,
        clearCart,
        getItemPrice,
        getCartTotal,
        getCartCount,
      }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
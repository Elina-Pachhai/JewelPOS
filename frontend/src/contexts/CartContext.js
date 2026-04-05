import React, { createContext, useState, useEffect, useContext } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const TAX_RATE = 0.05; // 5% tax

  // Load cart from localStorage on mount
  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        setItems(parsedCart);
      } catch (error) {
        console.error('Error parsing stored cart:', error);
        localStorage.removeItem('cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.sku === product.sku);

      if (existingItem) {
        // Increase quantity if item already in cart
        return prevItems.map(item =>
          item.sku === product.sku
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Add new item to cart
        return [...prevItems, { ...product, quantity: 1 }];
      }
    });
  };

  const removeItem = (sku) => {
    setItems(prevItems => prevItems.filter(item => item.sku !== sku));
  };

  const updateQuantity = (sku, quantity) => {
    if (quantity <= 0) {
      removeItem(sku);
    } else {
      setItems(prevItems =>
        prevItems.map(item =>
          item.sku === sku ? { ...item, quantity } : item
        )
      );
    }
  };

  const updateItemPrice = (sku, newPrice) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.sku === sku ? { ...item, price: newPrice } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setSelectedCustomer(null);
    localStorage.removeItem('cart');
  };

  const setCustomer = (customer) => {
    setSelectedCustomer(customer);
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      taxRate: TAX_RATE,
      total: total.toFixed(2)
    };
  };

  const value = {
    items,
    selectedCustomer,
    addItem,
    removeItem,
    updateQuantity,
    updateItemPrice,
    clearCart,
    setCustomer,
    calculateTotals,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext;

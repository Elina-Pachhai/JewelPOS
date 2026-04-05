import React, { useState } from 'react';
import axios from 'axios';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ProcessSale = () => {
  const { items, removeItem, updateQuantity, updateItemPrice, calculateTotals, clearCart, selectedCustomer } = useCart();
  const { user } = useAuth();
  const totals = calculateTotals();

  // Customer info state
  const [customerName, setCustomerName] = useState(selectedCustomer?.name || '');
  const [customerPhone, setCustomerPhone] = useState(selectedCustomer?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(selectedCustomer?.email || '');

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  // Loyalty points state
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  // Price override state
  const [editingPrice, setEditingPrice] = useState(null); // SKU of item being edited
  const [newPrice, setNewPrice] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [priceOverrideError, setPriceOverrideError] = useState('');
  const [showPriceModal, setShowPriceModal] = useState(false);

  // Checkout state
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentStep, setPaymentStep] = useState('cart'); // 'cart' | 'processing' | 'receipt'
  const [completedSale, setCompletedSale] = useState(null);
  const [pendingSaleData, setPendingSaleData] = useState(null);

  // Validation
  const isCustomerValid = () => {
    const customerEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const customerPhoneRegex = /^\d(?:[ -]?\d+){9,}$/;

    // 1. Name is required and must be valid
    if (!customerName.trim()) {
      setError("Please provide a name");
      return false;
    }

    // 2. Either email or phone must be provided and valid
    const email = customerEmail.trim();
    const phone = customerPhone.trim();

    if (!email && !phone) {
      setError("Please provide either an email or a phone number");
      return false;
    }

    // If email is available and email is not in the correct format
    if (email && !customerEmailRegex.test(email)) {
      setError("Invalid email format: require [identifier][@][identifier][.][domain]");
      return false;
    }

    //if phone is available and not in correct format
    if (phone && !customerPhoneRegex.test(phone)) {
      setError("Invalid phone number format, please provide at least 10 numbers");
      return false;
    }

    // If all checks pass
    setError(""); // clear any previous errors
    return true;
  };


  const handleApplyPromo = () => {
    // Simple demo promo codes
    if (promoCode.toUpperCase() === 'SAVE10') {
      setPromoDiscount(10);
      setPromoApplied(true);
    } else if (promoCode.toUpperCase() === 'SAVE20') {
      setPromoDiscount(20);
      setPromoApplied(true);
    } else {
      setError('Invalid promo code');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handlePriceOverride = (sku, currentPrice) => {
    setEditingPrice(sku);
    setNewPrice(currentPrice.toString());
    setManagerEmail('');
    setManagerPassword('');
    setPriceOverrideError('');
    setShowPriceModal(true);
  };

  const handleConfirmPriceOverride = async () => {
    try {
      // Verify manager credentials
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: managerEmail,
        password: managerPassword
      });

      if (response.data.role === 'Manager') {
        // Update the item price
        const priceNum = parseFloat(newPrice);
        if (isNaN(priceNum) || priceNum < 0) {
          setPriceOverrideError('Invalid price');
          return;
        }

        // Update cart item with new price
        updateItemPrice(editingPrice, priceNum);

        setShowPriceModal(false);
        setEditingPrice(null);
      } else {
        setPriceOverrideError('Only managers can override prices');
      }
    } catch (err) {
      setPriceOverrideError('Invalid manager credentials');
    }
  };

  const handleProcessPayment = () => {
    if (!isCustomerValid()) {
      return;
    }

    if (items.length === 0) {
      setError('No items in cart');
      return;
    }

    setError('');

    // Store pending sale data
    setPendingSaleData({
      items: [...items],
      customerName,
      customerPhone,
      customerEmail,
      promoApplied,
      promoDiscount,
      pointsToRedeem: usePoints ? pointsToRedeem : 0
    });

    // Show payment screen
    setPaymentStep('processing');
  };

  const handlePaymentCompleted = async () => {
    setProcessing(true);

    try {
      let customerId = selectedCustomer?.customer_id || null;

      // If no customer selected but customer info provided, create new customer
      if (!customerId && pendingSaleData.customerName) {
        const nameParts = pendingSaleData.customerName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        try {
          const customerResponse = await axios.post(`${API_URL}/customers`, {
            first_name: firstName,
            last_name: lastName,
            email: pendingSaleData.customerEmail || null,
            phone_number: pendingSaleData.customerPhone || null
          });
          customerId = customerResponse.data.customer_id;
        } catch (custErr) {
          // If customer creation fails (e.g., duplicate email), continue without customer_id
          console.warn('Could not create customer:', custErr);
        }
      }

      const saleData = {
        user_id: user.user_id,
        customer_id: customerId,
        items: pendingSaleData.items.map(item => ({
          sku: item.sku,
          quantity: item.quantity,
          price: item.price
        })),
        points_redeemed: pendingSaleData.pointsToRedeem || 0
      };

      const response = await axios.post(`${API_URL}/sales`, saleData);

      // Calculate final totals with promo and points
      const subtotal = pendingSaleData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const promoDiscountAmt = pendingSaleData.promoApplied ? (subtotal * pendingSaleData.promoDiscount / 100) : 0;
      const pointsDiscountAmt = Math.floor((pendingSaleData.pointsToRedeem || 0) / 100) * 10;
      const totalDiscount = promoDiscountAmt + pointsDiscountAmt;
      const afterDiscount = Math.max(0, subtotal - totalDiscount);
      const tax = afterDiscount * 0.05;
      const finalTotal = afterDiscount + tax;

      setCompletedSale({
        ...response.data,
        items: pendingSaleData.items,
        totals: {
          subtotal: subtotal.toFixed(2),
          promoDiscount: promoDiscountAmt.toFixed(2),
          pointsDiscount: pointsDiscountAmt.toFixed(2),
          discount: totalDiscount.toFixed(2),
          tax: tax.toFixed(2),
          total: finalTotal.toFixed(2)
        },
        pointsRedeemed: pendingSaleData.pointsToRedeem || 0,
        pointsEarned: response.data.points_earned || 0,
        customer: {
          name: pendingSaleData.customerName,
          phone: pendingSaleData.customerPhone,
          email: pendingSaleData.customerEmail
        },
        employee: user
      });

      clearCart();
      setPaymentStep('receipt');
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.error || 'Payment failed. Please try again.');
      setPaymentStep('cart');
    } finally {
      setProcessing(false);
    }
  };

  const handleNewSale = () => {
    setPaymentStep('cart');
    setCompletedSale(null);
    setPendingSaleData(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setPromoCode('');
    setPromoApplied(false);
    setPromoDiscount(0);
    setUsePoints(false);
    setPointsToRedeem(0);
  };

  const handleCancelPayment = () => {
    setPaymentStep('cart');
  };

  // Calculate totals with promo and points
  const subtotal = parseFloat(totals.subtotal);
  const promoDiscountAmount = promoApplied ? (subtotal * promoDiscount / 100) : 0;
  const pointsDiscountAmount = usePoints ? Math.floor(pointsToRedeem / 100) * 10 : 0;
  const totalDiscountAmount = promoDiscountAmount + pointsDiscountAmount;
  const afterDiscount = Math.max(0, subtotal - totalDiscountAmount);
  const tax = afterDiscount * 0.05;
  const finalTotal = afterDiscount + tax;

  // Customer loyalty points
  const customerPoints = selectedCustomer?.loyalty_points || 0;
  const maxRedeemable = Math.floor(customerPoints / 100) * 100; // Must be multiple of 100
  const maxPointsDiscount = Math.floor(customerPoints / 100) * 10;

  // Show payment processing screen
  if (paymentStep === 'processing') {
    const paymentTotal = pendingSaleData
      ? pendingSaleData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      : finalTotal;
    const paymentPromoDiscount = pendingSaleData?.promoApplied
      ? (paymentTotal * pendingSaleData.promoDiscount / 100)
      : 0;
    const paymentPointsDiscount = Math.floor((pendingSaleData?.pointsToRedeem || 0) / 100) * 10;
    const paymentAfterDiscount = Math.max(0, paymentTotal - paymentPromoDiscount - paymentPointsDiscount);
    const paymentFinal = paymentAfterDiscount * 1.05;

    return (
      <div className="payment-screen">
        <button
          className="payment-completed-btn"
          onClick={handlePaymentCompleted}
          disabled={processing}
        >
          {processing ? 'Processing...' : 'Payment Completed'}
        </button>
        <button
          className="payment-cancel-btn"
          onClick={handleCancelPayment}
          disabled={processing}
        >
          Cancel
        </button>
        <div className="payment-animation">
          <div className="contactless-icon">
            <svg className="nfc-icon" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
              {/* Outer circle */}
              <circle cx="60" cy="60" r="55" fill="none" stroke="#4A90D9" strokeWidth="3" className="outer-ring" />
              {/* Phone body */}
              <rect x="42" y="30" width="36" height="60" rx="4" ry="4" fill="none" stroke="#4A90D9" strokeWidth="2.5" />
              {/* Phone screen */}
              <rect x="46" y="36" width="28" height="48" rx="2" ry="2" fill="#4A90D9" opacity="0.1" />
              {/* Phone notch/speaker */}
              <rect x="52" y="33" width="16" height="2" rx="1" fill="#4A90D9" />
              {/* NFC waves */}
              <path className="wave wave-1" d="M85 45 Q95 60 85 75" fill="none" stroke="#4A90D9" strokeWidth="2.5" strokeLinecap="round" />
              <path className="wave wave-2" d="M92 40 Q105 60 92 80" fill="none" stroke="#4A90D9" strokeWidth="2.5" strokeLinecap="round" />
              <path className="wave wave-3" d="M99 35 Q115 60 99 85" fill="none" stroke="#4A90D9" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="payment-instruction">Hold Near Reader</p>
          <h2 className="payment-brand">Jewel</h2>
          <p className="payment-amount">Total: ${paymentFinal.toFixed(2)}</p>
        </div>
      </div>
    );
  }

  // Show receipt after sale is complete
  if (paymentStep === 'receipt' && completedSale) {
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return (
      <div className="receipt-view">
        <div className="receipt-paper">
          <div className="receipt-header">
            <h1 className="receipt-logo">Jewel</h1>
            <p className="receipt-operator">Employee: {completedSale.employee?.username || 'Staff'}</p>
          </div>

          <div className="receipt-info">
            <p>Issued</p>
            <p>{currentDate} at {currentTime}</p>
          </div>

          <div className="receipt-items">
            <div className="receipt-table-header">
              <span>Item</span>
              <span>Cost</span>
              <span>Qty</span>
              <span>Total</span>
            </div>

            {completedSale.items?.map((item, index) => (
              <div key={index} className="receipt-item-row">
                <span className="item-name">{item.name}</span>
                <span>${Number(item.price).toFixed(2)}</span>
                <span>{item.quantity}</span>
                <span>${(Number(item.price) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="receipt-totals">
            <div className="receipt-line">
              <span>Subtotal</span>
              <span>${completedSale.totals?.subtotal || '0.00'}</span>
            </div>
            {parseFloat(completedSale.totals?.promoDiscount) > 0 && (
              <div className="receipt-line discount">
                <span>Promo Discount</span>
                <span>-${completedSale.totals?.promoDiscount}</span>
              </div>
            )}
            {parseFloat(completedSale.totals?.pointsDiscount) > 0 && (
              <div className="receipt-line discount">
                <span>Points Redeemed ({completedSale.pointsRedeemed} pts)</span>
                <span>-${completedSale.totals?.pointsDiscount}</span>
              </div>
            )}
            <div className="receipt-line">
              <span>Tax (5%)</span>
              <span>${completedSale.totals?.tax || '0.00'}</span>
            </div>
            <div className="receipt-line total">
              <span>Total</span>
              <span>${completedSale.totals?.total || '0.00'}</span>
            </div>
            {completedSale.pointsEarned > 0 && (
              <div className="receipt-line points-earned">
                <span>Points Earned</span>
                <span>+{completedSale.pointsEarned} pts</span>
              </div>
            )}
          </div>

          {completedSale.customer && (
            <div className="receipt-customer">
              <p>Customer: {completedSale.customer.name}</p>
              {completedSale.customer.email && <p>{completedSale.customer.email}</p>}
              {completedSale.customer.phone && <p>{completedSale.customer.phone}</p>}
            </div>
          )}

          <div className="receipt-barcode">
            <div className="barcode-lines"></div>
          </div>
        </div>

        <div className="receipt-actions">
          <button className="print-btn" onClick={() => window.print()}>
            Print Receipt
          </button>
          <button className="new-sale-btn" onClick={handleNewSale}>
            New Sale
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="process-sale">
        <h2 className="section-title">Order Summary</h2>
        <div className="empty-cart">
          <p>No items in cart</p>
          <p className="empty-hint">Go to Inventory to add items</p>
        </div>
      </div>
    );
  }

  return (
    <div className="process-sale">
      <h2 className="section-title">Order Summary</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="cart-items">
        {items.map((item) => (
          <div key={item.sku} className="cart-item">
            <div className="item-image">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} />
              ) : (
                <div className="image-placeholder"></div>
              )}
            </div>
            <div className="item-details">
              <h3 className="item-name">{item.name}</h3>
              <p className="item-sku">SKU: {item.sku}</p>
              <p className="item-price">
                ${Number(item.price).toFixed(2)}
                <button
                  className="modify-price-btn"
                  onClick={() => handlePriceOverride(item.sku, item.price)}
                >
                  Modify
                </button>
              </p>
            </div>
            <div className="item-quantity">
              <button
                className="qty-btn"
                onClick={() => updateQuantity(item.sku, item.quantity - 1)}
              >
                -
              </button>
              <span>{item.quantity}</span>
              <button
                className="qty-btn"
                onClick={() => updateQuantity(item.sku, item.quantity + 1)}
              >
                +
              </button>
            </div>
            <div className="item-total">
              <p className="item-line-total">${(Number(item.price) * item.quantity).toFixed(2)}</p>
            </div>
            <button
              className="remove-btn"
              onClick={() => removeItem(item.sku)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Promo Code Section */}
      <div className="promo-code-section">
        <input
          type="text"
          placeholder="Enter promo code"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          disabled={promoApplied}
        />
        <button
          onClick={handleApplyPromo}
          disabled={promoApplied || !promoCode.trim()}
        >
          {promoApplied ? 'Applied!' : 'Apply'}
        </button>
      </div>

      {/* Loyalty Points Section */}
      {selectedCustomer && customerPoints >= 100 && (
        <div className="loyalty-points-section">
          <div className="loyalty-header">
            <span className="loyalty-title">Loyalty Points</span>
            <span className="loyalty-available">{customerPoints} pts available (${maxPointsDiscount} max)</span>
          </div>
          <div className="loyalty-redeem">
            <label className="loyalty-checkbox">
              <input
                type="checkbox"
                checked={usePoints}
                onChange={(e) => {
                  setUsePoints(e.target.checked);
                  if (e.target.checked) {
                    setPointsToRedeem(Math.min(100, maxRedeemable));
                  } else {
                    setPointsToRedeem(0);
                  }
                }}
              />
              <span>Use loyalty points</span>
            </label>
            {usePoints && (
              <div className="points-selector">
                <label>Points to redeem:</label>
                <select
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(parseInt(e.target.value, 10))}
                >
                  {Array.from({ length: Math.floor(customerPoints / 100) }, (_, i) => (i + 1) * 100).map(pts => (
                    <option key={pts} value={pts}>{pts} pts = ${(pts / 100) * 10} off</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Info Section */}
      <div className="customer-info-form">
        <h3>Customer Information</h3>
        <div className="form-row">
          <input
            type="text"
            placeholder="Customer Name *"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <input
            type="tel"
            placeholder="Phone Number"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
          <span className="or-text">or</span>
          <input
            type="email"
            placeholder="Email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
        </div>
        {!isCustomerValid && (
          <p className="validation-hint">* Name and either phone or email required</p>
        )}
      </div>

      {/* Cart Summary */}
      <div className="cart-summary">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {promoApplied && (
          <div className="summary-row discount">
            <span>Promo ({promoDiscount}%)</span>
            <span>-${promoDiscountAmount.toFixed(2)}</span>
          </div>
        )}
        {usePoints && pointsToRedeem > 0 && (
          <div className="summary-row discount">
            <span>Points ({pointsToRedeem} pts)</span>
            <span>-${pointsDiscountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="summary-row">
          <span>Tax (5%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="summary-row total">
          <span>Total</span>
          <span>${finalTotal.toFixed(2)}</span>
        </div>
        <button
          className="checkout-btn"
          onClick={handleProcessPayment}
          disabled={processing || !isCustomerValid}
        >
          Process Payment
        </button>
      </div>

      {/* Price Override Modal */}
      {showPriceModal && (
        <div className="modal-overlay">
          <div className="price-override-modal">
            <h3>Manager Authorization Required</h3>
            <p>Enter manager credentials to modify price</p>

            {priceOverrideError && (
              <div className="modal-error">{priceOverrideError}</div>
            )}

            <div className="modal-form">
              <input
                type="text"
                placeholder="New Price"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
              <input
                type="email"
                placeholder="Manager Email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Manager Password"
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowPriceModal(false)}>Cancel</button>
              <button onClick={handleConfirmPriceOverride}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessSale;

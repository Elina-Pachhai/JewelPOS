import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../../contexts/CartContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CustomerLookup = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { selectedCustomer, setCustomer } = useCart();

  // Purchase history state
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Action menu state
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [viewReceiptModal, setViewReceiptModal] = useState(null);
  const [refundReceipt, setRefundReceipt] = useState(null);
  const [emailModal, setEmailModal] = useState({ show: false, sale: null, email: '' });
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer?.customer_id) {
      fetchPurchaseHistory(selectedCustomer.customer_id);
    } else {
      setPurchaseHistory([]);
    }
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/customers`);
      setCustomers(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseHistory = async (customerId) => {
    try {
      setHistoryLoading(true);
      const response = await axios.get(`${API_URL}/sales/customer/${customerId}`);
      setPurchaseHistory(response.data);
    } catch (err) {
      console.error('Error fetching purchase history:', err);
      setPurchaseHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    setCustomer({
      customer_id: customer.customer_id,
      name: `${customer.first_name} ${customer.last_name}`,
      email: customer.email,
      phone: customer.phone_number,
      loyalty_points: customer.loyalty_points || 0
    });
    setSelectedReceipt(null);
  };

  const filteredCustomers = customers.filter(customer => {
    const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return (
      fullName.includes(search) ||
      customer.email?.toLowerCase().includes(search) ||
      customer.phone_number?.includes(search)
    );
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Action menu handlers
  const toggleActionMenu = (saleId, e) => {
    e.stopPropagation();
    if (openActionMenu === saleId) {
      setOpenActionMenu(null);
    } else {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const menuHeight = 180; // Approximate menu height
      const spaceBelow = window.innerHeight - rect.bottom;

      // Position menu above if not enough space below
      const top = spaceBelow < menuHeight ? rect.top - menuHeight : rect.bottom + 5;
      const left = rect.left - 140; // Position to the left of button

      setMenuPosition({ top, left: Math.max(10, left) });
      setOpenActionMenu(saleId);
    }
  };

  const handleViewReceipt = (sale, e) => {
    e.stopPropagation();
    setViewReceiptModal(sale);
    setOpenActionMenu(null);
  };

  const handleRefund = async (sale, e) => {
    e.stopPropagation();
    if (sale.status === 'Refunded') {
      alert('This sale has already been refunded.');
      setOpenActionMenu(null);
      return;
    }

    const confirmRefund = window.confirm(
      `Are you sure you want to refund Order #${sale.sale_id} for $${Number(sale.total_amount).toFixed(2)}?\n\nThis will restore stock for all items.`
    );

    if (!confirmRefund) {
      setOpenActionMenu(null);
      return;
    }

    setRefundLoading(true);
    setOpenActionMenu(null);

    try {
      const response = await axios.post(`${API_URL}/sales/${sale.sale_id}/refund`);
      setRefundReceipt({
        ...response.data,
        first_name: selectedCustomer?.name?.split(' ')[0] || '',
        last_name: selectedCustomer?.name?.split(' ').slice(1).join(' ') || '',
        email: selectedCustomer?.email
      });
      // Refresh purchase history
      if (selectedCustomer?.customer_id) {
        fetchPurchaseHistory(selectedCustomer.customer_id);
      }
    } catch (err) {
      console.error('Error processing refund:', err);
      alert(err.response?.data?.error || 'Failed to process refund. Please try again.');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleEmailReceipt = (sale, e) => {
    e.stopPropagation();
    setEmailModal({
      show: true,
      sale: sale,
      email: selectedCustomer?.email || ''
    });
    setOpenActionMenu(null);
  };

  const handleSendEmail = () => {
    alert(`Receipt sent to: ${emailModal.email}\n\nOrder #${emailModal.sale.sale_id} - $${Number(emailModal.sale.total_amount).toFixed(2)}`);
    setEmailModal({ show: false, sale: null, email: '' });
  };

  const handlePrintReceipt = (sale, e) => {
    e.stopPropagation();
    setViewReceiptModal(sale);
    setOpenActionMenu(null);
    setTimeout(() => window.print(), 100);
  };

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenu(null);
    if (openActionMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openActionMenu]);

  if (loading) {
    return <div className="customer-lookup"><p>Loading customers...</p></div>;
  }

  return (
    <div className="customer-lookup">
      <h2 className="section-title">Search Customers</h2>

      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {selectedCustomer && (
        <div className="selected-customer">
          <span>Selected: {selectedCustomer.name}</span>
          <span className="loyalty-badge">{selectedCustomer.loyalty_points || 0} points</span>
          <button onClick={() => setCustomer(null)}>Clear</button>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="customer-table">
        <div className="table-header">
          <span className="col-name">Customer Name</span>
          <span className="col-phone">Phone Number</span>
          <span className="col-email">Email</span>
          <span className="col-points">Loyalty Points</span>
        </div>

        {filteredCustomers.map((customer) => (
          <div
            key={customer.customer_id}
            className={`table-row ${selectedCustomer?.customer_id === customer.customer_id ? 'selected' : ''}`}
            onClick={() => handleSelectCustomer(customer)}
          >
            <span className="col-name">{customer.first_name} {customer.last_name}</span>
            <span className="col-phone">{customer.phone_number}</span>
            <span className="col-email">{customer.email}</span>
            <span className="col-points">{customer.loyalty_points || 0} pts</span>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && !loading && (
        <div className="no-results">No customers found</div>
      )}

      {/* Purchase History Section */}
      {selectedCustomer && (
        <div className="purchase-history">
          <h3>Purchase History</h3>

          {historyLoading ? (
            <p>Loading purchase history...</p>
          ) : purchaseHistory.length === 0 ? (
            <p className="no-history">No purchase history for this customer</p>
          ) : (
            <div className="history-list">
              {purchaseHistory.map((sale) => (
                <div
                  key={sale.sale_id}
                  className={`history-item ${selectedReceipt?.sale_id === sale.sale_id ? 'expanded' : ''}`}
                  onClick={() => setSelectedReceipt(selectedReceipt?.sale_id === sale.sale_id ? null : sale)}
                >
                  <div className="history-summary">
                    <span className="history-date">{formatDate(sale.sale_date)}</span>
                    <span className={`history-status status-${sale.status?.toLowerCase() || 'paid'}`}>
                      {sale.status || 'Paid'}
                    </span>
                    <span className="history-total">${Number(sale.total_amount).toFixed(2)}</span>
                    <div className="history-actions">
                      <div className="action-menu-container">
                        <button
                          className="action-icon"
                          onClick={(e) => toggleActionMenu(sale.sale_id, e)}
                        >
                          ⋯
                        </button>
                      </div>
                      <span className="history-toggle">{selectedReceipt?.sale_id === sale.sale_id ? '▼' : '▶'}</span>
                    </div>
                  </div>

                  {selectedReceipt?.sale_id === sale.sale_id && (
                    <div className="history-details">
                      <div className="receipt-mini">
                        <div className="receipt-mini-header">
                          <strong>Receipt #{sale.sale_id}</strong>
                          {sale.status === 'Refunded' && <span className="refund-badge-mini">REFUNDED</span>}
                        </div>
                        <div className="receipt-mini-items">
                          {sale.items?.filter(item => item.sku).map((item, idx) => (
                            <div key={idx} className="receipt-mini-item">
                              <span>{item.name}</span>
                              <span>x{item.quantity}</span>
                              <span>${Number(item.price_at_sale).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="receipt-mini-total">
                          <strong>Total: ${Number(sale.total_amount).toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Dropdown - Fixed Position */}
      {openActionMenu && (
        <div
          className="action-dropdown"
          style={{ top: menuPosition.top, left: menuPosition.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const sale = purchaseHistory.find(s => s.sale_id === openActionMenu);
            if (!sale) return null;
            return (
              <>
                <button onClick={(e) => handleViewReceipt(sale, e)}>View Receipt</button>
                <button onClick={(e) => handleRefund(sale, e)}>Refund/Return</button>
                <button onClick={(e) => handleEmailReceipt(sale, e)}>Email Receipt</button>
                <button onClick={(e) => handlePrintReceipt(sale, e)}>Print Receipt</button>
              </>
            );
          })()}
        </div>
      )}

      {/* View Receipt Modal */}
      {viewReceiptModal && (
        <div className="modal-overlay" onClick={() => setViewReceiptModal(null)}>
          <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setViewReceiptModal(null)}>×</button>
            <div className="receipt-paper">
              <div className="receipt-header">
                <h1 className="receipt-logo">Jewel</h1>
                <p className="receipt-operator">Order #{viewReceiptModal.sale_id}</p>
              </div>

              <div className="receipt-info">
                <p>Date: {formatDate(viewReceiptModal.sale_date)}</p>
                {viewReceiptModal.status === 'Refunded' && <p className="refund-badge">REFUNDED</p>}
              </div>

              <div className="receipt-items">
                <div className="receipt-table-header">
                  <span>Item</span>
                  <span>Price</span>
                  <span>Qty</span>
                  <span>Total</span>
                </div>
                {viewReceiptModal.items?.filter(item => item.sku).map((item, index) => (
                  <div key={index} className="receipt-item-row">
                    <span className="item-name">{item.name || item.sku}</span>
                    <span>${Number(item.price_at_sale).toFixed(2)}</span>
                    <span>{item.quantity}</span>
                    <span>${(Number(item.price_at_sale) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="receipt-totals">
                <div className="receipt-line total">
                  <span>Total</span>
                  <span>${Number(viewReceiptModal.total_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="receipt-customer">
                <p>Customer: {selectedCustomer?.name || 'Guest'}</p>
              </div>

              <div className="receipt-barcode">
                <div className="barcode-lines"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Receipt Modal */}
      {refundReceipt && (
        <div className="modal-overlay" onClick={() => setRefundReceipt(null)}>
          <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setRefundReceipt(null)}>×</button>
            <div className="receipt-paper refund-receipt">
              <div className="receipt-header">
                <h1 className="receipt-logo">Jewel</h1>
                <p className="refund-badge">REFUND</p>
                <p className="receipt-operator">Order #{refundReceipt.sale_id}</p>
              </div>

              <div className="receipt-info">
                <p>Original Date: {formatDate(refundReceipt.sale_date)}</p>
                <p>Refund Date: {new Date().toLocaleDateString()}</p>
              </div>

              <div className="receipt-items">
                <div className="receipt-table-header">
                  <span>Item</span>
                  <span>Price</span>
                  <span>Qty</span>
                  <span>Total</span>
                </div>
                {refundReceipt.items?.map((item, index) => (
                  <div key={index} className="receipt-item-row">
                    <span className="item-name">{item.name || item.sku}</span>
                    <span>${Number(item.price_at_sale).toFixed(2)}</span>
                    <span>{item.quantity}</span>
                    <span>${(Number(item.price_at_sale) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="receipt-totals">
                <div className="receipt-line total refund-total">
                  <span>Refund Total</span>
                  <span>-${Number(refundReceipt.total_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="receipt-customer">
                <p>Customer: {selectedCustomer?.name || 'Guest'}</p>
              </div>

              <div className="receipt-footer">
                <p>Stock has been restored</p>
              </div>

              <div className="receipt-barcode">
                <div className="barcode-lines"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Receipt Modal */}
      {emailModal.show && (
        <div className="modal-overlay" onClick={() => setEmailModal({ show: false, sale: null, email: '' })}>
          <div className="email-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setEmailModal({ show: false, sale: null, email: '' })}>×</button>
            <h2>Email Receipt</h2>
            <p className="email-order-info">Order #{emailModal.sale?.sale_id} - ${Number(emailModal.sale?.total_amount || 0).toFixed(2)}</p>

            <div className="email-input-group">
              <label htmlFor="email-input">Email Address:</label>
              <input
                id="email-input"
                type="email"
                value={emailModal.email}
                onChange={(e) => setEmailModal({ ...emailModal, email: e.target.value })}
                placeholder="Enter email address"
                className="email-input"
              />
            </div>

            <div className="email-modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => setEmailModal({ show: false, sale: null, email: '' })}
              >
                Cancel
              </button>
              <button
                className="send-btn"
                onClick={handleSendEmail}
                disabled={!emailModal.email}
              >
                Send Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for refund */}
      {refundLoading && (
        <div className="modal-overlay">
          <div className="loading-modal">
            <p>Processing refund...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerLookup;

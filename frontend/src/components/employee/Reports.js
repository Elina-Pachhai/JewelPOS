import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Reports = ({ onViewCustomer }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [refundReceipt, setRefundReceipt] = useState(null);
  const [emailModal, setEmailModal] = useState({ show: false, sale: null, email: '' });
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/sales`);
      setSales(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  // Filter sales for today only
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySales = sales.filter(sale => {
    const saleDate = new Date(sale.sale_date);
    saleDate.setHours(0, 0, 0, 0);
    return saleDate.getTime() === today.getTime();
  });

  // Calculate today's totals (exclude refunded sales)
  const paidTodaySales = todaySales.filter(sale => sale.status !== 'Refunded');
  const totalSalesToday = paidTodaySales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
  const totalOrdersToday = paidTodaySales.length;

  const toggleActionMenu = (saleId, event) => {
    if (openActionMenu === saleId) {
      setOpenActionMenu(null);
    } else {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const menuHeight = 200; // Approximate menu height
      const spaceBelow = window.innerHeight - rect.bottom;

      // Position menu above if not enough space below
      const top = spaceBelow < menuHeight ? rect.top - menuHeight : rect.bottom + 5;
      const left = rect.left - 140; // Position to the left of button

      setMenuPosition({ top, left: Math.max(10, left) });
      setOpenActionMenu(saleId);
    }
  };

  const handleViewReceipt = (sale) => {
    setSelectedReceipt(sale);
    setOpenActionMenu(null);
  };

  const handleRefund = async (sale) => {
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
      // Store the refund receipt with customer info
      setRefundReceipt({
        ...response.data,
        first_name: sale.first_name,
        last_name: sale.last_name,
        email: sale.email
      });
      // Refresh sales list to show updated status
      fetchSales();
    } catch (err) {
      console.error('Error processing refund:', err);
      alert(err.response?.data?.error || 'Failed to process refund. Please try again.');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleEmailReceipt = (sale) => {
    setEmailModal({
      show: true,
      sale: sale,
      email: sale.email || ''
    });
    setOpenActionMenu(null);
  };

  const handleSendEmail = () => {
    // Demo only - simulate sending email
    alert(`Receipt sent to: ${emailModal.email}\n\nOrder #${emailModal.sale.sale_id} - $${Number(emailModal.sale.total_amount).toFixed(2)}`);
    setEmailModal({ show: false, sale: null, email: '' });
  };

  const handlePrintReceipt = (sale) => {
    setSelectedReceipt(sale);
    setOpenActionMenu(null);
    setTimeout(() => window.print(), 100);
  };

  const handleViewCustomer = (sale) => {
    if (sale.customer_id && onViewCustomer) {
      onViewCustomer(sale.customer_id);
    } else {
      alert('Guest customer - no profile available');
    }
    setOpenActionMenu(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenu(null);
    if (openActionMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openActionMenu]);

  return (
    <div className="reports-view">
      <div className="stats-cards">
        <div className="stat-card">
          <h3>Today's Sales</h3>
          <p className="stat-value green">${totalSalesToday.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Today's Orders</h3>
          <p className="stat-value">{totalOrdersToday}</p>
        </div>
      </div>

      <div className="recent-orders">
        <h3>Recent Order</h3>

        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : sales.length === 0 ? (
          <div className="no-orders">
            <p>No recent orders</p>
          </div>
        ) : (
          <div className="orders-table">
            <div className="table-header reports-header">
              <span className="col-order">Order #</span>
              <span className="col-date">Date</span>
              <span className="col-sku">Product SKU</span>
              <span className="col-customer">Customer</span>
              <span className="col-amount">Total Amount</span>
              <span className="col-status">Status</span>
              <span className="col-action">Action</span>
            </div>

            {sales.map((sale) => (
              <div key={sale.sale_id} className="table-row reports-row">
                <span className="col-order">{sale.sale_id}</span>
                <span className="col-date">{new Date(sale.sale_date).toLocaleDateString()}</span>
                <span className="col-sku">{sale.items?.map(i => i.sku).join(', ') || '-'}</span>
                <span className="col-customer">
                  {sale.first_name || sale.last_name
                    ? `${sale.first_name || ''} ${sale.last_name || ''}`.trim()
                    : 'Guest'}
                </span>
                <span className="col-amount">${Number(sale.total_amount).toFixed(2)}</span>
                <span className={`col-status status-${sale.status?.toLowerCase() || 'paid'}`}>
                  {sale.status || 'Paid'}
                </span>
                <span className="col-action">
                  <div className="action-menu-container">
                    <button
                      className="action-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActionMenu(sale.sale_id, e);
                      }}
                    >
                      ⋯
                    </button>
                  </div>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Dropdown - Fixed Position */}
      {openActionMenu && (
        <div
          className="action-dropdown"
          style={{ top: menuPosition.top, left: menuPosition.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const sale = sales.find(s => s.sale_id === openActionMenu);
            if (!sale) return null;
            return (
              <>
                <button onClick={() => handleViewReceipt(sale)}>View Receipt</button>
                <button onClick={() => handleRefund(sale)}>Refund/Return</button>
                <button onClick={() => handleEmailReceipt(sale)}>Email Receipt</button>
                <button onClick={() => handlePrintReceipt(sale)}>Print Receipt</button>
                <button onClick={() => handleViewCustomer(sale)}>View Customer</button>
              </>
            );
          })()}
        </div>
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedReceipt(null)}>×</button>
            <div className="receipt-paper">
              <div className="receipt-header">
                <h1 className="receipt-logo">Jewel</h1>
                <p className="receipt-operator">Order #{selectedReceipt.sale_id}</p>
              </div>

              <div className="receipt-info">
                <p>Date: {new Date(selectedReceipt.sale_date).toLocaleDateString()}</p>
              </div>

              <div className="receipt-items">
                <div className="receipt-table-header">
                  <span>Item</span>
                  <span>Price</span>
                  <span>Qty</span>
                  <span>Total</span>
                </div>
                {selectedReceipt.items?.map((item, index) => (
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
                  <span>${Number(selectedReceipt.total_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="receipt-customer">
                <p>Customer: {selectedReceipt.first_name || selectedReceipt.last_name
                  ? `${selectedReceipt.first_name || ''} ${selectedReceipt.last_name || ''}`.trim()
                  : 'Guest'}</p>
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
                <p>Original Date: {new Date(refundReceipt.sale_date).toLocaleDateString()}</p>
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
                <p>Customer: {refundReceipt.first_name || refundReceipt.last_name
                  ? `${refundReceipt.first_name || ''} ${refundReceipt.last_name || ''}`.trim()
                  : 'Guest'}</p>
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

export default Reports;

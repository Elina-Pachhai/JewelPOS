import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const InventoryView = ({ onContinueToCart }) => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const { addItem } = useCart();
  const { user } = useAuth();

  // Stock edit modal state
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newStockQuantity, setNewStockQuantity] = useState('');
  const [stockError, setStockError] = useState('');
  const [updating, setUpdating] = useState(false);

  // Action menu state
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Add product modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    image_url: ''
  });
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const canEdit = user?.role === 'Manager' || user?.role === 'Inventory';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/products`);
      setProducts(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxToggle = (product) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(item => item.sku === product.sku);
      if (isSelected) {
        return prev.filter(item => item.sku !== product.sku);
      } else {
        return [...prev, product];
      }
    });
  };

  const handleContinueToCart = () => {
    selectedItems.forEach(product => {
      addItem({
        sku: product.sku,
        name: product.name,
        price: product.price,
        image_url: product.image_url
      });
    });
    setSelectedItems([]);
    if (onContinueToCart) {
      onContinueToCart();
    }
  };

  const toggleActionMenu = (sku, event) => {
    if (openActionMenu === sku) {
      setOpenActionMenu(null);
    } else {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const menuHeight = 100; // Approximate menu height
      const spaceBelow = window.innerHeight - rect.bottom;

      // Position menu above if not enough space below
      const top = spaceBelow < menuHeight ? rect.top - menuHeight : rect.bottom + 5;
      const left = rect.left - 140; // Position to the left of button

      setMenuPosition({ top, left: Math.max(10, left) });
      setOpenActionMenu(sku);
    }
  };

  const handleEditStock = (product) => {
    setEditingProduct(product);
    setNewStockQuantity(product.stock_quantity.toString());
    setStockError('');
    setShowStockModal(true);
    setOpenActionMenu(null);
  };

  const handleDeleteProduct = async (product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        await axios.delete(`${API_URL}/products/${product.sku}`);
        setProducts(prev => prev.filter(p => p.sku !== product.sku));
      } catch (err) {
        console.error('Error deleting product:', err);
        setError('Failed to delete product');
      }
    }
    setOpenActionMenu(null);
  };

  const incrementStock = () => {
    setNewStockQuantity(prev => String(parseInt(prev, 10) + 1));
  };

  const decrementStock = () => {
    setNewStockQuantity(prev => {
      const current = parseInt(prev, 10);
      return String(current > 0 ? current - 1 : 0);
    });
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenu(null);
    if (openActionMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openActionMenu]);

  const handleUpdateStock = async () => {
    const quantity = parseInt(newStockQuantity, 10);
    if (isNaN(quantity) || quantity < 0) {
      setStockError('Please enter a valid quantity (0 or greater)');
      return;
    }

    setUpdating(true);
    try {
      await axios.put(`${API_URL}/products/${editingProduct.sku}`, {
        stock_quantity: quantity
      });

      // Update local state
      setProducts(prev => prev.map(p =>
        p.sku === editingProduct.sku
          ? { ...p, stock_quantity: quantity }
          : p
      ));

      setShowStockModal(false);
      setEditingProduct(null);
    } catch (err) {
      console.error('Error updating stock:', err);
      setStockError('Failed to update stock');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddProduct = async () => {
    // Validate required fields
    if (!newProduct.sku || !newProduct.name || !newProduct.price) {
      setAddError('SKU, Name, and Price are required');
      return;
    }

    const price = parseFloat(newProduct.price);
    if (isNaN(price) || price < 0) {
      setAddError('Please enter a valid price');
      return;
    }

    const stockQty = parseInt(newProduct.stock_quantity, 10) || 0;

    setAdding(true);
    setAddError('');

    try {
      const response = await axios.post(`${API_URL}/products`, {
        sku: newProduct.sku,
        name: newProduct.name,
        description: newProduct.description || null,
        price: price,
        stock_quantity: stockQty,
        image_url: newProduct.image_url || null
      });

      // Add to local state
      setProducts(prev => [...prev, response.data]);

      // Reset form and close modal
      setNewProduct({
        sku: '',
        name: '',
        description: '',
        price: '',
        stock_quantity: '',
        image_url: ''
      });
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding product:', err);
      setAddError(err.response?.data?.error || 'Failed to add product');
    } finally {
      setAdding(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="inventory-view"><p>Loading products...</p></div>;
  }

  return (
    <div className="inventory-view">
      <div className="inventory-header">

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search for the item"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="inventory-actions">
          {canEdit && (
            <button className="add-item-btn" onClick={() => setShowAddModal(true)}>Add Item +</button>
          )}
        </div>
        
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="product-table">
        <div className="table-header">
          <span className="col-checkbox"></span>
          <span className="col-id">No ID</span>
          <span className="col-product">Product</span>
          <span className="col-sku">SKU</span>
          <span className="col-location">Location</span>
          <span className="col-price">Price</span>
          <span className="col-stock">Stock</span>
          <span className="col-action">Action</span>
        </div>

        {filteredProducts.map((product, index) => (
          <div
            key={product.sku}
            className={`table-row ${selectedItems.some(item => item.sku === product.sku) ? 'selected' : ''}`}
            onClick={() => handleCheckboxToggle(product)}
            style={{ cursor: 'pointer' }}
          >
            <span className="col-checkbox" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedItems.some(item => item.sku === product.sku)}
                onChange={() => handleCheckboxToggle(product)}
              />
            </span>
            <span className="col-id">{index + 1}</span>
            <span className="col-product">
              <div className="product-cell">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="product-thumb" />
                ) : (
                  <div className="product-thumb placeholder"></div>
                )}
                <span>{product.name}</span>
              </div>
            </span>
            <span className="col-sku">{product.sku}</span>
            <span className="col-location">J1</span>
            <span className="col-price">${Number(product.price).toFixed(2)}</span>
            <span className="col-stock">{product.stock_quantity}</span>
            <span className="col-action">
              <div className="action-menu-container">
                <button
                  className="action-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActionMenu(product.sku, e);
                  }}
                >
                  ⋯
                </button>
              </div>
            </span>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && !loading && (
        <div className="no-results">No products found</div>
      )}

      {/* Action Dropdown - Fixed Position */}
      {openActionMenu && (
        <div
          className="action-dropdown"
          style={{ top: menuPosition.top, left: menuPosition.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const product = products.find(p => p.sku === openActionMenu);
            if (!product) return null;
            return (
              <>
                <button onClick={() => handleEditStock(product)}>Update Stock</button>
                {canEdit && (
                  <button onClick={() => handleDeleteProduct(product)} className="danger">Delete Product</button>
                )}
              </>
            );
          })()}
        </div>
      )}

      {selectedItems.length > 0 && (
        <div className="continue-to-cart-container">
          <button className="continue-to-cart-btn" onClick={handleContinueToCart}>
            Continue to Cart ({selectedItems.length} item{selectedItems.length > 1 ? 's' : ''})
          </button>
        </div>
      )}

      {/* Stock Edit Modal */}
      {showStockModal && editingProduct && (
        <div className="modal-overlay">
          <div className="stock-edit-modal">
            <h3>Update Stock</h3>
            <p className="modal-product-name">{editingProduct.name}</p>
            <p className="modal-product-sku">SKU: {editingProduct.sku}</p>

            {stockError && (
              <div className="modal-error">{stockError}</div>
            )}

            <div className="stock-input-container">
              <label>Stock:</label>
              <div className="stock-controls">
                <button
                  className="stock-btn decrement"
                  onClick={decrementStock}
                  disabled={parseInt(newStockQuantity, 10) <= 0}
                >
                  -1
                </button>
                <input
                  type="number"
                  min="0"
                  value={newStockQuantity}
                  onChange={(e) => setNewStockQuantity(e.target.value)}
                  className="stock-input"
                />
                <button
                  className="stock-btn increment"
                  onClick={incrementStock}
                >
                  +1
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowStockModal(false)} disabled={updating}>
                Cancel
              </button>
              <button onClick={handleUpdateStock} disabled={updating}>
                {updating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="add-product-modal">
            <h3>Add New Product</h3>

            {addError && (
              <div className="modal-error">{addError}</div>
            )}

            <div className="form-group">
              <label>SKU *</label>
              <input
                type="text"
                value={newProduct.sku}
                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                placeholder="e.g., RING-001"
              />
            </div>

            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="e.g., Diamond Ring"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                placeholder="Product description..."
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Price *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={newProduct.stock_quantity}
                  onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Image URL</label>
              <input
                type="text"
                value={newProduct.image_url}
                onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => {
                setShowAddModal(false);
                setAddError('');
                setNewProduct({
                  sku: '',
                  name: '',
                  description: '',
                  price: '',
                  stock_quantity: '',
                  image_url: ''
                });
              }} disabled={adding}>
                Cancel
              </button>
              <button onClick={handleAddProduct} disabled={adding} className="primary">
                {adding ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryView;

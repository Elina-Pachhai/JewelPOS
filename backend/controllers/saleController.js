const saleService = require('../services/saleService');

module.exports = {
  // GET /sales
  async getAllSales(req, res) {
    try {
      const sales = await saleService.getAllSales();
      res.json(sales);
    } catch (err) {
      console.error('Error in getAllSales:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // POST /sales
  async createSale(req, res) {
    try {
      const { user_id, customer_id, items, points_redeemed } = req.body;

      if (!user_id || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: 'user_id and a non-empty items array are required.',
        });
      }

      const sale = await saleService.createSale({
        user_id,
        customer_id: customer_id || null,
        items,
        points_redeemed: points_redeemed || 0,
      });

      res.status(201).json(sale);
    } catch (err) {
      console.error('Error in createSale:', err);

      // Custom error handling
      if (err.type === 'INSUFFICIENT_STOCK') {
        return res.status(400).json({ error: err.message });
      }
      if (err.type === 'PRODUCT_NOT_FOUND') {
        return res.status(400).json({ error: err.message });
      }
      if (err.type === 'INSUFFICIENT_POINTS') {
        return res.status(400).json({ error: err.message });
      }
      if (err.type === 'CUSTOMER_NOT_FOUND') {
        return res.status(400).json({ error: err.message });
      }

      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // GET /sales/customer/:customerId
  async getSalesByCustomerId(req, res) {
    try {
      const customerId = parseInt(req.params.customerId, 10);
      if (Number.isNaN(customerId)) {
        return res.status(400).json({ error: 'Customer ID must be a number.' });
      }

      const sales = await saleService.getSalesByCustomerId(customerId);
      res.json(sales);
    } catch (err) {
      console.error('Error in getSalesByCustomerId:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // GET /sales/:id
  async getSaleById(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Sale ID must be a number.' });
      }

      const sale = await saleService.getSaleById(id);
      if (!sale) {
        return res.status(404).json({ error: 'Sale not found.' });
      }

      res.json(sale);
    } catch (err) {
      console.error('Error in getSaleById:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // POST /sales/:id/refund
  async refundSale(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Sale ID must be a number.' });
      }

      const refundedSale = await saleService.refundSale(id);
      res.json(refundedSale);
    } catch (err) {
      console.error('Error in refundSale:', err);

      if (err.type === 'SALE_NOT_FOUND') {
        return res.status(404).json({ error: err.message });
      }
      if (err.type === 'ALREADY_REFUNDED') {
        return res.status(400).json({ error: err.message });
      }

      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

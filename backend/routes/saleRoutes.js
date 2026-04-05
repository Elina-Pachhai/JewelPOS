const express = require('express');
const saleController = require('../controllers/saleController');

const router = express.Router();

// Get all sales
router.get('/', saleController.getAllSales);

// Create a sale
router.post('/', saleController.createSale);

// Get sales by customer ID
router.get('/customer/:customerId', saleController.getSalesByCustomerId);

// Get a sale by ID (with items)
router.get('/:id', saleController.getSaleById);

// Refund a sale
router.post('/:id/refund', saleController.refundSale);

module.exports = router;
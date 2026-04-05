const express = require('express');
const productController = require('../controllers/productController');

const router = express.Router();

// GET all products
router.get('/', productController.getAllProducts);

// GET product by SKU
router.get('/:sku', productController.getProductBySku);

// Create a product
router.post('/', productController.createProduct);

// Update a product
router.put('/:sku', productController.updateProduct);

// Delete a product
router.delete('/:sku', productController.deleteProduct);

module.exports = router;
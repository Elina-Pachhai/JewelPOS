const express = require('express');
const customersController = require('../controllers/customersController');

const router = express.Router();

// GET all customers
router.get('/', customersController.getAllCustomers);

// GET one customer by ID
router.get('/:id', customersController.getCustomerById);

// Create a new customer
router.post('/', customersController.createCustomer);

// Update a customer
router.put('/:id', customersController.updateCustomer);

module.exports = router;

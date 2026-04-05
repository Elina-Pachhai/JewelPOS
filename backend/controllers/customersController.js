const customersService = require('../services/customersService');

module.exports = {
  // GET /customers
  async getAllCustomers(req, res) {
    try {
      const customers = await customersService.getAllCustomers();
      res.json(customers);
    } catch (err) {
      console.error('Error in getAllCustomers:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // GET /customers/:id
  async getCustomerById(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Customer ID must be a number.' });
      }

      const customer = await customersService.getCustomerById(id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found.' });
      }

      res.json(customer);
    } catch (err) {
      console.error('Error in getCustomerById:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // POST /customers
  async createCustomer(req, res) {
    try {
      const { first_name, last_name, email, phone_number } = req.body;

      // Basic validation
      if (!first_name && !last_name) {
        return res
          .status(400)
          .json({ error: 'At least first_name or last_name is required.' });
      }

      const customer = await customersService.createCustomer({
        first_name,
        last_name,
        email,
        phone_number,
      });

      res.status(201).json(customer);
    } catch (err) {
      console.error('Error in createCustomer:', err);

      // Handle unique email violation
      if (err.code === '23505') {
        // unique_violation
        return res
          .status(400)
          .json({ error: 'A customer with that email already exists.' });
      }

      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // PUT /customers/:id
  async updateCustomer(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Customer ID must be a number.' });
      }

      const updates = req.body;
      const updated = await customersService.updateCustomer(id, updates);

      if (!updated) {
        return res.status(404).json({ error: 'Customer not found.' });
      }

      res.json(updated);
    } catch (err) {
      console.error('Error in updateCustomer:', err);

      if (err.code === '23505') {
        return res
          .status(400)
          .json({ error: 'A customer with that email already exists.' });
      }

      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

const pool = require('../db');

module.exports = {
  async getAllCustomers() {
    const result = await pool.query(
      `SELECT customer_id, first_name, last_name, email, phone_number, loyalty_points
       FROM customers
       ORDER BY customer_id ASC`
    );
    return result.rows;
  },

  async getCustomerById(id) {
    const result = await pool.query(
      `SELECT customer_id, first_name, last_name, email, phone_number, loyalty_points
       FROM customers
       WHERE customer_id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async createCustomer({ first_name, last_name, email, phone_number }) {
    const result = await pool.query(
      `INSERT INTO customers (first_name, last_name, email, phone_number)
       VALUES ($1, $2, $3, $4)
       RETURNING customer_id, first_name, last_name, email, phone_number, loyalty_points`,
      [first_name, last_name, email, phone_number]
    );
    return result.rows[0];
  },

  async updateCustomer(id, updates) {
    const fields = [];
    const values = [];
    let index = 1;

    for (const key in updates) {
      // Prevent updating primary key
      if (key === 'customer_id') continue;

      fields.push(`${key} = $${index}`);
      values.push(updates[key]);
      index++;
    }

    if (fields.length === 0) {
      // Nothing to update
      return this.getCustomerById(id);
    }

    values.push(id);

    const query = `
      UPDATE customers
      SET ${fields.join(', ')}
      WHERE customer_id = $${index}
      RETURNING customer_id, first_name, last_name, email, phone_number, loyalty_points
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },
};

const pool = require('../db');

module.exports = {
  // Get all sales with customer info and items
  async getAllSales() {
    const salesRes = await pool.query(`
      SELECT s.*,
             c.first_name, c.last_name,
             json_agg(json_build_object(
               'sku', si.sku,
               'quantity', si.quantity,
               'price_at_sale', si.price_at_sale,
               'name', p.name
             )) as items
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.customer_id
      LEFT JOIN sale_items si ON s.sale_id = si.sale_id
      LEFT JOIN products p ON si.sku = p.sku
      GROUP BY s.sale_id, c.first_name, c.last_name
      ORDER BY s.sale_date DESC
    `);
    return salesRes.rows;
  },

  // Creates a sale + sale_items + updates stock + handles loyalty points
  async createSale({ user_id, customer_id, items, points_redeemed = 0 }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let total = 0;
      let pointsDiscount = 0;

      // If redeeming points, verify customer has enough
      if (points_redeemed > 0 && customer_id) {
        const customerRes = await client.query(
          'SELECT loyalty_points FROM customers WHERE customer_id = $1 FOR UPDATE',
          [customer_id]
        );

        if (customerRes.rows.length === 0) {
          throw { type: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' };
        }

        const availablePoints = customerRes.rows[0].loyalty_points;
        if (availablePoints < points_redeemed) {
          throw { type: 'INSUFFICIENT_POINTS', message: `Not enough loyalty points. Available: ${availablePoints}, requested: ${points_redeemed}` };
        }

        // Calculate discount from points (100 points = $10)
        pointsDiscount = Math.floor(points_redeemed / 100) * 10;
      }

      // First pass: validate items, compute total, update stock
      for (const item of items) {
        const { sku, quantity } = item;

        // Lock the product row so concurrent sales can't mess stock
        const productRes = await client.query(
          'SELECT price, stock_quantity FROM products WHERE sku = $1 FOR UPDATE',
          [sku]
        );
        // Check product exists
        if (productRes.rows.length === 0) {
          throw {
            type: 'PRODUCT_NOT_FOUND',
            message: `Product with SKU ${sku} not found`,
          };
        }
        // Get product availability and price
        const product = productRes.rows[0];

        if (product.stock_quantity < quantity) {
          throw {
            type: 'INSUFFICIENT_STOCK',
            message: `Not enough stock for product ${sku}. Available: ${product.stock_quantity}, requested: ${quantity}`,
          };
        }

        const price = Number(product.price); // product.price is decimal in Postgres (string)
        total += price * quantity;

        // Decrease stock
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE sku = $2',
          [quantity, sku]
        );

        // Attach price we used so we can reuse it when inserting sale_items
        item.price_at_sale = price;
      }

      // Apply points discount (cannot exceed total)
      const finalTotal = Math.max(0, total - pointsDiscount);

      // Insert into sales
      const saleRes = await client.query(
        `INSERT INTO sales (user_id, customer_id, total_amount)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [user_id, customer_id, finalTotal.toFixed(2)]
      );

      const sale = saleRes.rows[0];

      // Insert line items
      for (const item of items) {
        const { sku, quantity, price_at_sale } = item;

        await client.query(
          `INSERT INTO sale_items (sale_id, sku, quantity, price_at_sale)
           VALUES ($1, $2, $3, $4)`,
          [sale.sale_id, sku, quantity, price_at_sale.toFixed(2)]
        );
      }

      // Handle loyalty points if customer exists
      let pointsEarned = 0;
      if (customer_id) {
        // Deduct redeemed points
        if (points_redeemed > 0) {
          await client.query(
            'UPDATE customers SET loyalty_points = loyalty_points - $1 WHERE customer_id = $2',
            [points_redeemed, customer_id]
          );
        }

        // Award new points (1 point per dollar spent on final amount)
        pointsEarned = Math.floor(finalTotal);
        if (pointsEarned > 0) {
          await client.query(
            'UPDATE customers SET loyalty_points = loyalty_points + $1 WHERE customer_id = $2',
            [pointsEarned, customer_id]
          );
        }
      }

      await client.query('COMMIT');

      // Return sale + items + points info
      return {
        ...sale,
        items: items.map(({ price_at_sale, ...rest }) => ({
          ...rest,
          price_at_sale: price_at_sale.toFixed(2),
        })),
        points_redeemed: points_redeemed,
        points_discount: pointsDiscount,
        points_earned: pointsEarned,
        subtotal: total.toFixed(2),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Returns all sales for a customer
  async getSalesByCustomerId(customerId) {
    const salesRes = await pool.query(
      `SELECT s.*,
              json_agg(json_build_object(
                'sku', si.sku,
                'quantity', si.quantity,
                'price_at_sale', si.price_at_sale,
                'name', p.name
              )) as items
       FROM sales s
       LEFT JOIN sale_items si ON s.sale_id = si.sale_id
       LEFT JOIN products p ON si.sku = p.sku
       WHERE s.customer_id = $1
       GROUP BY s.sale_id
       ORDER BY s.sale_date DESC`,
      [customerId]
    );

    return salesRes.rows;
  },

  // Returns sale info + items
  async getSaleById(id) {
    // Get the sale row
    const saleRes = await pool.query(
      'SELECT * FROM sales WHERE sale_id = $1',
      [id]
    );

    if (saleRes.rows.length === 0) {
      return null;
    }

    const sale = saleRes.rows[0];

    // Get its items
    const itemsRes = await pool.query(
      `SELECT si.sku, si.quantity, si.price_at_sale, p.name
       FROM sale_items si
       JOIN products p ON p.sku = si.sku
       WHERE si.sale_id = $1`,
      [id]
    );

    return {
      ...sale,
      items: itemsRes.rows,
    };
  },

  // Refund a sale - restores stock and marks as refunded
  async refundSale(id) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get the sale
      const saleRes = await client.query(
        'SELECT * FROM sales WHERE sale_id = $1 FOR UPDATE',
        [id]
      );

      if (saleRes.rows.length === 0) {
        throw { type: 'SALE_NOT_FOUND', message: 'Sale not found' };
      }

      const sale = saleRes.rows[0];

      if (sale.status === 'Refunded') {
        throw { type: 'ALREADY_REFUNDED', message: 'This sale has already been refunded' };
      }

      // Get sale items
      const itemsRes = await client.query(
        `SELECT si.sku, si.quantity, si.price_at_sale, p.name
         FROM sale_items si
         JOIN products p ON p.sku = si.sku
         WHERE si.sale_id = $1`,
        [id]
      );

      // Restore stock for each item
      for (const item of itemsRes.rows) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE sku = $2',
          [item.quantity, item.sku]
        );
      }

      // Update sale status to Refunded
      const updatedSaleRes = await client.query(
        `UPDATE sales SET status = 'Refunded' WHERE sale_id = $1 RETURNING *`,
        [id]
      );

      await client.query('COMMIT');

      return {
        ...updatedSaleRes.rows[0],
        items: itemsRes.rows,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

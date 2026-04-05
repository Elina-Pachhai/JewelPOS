const pool = require('../db');

module.exports = {

    async getAllProducts() {
        const result = await pool.query("SELECT * FROM products ORDER BY sku ASC");
        return result.rows;
    },

    async getProductBySku(sku) {
        const result = await pool.query("SELECT * FROM products WHERE sku = $1", [sku]);
        return result.rows[0];
    },

    async createProduct(product) {
        const { sku, name, description, price, stock_quantity, image_url } = product;

        const result = await pool.query(
            `INSERT INTO products (sku, name, description, price, stock_quantity, image_url)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [sku, name, description, price, stock_quantity, image_url]
        );

        return result.rows[0];
    },

    async updateProduct(sku, updates) {
        const fields = [];
        const values = [];
        let index = 1;

        for (const key in updates) {
            fields.push(`${key} = $${index}`);
            values.push(updates[key]);
            index++;
        }

        values.push(sku); // last param for WHERE clause

        const query = `
            UPDATE products
            SET ${fields.join(", ")}
            WHERE sku = $${index}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    async deleteProduct(sku) {
        const result = await pool.query(
            "DELETE FROM products WHERE sku = $1 RETURNING *",
            [sku]
        );
        return result.rows[0];
    }

};

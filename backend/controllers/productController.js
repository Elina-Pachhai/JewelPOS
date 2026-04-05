const productService = require('../services/productService');

module.exports = {
    
    // GET /products
    async getAllProducts(req, res) {
        try {
            const products = await productService.getAllProducts();
            res.json(products);
        } catch (err) {
            console.error("Error in getAllProducts:", err);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },

    // GET /products/:sku
    async getProductBySku(req, res) {
        try {
            const sku = req.params.sku;
            const product = await productService.getProductBySku(sku);

            if (!product) {
                return res.status(404).json({ error: "Product not found" });
            }

            res.json(product);
        } catch (err) {
            console.error("Error in getProductBySku:", err);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },

    // POST /products
    async createProduct(req, res) {
        try {
            const { sku, name, description, price, stock_quantity, image_url } = req.body;

            if (!sku || !name || !price) {
                return res.status(400).json({ error: "SKU, name, and price are required." });
            }

            const newProduct = await productService.createProduct({
                sku,
                name,
                description,
                price,
                stock_quantity,
                image_url
            });

            res.status(201).json(newProduct);
        } catch (err) {
            console.error("Error in createProduct:", err);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },

    // PUT /products/:sku
    async updateProduct(req, res) {
        try {
            const sku = req.params.sku;
            const updates = req.body; 

            const updatedProduct = await productService.updateProduct(sku, updates);

            if (!updatedProduct) {
                return res.status(404).json({ error: "Product not found" });
            }

            res.json(updatedProduct);
        } catch (err) {
            console.error("Error in updateProduct:", err);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },

    // DELETE /products/:sku
    async deleteProduct(req, res) {
        try {
            const sku = req.params.sku;

            const deleted = await productService.deleteProduct(sku);

            if (!deleted) {
                return res.status(404).json({ error: "Product not found" });
            }

            res.json({ message: "Product deleted successfully" });

        } catch (err) {
            console.error("Error in deleteProduct:", err);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
};

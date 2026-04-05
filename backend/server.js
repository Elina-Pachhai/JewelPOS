// backend/server.js
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const saleRoutes = require('./routes/saleRoutes');
const customersRoutes = require('./routes/customersRoutes');
const pool = require('./db');

const app = express();
const port = process.env.PORT || 5000;

// Middleware to parse json bodies
app.use(express.json());


// Allow frontend -> backend calls from any origin
app.use(cors());


// Test DB connection on startup
(async () => {
  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL from backend");
    client.release();
  } catch (err) {
    console.error("Error connecting to PostgreSQL: ", err);
  }
})();

app.get('/', (req, res) => {
  res.send('Hello from the Group 11 Backend API!');
});

// Authentication routes (use router)
app.use('/auth', authRoutes);

// Product routes
app.use('/products', productRoutes);

// Sale routes
app.use('/sales', saleRoutes);

// Customers routes
app.use('/customers', customersRoutes);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
-- Drop tables if they exist to start fresh
DROP TABLE IF EXISTS sale_items;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;

-- 1. Users (Employees, Managers, Inventory Staff)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- in real apps, store hashes not plain text
    role VARCHAR(20) NOT NULL CHECK (role IN ('Manager', 'Employee', 'Inventory')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products (Jewelry Inventory)
CREATE TABLE products (
    sku VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    image_url VARCHAR(255)
);

-- 3. Customers
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100) UNIQUE,
    phone_number VARCHAR(20),
    loyalty_points INT DEFAULT 0
);

-- 4. Sales Transactions
CREATE TABLE sales (
    sale_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),      -- who sold it
    customer_id INT REFERENCES customers(customer_id), -- who bought it (optional)
    total_amount DECIMAL(10, 2) NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Paid' CHECK (status IN ('Paid', 'Refunded'))
);

-- 5. Sale Items (Links Sales to Products)
CREATE TABLE sale_items (
    sale_item_id SERIAL PRIMARY KEY,
    sale_id INT REFERENCES sales(sale_id) ON DELETE CASCADE,
    sku VARCHAR(50) REFERENCES products(sku),
    quantity INT NOT NULL,
    price_at_sale DECIMAL(10, 2) NOT NULL
);
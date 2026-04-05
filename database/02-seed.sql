-- Insert Dummy Users
INSERT INTO users (username, password_hash, role) VALUES 
('ali_manager', 'password123', 'Manager'),
('rico_cashier', 'password123', 'Employee'),
('daniel_stock', 'password123', 'Inventory');

-- Insert Dummy Products
INSERT INTO products (sku, name, price, stock_quantity, description) VALUES 
('JW-100', 'Diamond Ring', 1200.00, 5, '18k Gold Diamond Ring'),
('JW-101', 'Silver Necklace', 150.00, 20, 'Sterling Silver Chain'),
('JW-102', 'Gold Watch', 500.00, 8, 'Classic Gold Watch');

-- Insert Dummy Customer
INSERT INTO customers (first_name, last_name, email, phone_number) VALUES 
('Elina', 'Pachhai', 'elinapachhai@gmail.com', '403-123-1234');
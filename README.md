[README.md](https://github.com/user-attachments/files/26486267/README.md)
# JewelPOS - Point of Sale System for Jewelry Retailers

A modern, elegant point-of-sale system built specifically for jewelry retailers. JewelPOS streamlines store operations from inventory management to customer loyalty programs.

---

## Quick Start (For TAs/Markers)

### Prerequisites
- Docker and Docker Compose installed

### Password Strategy & Environment Setup

**Password Strategy:** We use a `.env` file to manage database credentials, keeping sensitive passwords out of the repository and Docker configuration files.

Create a `.env` file in the root directory with the following content:

```
POSTGRES_USER=myuser
POSTGRES_PASSWORD=group11secretpassword
POSTGRES_DB=pos_db
```

This approach ensures:
- Passwords are not committed to version control
- Easy credential rotation without modifying Docker files
- Separation of configuration from code

### Setup & Run

1. **Clone the repository** and navigate to the project folder

2. **Create the `.env` file** (see Password Strategy above)

3. **Start the application:**
   ```bash
   docker compose up --build -d
   ```

4. **Access the application:**
   - Frontend: http://localhost
   - Backend API: http://localhost:5000

5. **To reset data** (clear all transactions, restore seed data):
   ```bash
   docker compose down -v
   ```
   ```bash
   docker compose up --build -d
   ```

---

## Login Credentials

All login credentials are defined in `database/02-seed.sql`:

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| **Manager** | `elina_manager` | `password123` | Full access, no auth popups required |
| **Cashier** | `rico_cashier` | `password123` | POS, Customers, Inventory (needs manager auth for price changes and stock updates) |
| **Inventory** | `daniel_stock` | `password123` | Inventory only (needs manager auth for stock updates) |

---

## Test Data

### Products (in `database/02-seed.sql`)
| SKU | Name | Price | Stock |
|-----|------|-------|-------|
| JW-100 | Diamond Ring | $1,200.00 | 5 |
| JW-101 | Silver Necklace | $150.00 | 20 |
| JW-102 | Gold Watch | $500.00 | 8 |

### Test Customer
- **Name:** Elina Pachhai
- **Email:** elinapachhai@gmail.com
- **Phone:** 403-123-1234
- **Loyalty Points:** 1500

### Promo Codes
| Code | Discount |
|------|----------|
| `SAVE10` | 10% off |
| `SAVE20` | 20% off |

---

## Features to Demo

### 1. Role-Based Access Control
- Login as each role to see different access levels
- Manager: sees all tabs, no authentication popups
- Cashier: sees most tabs, needs manager auth for price overrides and stock updates
- Inventory: only sees Inventory tab, no "Add to Cart" button

### 2. Login Security
- Try wrong password -> shows "Invalid credentials" error
- Try wrong manager credentials in popup → shows error

### 3. Process Sale
- Add items to cart from Inventory tab
- Apply promo codes (SAVE10, SAVE20)
- Verify customer to use loyalty points
- Customer info validation (name + phone/email required)
- NFC payment animation
- Branded receipt with Jewel. logo

### 4. Manager Authentication
- As Cashier: try to modify price -> manager popup appears
- As Inventory: try to update stock -> manager popup appears
- As Manager: no popup needed

### 5. Customer Lookup
- Search customers by name, email, or phone
- View purchase history
- Process refunds from history

### 6. Refunds
- Full refund: refund entire order
- Partial refund: select specific items to refund
- Stock automatically restored on refund

### 7. Reports (Manager Only)
- Today's sales total
- Today's orders count
- Transaction history

---

## Tech Stack

- **Frontend:** React.js
- **Backend:** Node.js / Express
- **Database:** PostgreSQL
- **Deployment:** Docker Compose

---

## Project Structure

```
seng513-project/
├── frontend/           # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js
│   │   │   ├── employee/
│   │   │   │   ├── ProcessSale.js
│   │   │   │   ├── CustomerLookup.js
│   │   │   │   ├── Inventory.js
│   │   │   │   └── Reports.js
│   │   │   └── shared/
│   │   └── contexts/
│   └── Dockerfile
├── backend/            # Express API
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   └── Dockerfile
├── database/           # SQL scripts
│   ├── 01-schema.sql   # Table definitions
│   ├── 02-seed.sql     # Test data & credentials
│   ├── 03-add-loyalty.sql
│   ├── 04-add-partial-refunds.sql
│   └── 05-add-discount-columns.sql
├── docker-compose.yml
├── .env                # Database credentials
└── README.md
```

---

## Git Tags

| Tag | Description |
|-----|-------------|
| `Release-1.0` | Final release |
| `project-docker-milestone` | Docker setup complete |
| `project-schema-milestone` | Database schema complete |
| `project-milestone-front-end` | Frontend implementation complete |

---

## Troubleshooting

**App not loading?**
```bash
docker compose logs -f
```

**Need fresh data?**
```bash
docker compose down -v
```
```bash
docker compose up --build -d
```

**Port 80 in use?**
- Edit `docker-compose.yml` to change `"80:80"` to `"3000:80"`
- Access at http://localhost:3000

---

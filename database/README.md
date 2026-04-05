# MyStorePOS - Database Schema & Seeding Instructions

**SENG 513: Group 11**

This README outlines the database schema design for MyStorePOS and provides instructions on how to run the automated seeding scripts using Docker.

## Database Scripts
The SQL scripts located in the `./database` directory define the structure and initial data for the application:

* **`01-schema.sql`**: Initializes the five core tables:
    * `users`: Stores employee/manager credentials and roles.
    * `customers`: Stores customer contact info and loyalty points.
    * `products`: Stores inventory items (SKU, price, stock).
    * `sales`: Stores transaction records.
    * `sale_items`: Links products to sales records.
* **`02-seed.sql`**: Populates the tables with dummy data (test users, products, and a customer) for development testing.

---

## How to Run the Schema & Seeding Scripts:

The database setup is fully automated via Docker Compose. The PostgreSQL container is configured to execute any scripts in the `./database` folder upon its **first initialization**.

### Prerequisites
* Docker Desktop must be running.
* Git installed.

### Step 1: Configure Environment Variables
To maintain security, database passwords are not stored in the repository. You must create a local environment file to configure the database container.

1.  Create a file named `.env` in the **root** directory of the project.
2.  Paste the following configuration into it:

```env
POSTGRES_USER=myuser
POSTGRES_PASSWORD=group11secretpassword
POSTGRES_DB=pos_db
```

### Step 2: Reset the Database Volume (IMPORTANT)
If you have run this project previously, an old database volume exists. The seeding scripts **will not run** on an existing database. You must clear the old volume to force a re-initialization.

Run the following command in your terminal:

```bash
docker-compose down --volumes
```

### Step 3: Build and Run
Run the following command to start the application and initialize the database:

```bash
docker-compose up --build
```

### Step 4: Verify Success
Check your terminal logs. You should see messages indicating the scripts are running:
* `running /docker-entrypoint-initdb.d/01-schema.sql`
* `running /docker-entrypoint-initdb.d/02-seed.sql`

You can now access the database internally via the `db` service on port 5432.
-- SmartMarket Database Schema
-- SQLite Database Structure

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    cost_price REAL NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    location TEXT,
    phone TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ClientProductCoefficients table
CREATE TABLE IF NOT EXISTS client_product_coefficients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    coefficient REAL NOT NULL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(client_id, product_id)
);

-- ClientCategories table (which categories are visible to which client)
CREATE TABLE IF NOT EXISTS client_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(client_id, category_id)
);

-- Insert default categories
INSERT OR IGNORE INTO categories (name) VALUES 
    ('Сировина+колір. пасти'),
    ('Брукер Оптікс (БІЧ)'),
    ('Колірувальне обладнання'),
    ('Фільтри'),
    ('Брукер АХС'),
    ('Лабораторка'),
    ('Роботи/автоматизація'),
    ('Каталоги кольору');

-- Insert default admin user (password: admin123)
-- Password hash generated with bcrypt (salt rounds: 10)
INSERT OR IGNORE INTO clients (login, password, email) VALUES 
    ('admin', '$2a$10$NgBHoObgg8JIJxXO/TZa6e9lp0JbB0UIG8ZboEXw2L23CEhLGPoIK', 'admin@smartmarket.com');


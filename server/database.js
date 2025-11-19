const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'database.sqlite');

let db = null;

const init = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
      createTables().then(resolve).catch(reject);
    });
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Categories table
      db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )`, (err) => {
        if (err) {
          console.error('Error creating categories table:', err);
          reject(err);
          return;
        }
        
        // Insert default categories
        const categories = [
          'Сировина+колір. пасти',
          'Брукер Оптікс (БІЧ)',
          'Колірувальне обладнання',
          'Фільтри',
          'Брукер АХС',
          'Лабораторка',
          'Роботи/автоматизація'
        ];
        
        const stmt = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
        categories.forEach(cat => stmt.run(cat));
        stmt.finalize();
      });

      // Products table
      db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        cost_price REAL NOT NULL DEFAULT 0,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )`, (err) => {
        if (err) {
          console.error('Error creating products table:', err);
          reject(err);
        } else {
          // Add image_url column if it doesn't exist (for existing databases)
          db.run(`ALTER TABLE products ADD COLUMN image_url TEXT`, (alterErr) => {
            // Ignore error if column already exists
          });
        }
      });

      // Clients table
      db.run(`CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        location TEXT,
        phone TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating clients table:', err);
          reject(err);
        }
      });

      // ClientProductCoefficients table
      db.run(`CREATE TABLE IF NOT EXISTS client_product_coefficients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        coefficient REAL NOT NULL DEFAULT 1.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(client_id, product_id)
      )`, (err) => {
        if (err) {
          console.error('Error creating client_product_coefficients table:', err);
          reject(err);
        }
      });

      // ClientCategories table (which categories are visible to which client)
      db.run(`CREATE TABLE IF NOT EXISTS client_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE(client_id, category_id)
      )`, (err) => {
        if (err) {
          console.error('Error creating client_categories table:', err);
          reject(err);
        }
        
        // Create default admin user
        createDefaultAdmin().then(() => {
          console.log('Database initialized successfully');
          resolve();
        }).catch(reject);
      });
    });
  });
};

const createDefaultAdmin = async () => {
  return new Promise((resolve, reject) => {
    const adminLogin = 'admin';
    const adminPassword = 'admin123';
    
    bcrypt.hash(adminPassword, 10, (err, hash) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.run(`INSERT OR IGNORE INTO clients (login, password, email) VALUES (?, ?, ?)`,
        [adminLogin, hash, 'admin@smartmarket.com'],
        (err) => {
          if (err) {
            console.error('Error creating default admin:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  });
};

const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

module.exports = {
  init,
  getDb
};


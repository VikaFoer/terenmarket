const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// Use Railway volume path if available, otherwise use local path
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname);
const DB_PATH = path.join(DATA_DIR, 'database.sqlite');

// Old database path (before Volume was configured)
const OLD_DB_PATH = path.join(__dirname, 'database.sqlite');

// Log database path for debugging
console.log('=== Database Configuration ===');
console.log('DATA_DIR:', DATA_DIR);
console.log('DB_PATH:', DB_PATH);
console.log('OLD_DB_PATH:', OLD_DB_PATH);
console.log('DATA_DIR exists:', fs.existsSync(DATA_DIR));
console.log('DB_PATH exists:', fs.existsSync(DB_PATH));
console.log('OLD_DB_PATH exists:', fs.existsSync(OLD_DB_PATH));
console.log('=============================');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  console.log(`Creating DATA_DIR: ${DATA_DIR}`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`DATA_DIR created successfully`);
} else {
  console.log(`DATA_DIR already exists: ${DATA_DIR}`);
}

// Migrate database from old location to new location if needed
const migrateDatabase = () => {
  // Only migrate if new DB doesn't exist but old one does
  if (!fs.existsSync(DB_PATH) && fs.existsSync(OLD_DB_PATH)) {
    console.log('⚠️ Old database found, migrating to Volume location...');
    try {
      // Copy old database to new location
      fs.copyFileSync(OLD_DB_PATH, DB_PATH);
      console.log(`✅ Database migrated from ${OLD_DB_PATH} to ${DB_PATH}`);
      
      // Verify the copy
      if (fs.existsSync(DB_PATH)) {
        const oldStats = fs.statSync(OLD_DB_PATH);
        const newStats = fs.statSync(DB_PATH);
        console.log(`Old DB size: ${oldStats.size} bytes`);
        console.log(`New DB size: ${newStats.size} bytes`);
        
        if (newStats.size === oldStats.size && newStats.size > 0) {
          console.log('✅ Migration successful! Database copied correctly.');
          // Optionally backup old database
          const backupPath = path.join(__dirname, 'database.sqlite.backup');
          fs.copyFileSync(OLD_DB_PATH, backupPath);
          console.log(`Old database backed up to: ${backupPath}`);
        } else {
          console.error('❌ Migration failed: File sizes do not match');
        }
      }
    } catch (error) {
      console.error('❌ Error migrating database:', error);
      console.error('Will create new database instead');
    }
  } else if (fs.existsSync(DB_PATH)) {
    console.log('✅ Database already exists in Volume location');
  } else if (fs.existsSync(OLD_DB_PATH)) {
    console.log('⚠️ Old database exists but migration not needed (new DB will be created)');
  } else {
    console.log('ℹ️ No existing database found, will create new one');
  }
};

// Run migration before initialization
migrateDatabase();

let db = null;

const init = () => {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to open database at: ${DB_PATH}`);
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        console.error('Database path:', DB_PATH);
        reject(err);
        return;
      }
      console.log(`Connected to SQLite database at: ${DB_PATH}`);
      console.log(`Database file exists: ${fs.existsSync(DB_PATH)}`);
      createTables().then(resolve).catch(reject);
    });
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
    console.log('Starting table creation...');
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
        console.log('Categories table created/verified');
        
        // Insert default categories
        const categories = [
          'Хімічна сировина',
          'Коліранти',
          'Брукер Оптікс (БІЧ)',
          'Колірувальне обладнання',
          'Фільтри',
          'Брукер АХС',
          'Лабораторка',
          'Роботи/автоматизація',
          'Каталоги кольору'
        ];
        
        console.log('Inserting default categories...');
        const stmt = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
        categories.forEach(cat => {
          stmt.run(cat, (err) => {
            if (err) {
              console.error(`Error inserting category ${cat}:`, err);
            } else {
              console.log(`Category inserted: ${cat}`);
            }
          });
        });
        stmt.finalize((err) => {
          if (err) {
            console.error('Error finalizing categories statement:', err);
          } else {
            console.log('Categories insertion completed');
          }
        });
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
          console.log('Products table created/verified');
          // Add image_url column if it doesn't exist (for existing databases)
          db.run(`ALTER TABLE products ADD COLUMN image_url TEXT`, (alterErr) => {
            // Ignore error if column already exists
            if (alterErr && !alterErr.message.includes('duplicate column')) {
              console.error('Error adding image_url column:', alterErr);
            }
          });
        }
      });

      // Clients table
      db.run(`CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        company_name TEXT,
        location TEXT,
        phone TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating clients table:', err);
          reject(err);
        } else {
          console.log('Clients table created/verified');
          // Add company_name column if it doesn't exist (for existing databases)
          db.run(`ALTER TABLE clients ADD COLUMN company_name TEXT`, (alterErr) => {
            // Ignore error if column already exists
            if (alterErr && !alterErr.message.includes('duplicate column')) {
              console.error('Error adding company_name column:', alterErr);
            } else {
              console.log('company_name column added/verified');
            }
          });
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
        } else {
          console.log('ClientProductCoefficients table created/verified');
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
          return;
        }
        console.log('ClientCategories table created/verified');
        
        // CategoryManagers table (which manager is responsible for which category)
        db.run(`CREATE TABLE IF NOT EXISTS category_managers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL,
          manager_id TEXT NOT NULL,
          manager_name TEXT,
          manager_email TEXT,
          manager_phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
          UNIQUE(category_id, manager_id)
        )`, (err) => {
          if (err) {
            console.error('Error creating category_managers table:', err);
            reject(err);
            return;
          }
          console.log('CategoryManagers table created/verified');
          
          // Add manager_id column to clients table if it doesn't exist (for direct client-manager assignment)
          db.run(`ALTER TABLE clients ADD COLUMN manager_id TEXT`, (alterErr) => {
            // Ignore error if column already exists
            if (alterErr && !alterErr.message.includes('duplicate column')) {
              console.error('Error adding manager_id column to clients:', alterErr);
            } else {
              console.log('manager_id column added/verified to clients table');
            }
          });
          
          console.log('All tables created successfully');
          
          // Create default admin user
          console.log('Creating default admin user...');
          createDefaultAdmin().then(() => {
            console.log('Default admin user created successfully');
            console.log('Database initialized successfully');
            resolve();
          }).catch((adminErr) => {
            console.error('Error creating default admin:', adminErr);
            reject(adminErr);
          });
        });
      });
    });
  });
};

const createDefaultAdmin = async () => {
  return new Promise((resolve, reject) => {
    const adminLogin = 'admin';
    const adminPassword = 'admin123';
    
    console.log('Hashing admin password...');
    bcrypt.hash(adminPassword, 10, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        reject(err);
        return;
      }
      console.log('Password hashed, inserting admin user...');
      
      db.run(`INSERT OR IGNORE INTO clients (login, password, email) VALUES (?, ?, ?)`,
        [adminLogin, hash, 'admin@smartmarket.com'],
        function(err) {
          if (err) {
            console.error('Error creating default admin:', err);
            reject(err);
          } else {
            if (this.changes > 0) {
              console.log('Admin user created successfully');
            } else {
              console.log('Admin user already exists');
            }
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

const getDbInfo = () => {
  return {
    dataDir: DATA_DIR,
    dbPath: DB_PATH,
    dbExists: fs.existsSync(DB_PATH),
    dataDirExists: fs.existsSync(DATA_DIR),
    isInVolume: DATA_DIR === '/app/server/data'
  };
};

module.exports = {
  init,
  getDb,
  getDbInfo
};


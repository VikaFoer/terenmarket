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

// Warning if DATA_DIR is not set (using default path - data will be lost on redeploy)
if (!process.env.DATA_DIR) {
  console.warn('⚠️  WARNING: DATA_DIR environment variable is not set!');
  console.warn('⚠️  Database and uploaded files will be stored in ephemeral filesystem.');
  console.warn('⚠️  Data will be LOST after each deployment!');
  console.warn('⚠️  Please set up Railway Volume and configure DATA_DIR variable.');
  console.warn('⚠️  See RAILWAY_VOLUME_SETUP.md for instructions.');
} else {
  console.log('✅ DATA_DIR is set to:', process.env.DATA_DIR);
  console.log('✅ Data will persist across deployments (if Volume is configured correctly)');
}
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
        
        // Insert default categories ONLY if database is empty (first time initialization)
        db.get('SELECT COUNT(*) as count FROM categories', (err, result) => {
          if (err) {
            console.error('Error checking categories count:', err);
            // Continue anyway
            return;
          }
          
          // Only insert default categories if table is empty
          if (result.count === 0) {
            console.log('Database is empty, inserting default categories...');
            const categories = [
              'Хімічна сировина',
              'Колоранти',
              'Брукер Оптікс (БІЧ)',
              'Колірувальне обладнання',
              'Фільтри',
              'Брукер АХС',
              'Лабораторка',
              'Роботи/автоматизація',
              'Каталоги кольору'
            ];
            
            const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
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
                console.log('Default categories insertion completed');
              }
            });
          } else {
            console.log(`Database already has ${result.count} categories, skipping default insertion`);
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
          // Add unit column if it doesn't exist (for existing databases)
          db.run(`ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'шт'`, (alterErr) => {
            // Ignore error if column already exists
            if (alterErr && !alterErr.message.includes('duplicate column')) {
              console.error('Error adding unit column:', alterErr);
            } else {
              console.log('unit column added/verified');
            }
          });
          // Add price currency and separate EUR/UAH prices
          db.run(`ALTER TABLE products ADD COLUMN price_currency TEXT DEFAULT 'EUR'`, (alterErr) => {
            if (alterErr && !alterErr.message.includes('duplicate column')) {
              console.error('Error adding price_currency column:', alterErr);
            } else {
              console.log('price_currency column added/verified');
            }
          });
          db.run(`ALTER TABLE products ADD COLUMN cost_price_eur REAL`, (alterErr) => {
            if (alterErr && !alterErr.message.includes('duplicate column')) {
              console.error('Error adding cost_price_eur column:', alterErr);
            } else {
              console.log('cost_price_eur column added/verified');
            }
          });
          db.run(`ALTER TABLE products ADD COLUMN cost_price_uah REAL`, (alterErr) => {
            if (alterErr && !alterErr.message.includes('duplicate column')) {
              console.error('Error adding cost_price_uah column:', alterErr);
            } else {
              console.log('cost_price_uah column added/verified');
            }
          });
          // Add card_color column for SVG background color
          db.run(`ALTER TABLE products ADD COLUMN card_color TEXT`, (alterErr) => {
            if (alterErr && !alterErr.message.includes('duplicate column')) {
              console.error('Error adding card_color column:', alterErr);
            } else {
              console.log('card_color column added/verified');
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
          
          // Email subscriptions table (for QR page registrations)
          db.run(`CREATE TABLE IF NOT EXISTS email_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            category TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(email)
          )`, (err) => {
            if (err) {
              console.error('Error creating email_subscriptions table:', err);
            } else {
              console.log('EmailSubscriptions table created/verified');
            }
          });
          
          // Analytics tables
          db.run(`CREATE TABLE IF NOT EXISTS analytics_sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ended_at DATETIME,
            duration INTEGER,
            page_views INTEGER DEFAULT 0,
            device_type TEXT,
            browser TEXT,
            referrer TEXT,
            landing_page TEXT,
            exit_page TEXT,
            FOREIGN KEY (user_id) REFERENCES clients(id) ON DELETE SET NULL
          )`, (err) => {
            if (err) {
              console.error('Error creating analytics_sessions table:', err);
            } else {
              console.log('AnalyticsSessions table created/verified');
            }
          });
          
          db.run(`CREATE TABLE IF NOT EXISTS analytics_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            user_id INTEGER,
            event_type TEXT NOT NULL,
            event_name TEXT NOT NULL,
            page_path TEXT NOT NULL,
            page_title TEXT,
            category TEXT,
            action TEXT,
            label TEXT,
            value REAL,
            metadata TEXT,
            user_agent TEXT,
            ip_address TEXT,
            referrer TEXT,
            device_type TEXT,
            browser TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES analytics_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES clients(id) ON DELETE SET NULL
          )`, (err) => {
            if (err) {
              console.error('Error creating analytics_events table:', err);
            } else {
              console.log('AnalyticsEvents table created/verified');
              // Create indexes
              db.run(`CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id)`, () => {});
              db.run(`CREATE INDEX IF NOT EXISTS idx_events_user ON analytics_events(user_id)`, () => {});
              db.run(`CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type)`, () => {});
              db.run(`CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at)`, () => {});
              db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON analytics_sessions(user_id)`, () => {});
              db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_started ON analytics_sessions(started_at)`, () => {});
            }
          });
          
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


const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// Check if MySQL is configured
const USE_MYSQL = process.env.DB_TYPE === 'mysql' || (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME);

let db = null;
let dbType = null;

if (USE_MYSQL) {
  // MySQL configuration
  const mysql = require('mysql2/promise');
  
  const mysqlConfig = {
    host: process.env.DB_HOST || 'tecsa.mysql.ukraine.com.ua',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'tecsa_marketdatabase',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'tecsa_marketdatabase',
    charset: 'utf8mb4',
    timezone: '+00:00',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  console.log('=== MySQL Database Configuration ===');
  console.log('Host:', mysqlConfig.host);
  console.log('Port:', mysqlConfig.port);
  console.log('Database:', mysqlConfig.database);
  console.log('User:', mysqlConfig.user);
  console.log('===================================');

  // Create MySQL connection pool
  const pool = mysql.createPool(mysqlConfig);

  // MySQL adapter to match SQLite API
  class MySQLAdapter {
    constructor(pool) {
      this.pool = pool;
    }

    // Convert SQLite syntax to MySQL
    convertSQL(sql) {
      // Replace SQLite-specific syntax with MySQL equivalents
      let mysqlSQL = sql
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'INT AUTO_INCREMENT PRIMARY KEY')
        .replace(/INTEGER PRIMARY KEY/gi, 'INT PRIMARY KEY')
        .replace(/INTEGER/gi, 'INT')
        .replace(/TEXT/gi, 'TEXT')
        .replace(/REAL/gi, 'DOUBLE')
        .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
        .replace(/INSERT OR IGNORE/gi, 'INSERT IGNORE')
        .replace(/INSERT OR REPLACE/gi, 'REPLACE')
        // Convert ON CONFLICT to MySQL's ON DUPLICATE KEY UPDATE
        .replace(/ON CONFLICT\s*\(([^)]+)\)\s*DO UPDATE SET\s*([^;]+)/gi, (match, columns, updates) => {
          // For MySQL, we need to use ON DUPLICATE KEY UPDATE
          // This assumes the conflict is on a UNIQUE constraint
          return `ON DUPLICATE KEY UPDATE ${updates}`;
        })
        .replace(/GROUP_CONCAT\(([^)]+)\)/gi, (match, p1) => {
          // MySQL GROUP_CONCAT needs SEPARATOR
          if (!match.includes('SEPARATOR')) {
            return `GROUP_CONCAT(${p1} SEPARATOR ',')`;
          }
          return match;
        });

      // Handle CREATE TABLE IF NOT EXISTS (MySQL supports this)
      // Handle CREATE INDEX IF NOT EXISTS (MySQL 5.7+ supports this)
      return mysqlSQL;
    }

    // Execute query (like db.run)
    run(sql, params, callback) {
      const mysqlSQL = this.convertSQL(sql);
      const self = this;
      
      this.pool.execute(mysqlSQL, params || [])
        .then(([result]) => {
          if (callback) {
            // Create a mock 'this' object that matches SQLite's behavior
            const mockThis = {
              lastID: result.insertId || 0,
              changes: result.affectedRows || 0
            };
            // Call callback with error as first param, and mockThis as 'this'
            callback.call(mockThis, null);
          }
        })
        .catch((err) => {
          if (callback) callback(err);
        });
    }

    // Get single row (like db.get)
    get(sql, params, callback) {
      const mysqlSQL = this.convertSQL(sql);
      
      this.pool.execute(mysqlSQL, params || [])
        .then(([rows]) => {
          callback(null, rows[0] || null);
        })
        .catch((err) => {
          callback(err);
        });
    }

    // Get all rows (like db.all)
    all(sql, params, callback) {
      const mysqlSQL = this.convertSQL(sql);
      
      this.pool.execute(mysqlSQL, params || [])
        .then(([rows]) => {
          callback(null, rows || []);
        })
        .catch((err) => {
          callback(err);
        });
    }

    // Prepare statement (like db.prepare)
    prepare(sql) {
      const mysqlSQL = this.convertSQL(sql);
      const self = this;
      
      return {
        run: (params, callback) => {
          self.pool.execute(mysqlSQL, params || [])
            .then(([result]) => {
              if (callback) {
                // Create a mock 'this' object that matches SQLite's behavior
                const mockThis = {
                  lastID: result.insertId || 0,
                  changes: result.affectedRows || 0
                };
                // Call callback with error as first param, and mockThis as 'this'
                callback.call(mockThis, null);
              }
            })
            .catch((err) => {
              if (callback) callback(err);
            });
        },
        finalize: (callback) => {
          if (callback) callback(null);
        }
      };
    }

    // Serialize (for MySQL, we don't need this, but keep for compatibility)
    serialize(callback) {
      if (callback) callback();
    }

    // Close connection
    close(callback) {
      this.pool.end()
        .then(() => {
          if (callback) callback(null);
        })
        .catch((err) => {
          if (callback) callback(err);
        });
    }
  }

  db = new MySQLAdapter(pool);
  dbType = 'mysql';

  const init = async () => {
    try {
      // Test connection
      const connection = await pool.getConnection();
      console.log('✅ Connected to MySQL database');
      connection.release();
      
      await createTables();
      console.log('✅ Database initialized successfully');
    } catch (err) {
      console.error('❌ Error connecting to MySQL:', err);
      throw err;
    }
  };

  const createTables = async () => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Categories table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('Categories table created/verified');

      // Check if categories table is empty
      const [categoryRows] = await connection.execute('SELECT COUNT(*) as count FROM categories');
      if (categoryRows[0].count === 0) {
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
        
        const stmt = await connection.prepare('INSERT INTO categories (name) VALUES (?)');
        for (const cat of categories) {
          await stmt.execute([cat]);
          console.log(`Category inserted: ${cat}`);
        }
        await stmt.close();
      }

      // Products table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name TEXT NOT NULL,
          category_id INT NOT NULL,
          cost_price DOUBLE NOT NULL DEFAULT 0,
          image_url TEXT,
          unit VARCHAR(10) DEFAULT 'шт',
          price_currency VARCHAR(10) DEFAULT 'EUR',
          cost_price_eur DOUBLE,
          cost_price_uah DOUBLE,
          card_color VARCHAR(50),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('Products table created/verified');

      // Add columns if they don't exist (MySQL doesn't support IF NOT EXISTS for ALTER TABLE)
      try {
        await connection.execute('ALTER TABLE products ADD COLUMN image_url TEXT');
      } catch (e) {
        if (!e.message.includes('Duplicate column')) console.log('image_url column already exists');
      }
      try {
        await connection.execute(`ALTER TABLE products ADD COLUMN unit VARCHAR(10) DEFAULT 'шт'`);
      } catch (e) {
        if (!e.message.includes('Duplicate column')) console.log('unit column already exists');
      }
      try {
        await connection.execute(`ALTER TABLE products ADD COLUMN price_currency VARCHAR(10) DEFAULT 'EUR'`);
      } catch (e) {
        if (!e.message.includes('Duplicate column')) console.log('price_currency column already exists');
      }
      try {
        await connection.execute('ALTER TABLE products ADD COLUMN cost_price_eur DOUBLE');
      } catch (e) {
        if (!e.message.includes('Duplicate column')) console.log('cost_price_eur column already exists');
      }
      try {
        await connection.execute('ALTER TABLE products ADD COLUMN cost_price_uah DOUBLE');
      } catch (e) {
        if (!e.message.includes('Duplicate column')) console.log('cost_price_uah column already exists');
      }
      try {
        await connection.execute('ALTER TABLE products ADD COLUMN card_color VARCHAR(50)');
      } catch (e) {
        if (!e.message.includes('Duplicate column')) console.log('card_color column already exists');
      }

      // Clients table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS clients (
          id INT AUTO_INCREMENT PRIMARY KEY,
          login VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          company_name VARCHAR(255),
          location VARCHAR(255),
          phone VARCHAR(50),
          email VARCHAR(255),
          manager_id VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('Clients table created/verified');

      try {
        await connection.execute('ALTER TABLE clients ADD COLUMN company_name VARCHAR(255)');
      } catch (e) {
        if (!e.message.includes('Duplicate column')) console.log('company_name column already exists');
      }
      try {
        await connection.execute('ALTER TABLE clients ADD COLUMN manager_id VARCHAR(255)');
      } catch (e) {
        if (!e.message.includes('Duplicate column')) console.log('manager_id column already exists');
      }

      // ClientProductCoefficients table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS client_product_coefficients (
          id INT AUTO_INCREMENT PRIMARY KEY,
          client_id INT NOT NULL,
          product_id INT NOT NULL,
          coefficient DOUBLE NOT NULL DEFAULT 1.0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          UNIQUE KEY unique_client_product (client_id, product_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('ClientProductCoefficients table created/verified');

      // ClientCategories table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS client_categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          client_id INT NOT NULL,
          category_id INT NOT NULL,
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
          UNIQUE KEY unique_client_category (client_id, category_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('ClientCategories table created/verified');

      // CategoryManagers table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS category_managers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category_id INT NOT NULL,
          manager_id VARCHAR(255) NOT NULL,
          manager_name VARCHAR(255),
          manager_email VARCHAR(255),
          manager_phone VARCHAR(50),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
          UNIQUE KEY unique_category_manager (category_id, manager_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('CategoryManagers table created/verified');

      // Email subscriptions table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS email_subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          category VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('EmailSubscriptions table created/verified');

      // QR page categories table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS qr_page_categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          qr_page_url VARCHAR(255) NOT NULL,
          category_id INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
          UNIQUE KEY unique_qr_category (qr_page_url, category_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('QRPageCategories table created/verified');

      // Insert default QR mappings if table is empty
      const [qrRows] = await connection.execute('SELECT COUNT(*) as count FROM qr_page_categories');
      if (qrRows[0].count === 0) {
        console.log('QR page categories table is empty. Inserting default mappings...');
        const [categories] = await connection.execute('SELECT id, name FROM categories');
        const categoryMap = {};
        categories.forEach(cat => {
          categoryMap[cat.name] = cat.id;
        });

        const defaultMappings = [
          ['colorant', 'Колоранти'],
          ['mix', 'Колірувальне обладнання'],
          ['bruker-o', 'Брукер Оптікс (БІЧ)'],
          ['axs', 'Брукер АХС'],
          ['filter', 'Фільтри'],
          ['lab', 'Лабораторка']
        ];

        const stmt = await connection.prepare('INSERT INTO qr_page_categories (qr_page_url, category_id) VALUES (?, ?)');
        for (const [url, categoryName] of defaultMappings) {
          const categoryId = categoryMap[categoryName];
          if (categoryId) {
            try {
              await stmt.execute([url, categoryId]);
              console.log(`QR mapping inserted: ${url} -> ${categoryName}`);
            } catch (err) {
              console.error(`Error inserting QR mapping ${url} -> ${categoryName}:`, err.message);
            }
          }
        }
        await stmt.close();
      }

      // Analytics tables
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS analytics_sessions (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          ended_at DATETIME,
          duration INT,
          page_views INT DEFAULT 0,
          device_type VARCHAR(50),
          browser VARCHAR(255),
          referrer TEXT,
          landing_page VARCHAR(255),
          exit_page VARCHAR(255),
          FOREIGN KEY (user_id) REFERENCES clients(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('AnalyticsSessions table created/verified');

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          session_id VARCHAR(255) NOT NULL,
          user_id INT,
          event_type VARCHAR(50) NOT NULL,
          event_name VARCHAR(255) NOT NULL,
          page_path VARCHAR(500) NOT NULL,
          page_title VARCHAR(255),
          category VARCHAR(255),
          action VARCHAR(255),
          label VARCHAR(255),
          value DOUBLE,
          metadata TEXT,
          user_agent TEXT,
          ip_address VARCHAR(50),
          referrer TEXT,
          device_type VARCHAR(50),
          browser VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES analytics_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES clients(id) ON DELETE SET NULL,
          INDEX idx_events_session (session_id),
          INDEX idx_events_user (user_id),
          INDEX idx_events_type (event_type),
          INDEX idx_events_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('AnalyticsEvents table created/verified');

      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON analytics_sessions(user_id)
      `);
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_sessions_started ON analytics_sessions(started_at)
      `);

      await connection.commit();
      
      // Create default admin user
      await createDefaultAdmin();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  };

  const createDefaultAdmin = async () => {
    const adminLogin = 'admin';
    const adminPassword = 'admin123';
    
    console.log('Creating default admin user...');
    const hash = await bcrypt.hash(adminPassword, 10);
    
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'INSERT IGNORE INTO clients (login, password, email) VALUES (?, ?, ?)',
        [adminLogin, hash, 'admin@smartmarket.com']
      );
      console.log('Admin user created/verified');
    } catch (err) {
      console.error('Error creating default admin:', err);
    } finally {
      connection.release();
    }
  };

  const getDb = () => {
    if (!db) {
      throw new Error('Database not initialized');
    }
    return db;
  };

  const getDbInfo = () => {
    return {
      type: 'mysql',
      host: mysqlConfig.host,
      database: mysqlConfig.database,
      user: mysqlConfig.user
    };
  };

  module.exports = {
    init,
    getDb,
    getDbInfo
  };

} else {
  // SQLite configuration (fallback)
  const sqlite3 = require('sqlite3').verbose();
  
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname);
  const DB_PATH = path.join(DATA_DIR, 'database.sqlite');
  const OLD_DB_PATH = path.join(__dirname, 'database.sqlite');

  console.log('=== SQLite Database Configuration ===');
  console.log('DATA_DIR:', DATA_DIR);
  console.log('DB_PATH:', DB_PATH);
  console.log('=====================================');

  if (!process.env.DATA_DIR) {
    console.warn('⚠️  WARNING: DATA_DIR environment variable is not set!');
    console.warn('⚠️  Database and uploaded files will be stored in ephemeral filesystem.');
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Migrate database from old location if needed
  if (!fs.existsSync(DB_PATH) && fs.existsSync(OLD_DB_PATH)) {
    try {
      fs.copyFileSync(OLD_DB_PATH, DB_PATH);
      console.log(`✅ Database migrated from ${OLD_DB_PATH} to ${DB_PATH}`);
    } catch (error) {
      console.error('❌ Error migrating database:', error);
    }
  }

  const init = () => {
    return new Promise((resolve, reject) => {
      db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
          return;
        }
        console.log(`✅ Connected to SQLite database at: ${DB_PATH}`);
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
          
          db.get('SELECT COUNT(*) as count FROM categories', (err, result) => {
            if (!err && result.count === 0) {
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
            // Add columns if they don't exist
            db.run(`ALTER TABLE products ADD COLUMN image_url TEXT`, () => {});
            db.run(`ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'шт'`, () => {});
            db.run(`ALTER TABLE products ADD COLUMN price_currency TEXT DEFAULT 'EUR'`, () => {});
            db.run(`ALTER TABLE products ADD COLUMN cost_price_eur REAL`, () => {});
            db.run(`ALTER TABLE products ADD COLUMN cost_price_uah REAL`, () => {});
            db.run(`ALTER TABLE products ADD COLUMN card_color TEXT`, () => {});
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
            db.run(`ALTER TABLE clients ADD COLUMN company_name TEXT`, () => {});
            db.run(`ALTER TABLE clients ADD COLUMN manager_id TEXT`, () => {});
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

        // ClientCategories table
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
          
          // CategoryManagers table
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
            
            // Email subscriptions table
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
            
            // QR page categories table
            db.run(`CREATE TABLE IF NOT EXISTS qr_page_categories (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              qr_page_url TEXT NOT NULL,
              category_id INTEGER NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
              UNIQUE(qr_page_url, category_id)
            )`, (err) => {
              if (err) {
                console.error('Error creating qr_page_categories table:', err);
              } else {
                console.log('QRPageCategories table created/verified');
                
                db.get('SELECT COUNT(*) as count FROM qr_page_categories', (err, result) => {
                  if (!err && result.count === 0) {
                    console.log('QR page categories table is empty. Inserting default mappings...');
                    const defaultMappings = [
                      ['colorant', 'Колоранти'],
                      ['mix', 'Колірувальне обладнання'],
                      ['bruker-o', 'Брукер Оптікс (БІЧ)'],
                      ['axs', 'Брукер АХС'],
                      ['filter', 'Фільтри'],
                      ['lab', 'Лабораторка']
                    ];
                    
                    db.all('SELECT id, name FROM categories', (err, categories) => {
                      if (!err && categories) {
                        const categoryMap = {};
                        categories.forEach(cat => {
                          categoryMap[cat.name] = cat.id;
                        });
                        
                        const stmt = db.prepare('INSERT INTO qr_page_categories (qr_page_url, category_id) VALUES (?, ?)');
                        defaultMappings.forEach(([url, categoryName]) => {
                          const categoryId = categoryMap[categoryName];
                          if (categoryId) {
                            stmt.run([url, categoryId], (err) => {
                              if (err) {
                                console.error(`Error inserting QR mapping ${url} -> ${categoryName}:`, err);
                              } else {
                                console.log(`QR mapping inserted: ${url} -> ${categoryName}`);
                              }
                            });
                          }
                        });
                        stmt.finalize();
                      }
                    });
                  }
                });
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
}

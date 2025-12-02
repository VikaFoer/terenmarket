const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./database');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const clientRoutes = require('./routes/client');
const currencyRoutes = require('./routes/currency');
const managerRoutes = require('./routes/manager');
const greetingsRoutes = require('./routes/greetings');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Middleware
app.use(cors({
  origin: FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database and start server
console.log('Starting database initialization...');
db.init()
  .then(() => {
    console.log('✅ Database initialization completed successfully');
    
    // Log all API requests for debugging
    app.use('/api', (req, res, next) => {
      console.log(`[API Request] ${req.method} ${req.path}`);
      next();
    });
    
    // Routes - MUST be registered before static file serving
    console.log('Registering API routes...');
    app.use('/api/auth', authRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/client', clientRoutes);
    app.use('/api/currency', currencyRoutes);
    app.use('/api/manager', managerRoutes);
    app.use('/api/greetings', greetingsRoutes);
    app.use('/api/analytics', analyticsRoutes);
    
    // Serve uploaded images
    const uploadsPath = path.join(__dirname, 'uploads', 'images');
    if (fs.existsSync(uploadsPath)) {
      app.use('/api/uploads/images', express.static(uploadsPath));
      console.log('✅ Uploaded images served from:', uploadsPath);
    }
    
    console.log('✅ API routes registered');

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // Public database diagnostics (without sensitive client data)
    app.get('/api/db-status', (req, res) => {
      const database = db.getDb();
      
      // Get all products with categories
      database.all(`
        SELECT 
          p.id,
          p.name,
          c.id as category_id,
          c.name as category_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        ORDER BY c.name, p.name
      `, (err, products) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Get all categories with product counts
        database.all(`
          SELECT 
            c.id,
            c.name,
            COUNT(p.id) as product_count
          FROM categories c
          LEFT JOIN products p ON p.category_id = c.id
          GROUP BY c.id, c.name
          ORDER BY c.name
        `, (err, categories) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Get products in "Фільтри" category
          database.all(`
            SELECT 
              p.id,
              p.name
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE c.name = 'Фільтри'
            ORDER BY p.name
          `, (err, filterProducts) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            // Get count of clients with access to "Фільтри" (without sensitive data)
            database.all(`
              SELECT COUNT(DISTINCT cl.id) as count
              FROM clients cl
              JOIN client_categories cc ON cl.id = cc.client_id
              JOIN categories c ON cc.category_id = c.id
              WHERE c.name = 'Фільтри'
            `, (err, filterAccessResult) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              
              // Get total clients count
              database.get('SELECT COUNT(*) as count FROM clients', (err, clientsResult) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }
                
                res.json({
                  total_products: products.length,
                  total_categories: categories.length,
                  total_clients: clientsResult.count,
                  categories: categories,
                  filter_category: {
                    name: 'Фільтри',
                    products_count: filterProducts.length,
                    products: filterProducts.map(p => ({ id: p.id, name: p.name })),
                    clients_with_access: filterAccessResult[0].count
                  }
                });
              });
            });
          });
        });
      });
    });

    // Database restore endpoint - upload and import database export file
    app.post('/api/db-restore', express.json({ limit: '10mb' }), async (req, res) => {
      try {
        const exportData = req.body;
        
        if (!exportData || !exportData.clients || !exportData.products) {
          return res.status(400).json({ error: 'Invalid export data format' });
        }
        
        const db = require('./database');
        const database = db.getDb();
        
        let imported = {
          clients: 0,
          products: 0,
          client_categories: 0,
          coefficients: 0
        };
        
        // Import clients (skip admin)
        const clientsToImport = exportData.clients.filter(c => c.login !== 'admin');
        for (const client of clientsToImport) {
          await new Promise((resolve) => {
            database.run(
              `INSERT OR REPLACE INTO clients (id, login, password, location, phone, email, created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [client.id, client.login, client.password, client.location, client.phone, client.email, client.created_at, client.updated_at],
              () => {
                imported.clients++;
                resolve();
              }
            );
          });
        }
        
        // Import products
        for (const product of exportData.products) {
          await new Promise((resolve) => {
            database.run(
              `INSERT OR REPLACE INTO products (id, name, category_id, cost_price, image_url, created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [product.id, product.name, product.category_id, product.cost_price, product.image_url || null, product.created_at, product.updated_at],
              () => {
                imported.products++;
                resolve();
              }
            );
          });
        }
        
        // Import client_categories
        for (const cc of exportData.client_categories || []) {
          await new Promise((resolve) => {
            database.run(
              `INSERT OR IGNORE INTO client_categories (client_id, category_id) VALUES (?, ?)`,
              [cc.client_id, cc.category_id],
              () => resolve()
            );
          });
          imported.client_categories++;
        }
        
        // Import coefficients
        for (const cpc of exportData.client_product_coefficients || []) {
          await new Promise((resolve) => {
            database.run(
              `INSERT OR REPLACE INTO client_product_coefficients (id, client_id, product_id, coefficient, created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [cpc.id, cpc.client_id, cpc.product_id, cpc.coefficient, cpc.created_at, cpc.updated_at],
              () => resolve()
            );
          });
          imported.coefficients++;
        }
        
        res.json({
          success: true,
          message: 'Database restored successfully',
          imported: imported
        });
      } catch (error) {
        console.error('Error restoring database:', error);
        res.status(500).json({
          error: 'Failed to restore database',
          message: error.message
        });
      }
    });

    // Database export endpoint - export database to JSON
    app.get('/api/db-export', async (req, res) => {
      try {
        const db = require('./database');
        const database = db.getDb();
        
        const exportData = {
          clients: [],
          products: [],
          categories: [],
          client_categories: [],
          client_product_coefficients: []
        };
        
        // Export all data
        exportData.clients = await new Promise((resolve, reject) => {
          database.all('SELECT * FROM clients', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
        
        exportData.products = await new Promise((resolve, reject) => {
          database.all('SELECT * FROM products', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
        
        exportData.categories = await new Promise((resolve, reject) => {
          database.all('SELECT * FROM categories', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
        
        exportData.client_categories = await new Promise((resolve, reject) => {
          database.all('SELECT * FROM client_categories', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
        
        exportData.client_product_coefficients = await new Promise((resolve, reject) => {
          database.all('SELECT * FROM client_product_coefficients', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
        
        res.json(exportData);
      } catch (error) {
        console.error('Error exporting database:', error);
        res.status(500).json({
          error: 'Failed to export database',
          message: error.message
        });
      }
    });

    // Database info endpoint - check if database is in Volume
    app.get('/api/db-info', async (req, res) => {
      const db = require('./database');
      const dbInfo = db.getDbInfo ? db.getDbInfo() : null;
      const database = db.getDb();
      
      try {
        // Get counts from database
        const counts = await new Promise((resolve, reject) => {
          const results = {};
          let completed = 0;
          const total = 4;
          
          const checkComplete = () => {
            completed++;
            if (completed === total) {
              resolve(results);
            }
          };
          
          database.get('SELECT COUNT(*) as count FROM clients', (err, row) => {
            if (err) {
              results.clients = { error: err.message };
            } else {
              results.clients = row.count;
            }
            checkComplete();
          });
          
          database.get('SELECT COUNT(*) as count FROM products', (err, row) => {
            if (err) {
              results.products = { error: err.message };
            } else {
              results.products = row.count;
            }
            checkComplete();
          });
          
          database.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
            if (err) {
              results.categories = { error: err.message };
            } else {
              results.categories = row.count;
            }
            checkComplete();
          });
          
          database.get('SELECT COUNT(*) as count FROM client_product_coefficients', (err, row) => {
            if (err) {
              results.coefficients = { error: err.message };
            } else {
              results.coefficients = row.count;
            }
            checkComplete();
          });
        });
        
        // Get sample data
        const sampleData = await new Promise((resolve, reject) => {
          const samples = {};
          
          database.all('SELECT id, login, email FROM clients LIMIT 5', (err, rows) => {
            if (!err) samples.clients = rows;
            
            database.all('SELECT id, name, category_id FROM products LIMIT 5', (err, rows) => {
              if (!err) samples.products = rows;
              
              database.all('SELECT id, name FROM categories', (err, rows) => {
                if (!err) samples.categories = rows;
                resolve(samples);
              });
            });
          });
        });
        
        res.json({
          status: 'ok',
          database: {
            dataDir: process.env.DATA_DIR || 'not set',
            dbPath: dbInfo?.dbPath || 'unknown',
            dbExists: dbInfo?.dbExists || false,
            dataDirExists: dbInfo?.dataDirExists || false,
            isInVolume: process.env.DATA_DIR === '/app/server/data',
            volumeMountPath: '/app/server/data',
            note: process.env.DATA_DIR === '/app/server/data' 
              ? '✅ Database is configured to use Railway Volume' 
              : '⚠️ Database may not be in Volume. Check DATA_DIR variable.'
          },
          counts: counts,
          sampleData: sampleData
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to query database',
          message: error.message
        });
      }
    });

          // Serve static files from React app in production
          // Check multiple possible build locations
          const possibleBuildPaths = [
            path.join(__dirname, '..', 'client', 'build'), // Standard: ../client/build from server/
            path.join(process.cwd(), 'client', 'build'),   // From root directory
            path.join(__dirname, '..', '..', 'client', 'build'), // Alternative path
            path.join(process.cwd(), 'build')              // If build is in root
          ];
          
          let buildPath = null;
          let indexPath = null;
          
          for (const possiblePath of possibleBuildPaths) {
            const possibleIndexPath = path.join(possiblePath, 'index.html');
            if (fs.existsSync(possiblePath) && fs.existsSync(possibleIndexPath)) {
              buildPath = possiblePath;
              indexPath = possibleIndexPath;
              console.log(`✅ Found build directory at: ${buildPath}`);
              break;
            }
          }
          
          // If NODE_ENV is production or build directory exists, try to serve frontend
          if (process.env.NODE_ENV === 'production' || buildPath) {
            if (!buildPath) {
              // Build path: server runs from server/ directory, so build is at ../client/build
              // This resolves to /app/client/build on Railway when running from /app/server
              buildPath = path.join(__dirname, '..', 'client', 'build');
              indexPath = path.join(buildPath, 'index.html');
            }
            
            console.log(`[Production Mode] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
            console.log(`[Production Mode] __dirname: ${__dirname}`);
            console.log(`[Production Mode] process.cwd(): ${process.cwd()}`);
            console.log(`[Production Mode] Build path: ${buildPath}`);
            console.log(`[Production Mode] Index path: ${indexPath}`);
            
            // Check if build directory exists
            if (!fs.existsSync(buildPath)) {
              console.error(`❌ ERROR: Build directory not found at ${buildPath}`);
              console.error(`Current working directory: ${process.cwd()}`);
              try {
                const rootDir = path.join(__dirname, '..');
                console.error(`Root directory: ${rootDir}`);
                console.error(`Root directory contents:`, fs.readdirSync(rootDir).join(', '));
                if (fs.existsSync(path.join(rootDir, 'client'))) {
                  console.error(`Client directory contents:`, fs.readdirSync(path.join(rootDir, 'client')).join(', '));
                }
              } catch (e) {
                console.error(`Error reading directories:`, e.message);
              }
              
              // Still serve a helpful error page instead of crashing
              app.get('*', (req, res) => {
                if (req.path.startsWith('/api')) {
                  return res.status(404).json({ error: 'API endpoint not found', path: req.path });
                }
                res.status(500).json({ 
                  error: 'Frontend build not found',
                  message: `Build directory missing at ${buildPath}. Please ensure the frontend is built before deployment.`,
                  buildPath: buildPath,
                  cwd: process.cwd(),
                  __dirname: __dirname
                });
              });
            } else if (!fs.existsSync(indexPath)) {
              console.error(`❌ ERROR: index.html not found at ${indexPath}`);
              app.get('*', (req, res) => {
                if (req.path.startsWith('/api')) {
                  return res.status(404).json({ error: 'API endpoint not found', path: req.path });
                }
                res.status(500).json({ 
                  error: 'Frontend index.html not found',
                  message: `index.html missing at ${indexPath}`,
                  indexPath: indexPath
                });
              });
            } else {
              console.log(`✅ Build directory found at: ${buildPath}`);
              console.log(`✅ index.html found at: ${indexPath}`);
              
              // Serve static files (CSS, JS, images, etc.)
              app.use(express.static(buildPath));
              
              // Serve React app for all non-API routes (MUST be last)
              app.get('*', (req, res) => {
                // Don't serve React app for API routes
                if (req.path.startsWith('/api')) {
                  return res.status(404).json({ error: 'API endpoint not found', path: req.path });
                }
                
                // Serve index.html for all other routes (React Router will handle routing)
                res.sendFile(indexPath, (err) => {
                  if (err) {
                    console.error(`Error serving index.html for ${req.path}:`, err);
                    if (!res.headersSent) {
                      res.status(500).json({ 
                        error: 'Failed to serve frontend',
                        path: req.path,
                        message: err.message
                      });
                    }
                  }
                });
              });
            }
          } else {
            // Development mode or build not found - show API info
            console.log(`[Development Mode] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
            console.log(`[Development Mode] Build directory not found, serving API info instead`);
            
            app.get('/', (req, res) => {
              res.json({
                message: 'SmartMarket API Server',
                version: '1.0.0',
                endpoints: {
                  health: '/api/health',
                  auth: '/api/auth/login',
                  admin: '/api/admin/*',
                  client: '/api/client/*',
                  dbStatus: '/api/db-status'
                },
                note: 'This is an API server. In production, React app should be served from root path.',
                debug: {
                  nodeEnv: process.env.NODE_ENV || 'not set',
                  buildPath: buildPath || 'not found',
                  __dirname: __dirname,
                  cwd: process.cwd()
                }
              });
            });
          }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to initialize database:', err);
    console.error('Error details:', err.message);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  });


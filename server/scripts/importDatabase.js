const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const db = require('../database');

const IMPORT_FILE = path.join(__dirname, '..', 'database_export.json');

console.log('Importing database from:', IMPORT_FILE);

if (!fs.existsSync(IMPORT_FILE)) {
  console.error('❌ Export file not found:', IMPORT_FILE);
  console.error('Please run exportDatabase.js first');
  process.exit(1);
}

const importData = JSON.parse(fs.readFileSync(IMPORT_FILE, 'utf8'));

const importDatabase = async () => {
  try {
    await db.init();
    const database = db.getDb();
    
    console.log('Connected to database');
    
    // Import clients (skip admin)
    const clientsToImport = importData.clients.filter(c => c.login !== 'admin');
    console.log(`\nImporting ${clientsToImport.length} clients...`);
    
    for (const client of clientsToImport) {
      await new Promise((resolve, reject) => {
        database.run(
          `INSERT OR REPLACE INTO clients (id, login, password, location, phone, email, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [client.id, client.login, client.password, client.location, client.phone, client.email, client.created_at, client.updated_at],
          (err) => {
            if (err) {
              console.error(`Error importing client ${client.login}:`, err);
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    }
    console.log('✅ Clients imported');
    
    // Import products
    console.log(`\nImporting ${importData.products.length} products...`);
    for (const product of importData.products) {
      await new Promise((resolve, reject) => {
        database.run(
          `INSERT OR REPLACE INTO products (id, name, category_id, cost_price, image_url, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [product.id, product.name, product.category_id, product.cost_price, product.image_url || null, product.created_at, product.updated_at],
          (err) => {
            if (err) {
              console.error(`Error importing product ${product.name}:`, err);
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    }
    console.log('✅ Products imported');
    
    // Import client_categories
    console.log(`\nImporting ${importData.client_categories.length} client_categories...`);
    for (const cc of importData.client_categories) {
      await new Promise((resolve, reject) => {
        database.run(
          `INSERT OR IGNORE INTO client_categories (client_id, category_id) VALUES (?, ?)`,
          [cc.client_id, cc.category_id],
          (err) => {
            if (err) {
              console.error(`Error importing client_category:`, err);
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    }
    console.log('✅ Client categories imported');
    
    // Import client_product_coefficients
    console.log(`\nImporting ${importData.client_product_coefficients.length} coefficients...`);
    for (const cpc of importData.client_product_coefficients) {
      await new Promise((resolve, reject) => {
        database.run(
          `INSERT OR REPLACE INTO client_product_coefficients (id, client_id, product_id, coefficient, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [cpc.id, cpc.client_id, cpc.product_id, cpc.coefficient, cpc.created_at, cpc.updated_at],
          (err) => {
            if (err) {
              console.error(`Error importing coefficient:`, err);
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    }
    console.log('✅ Coefficients imported');
    
    console.log('\n✅ Database import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
};

importDatabase();


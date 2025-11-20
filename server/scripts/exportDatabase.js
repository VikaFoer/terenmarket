const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const EXPORT_FILE = path.join(__dirname, '..', 'database_export.json');

console.log('Exporting database from:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  
  console.log('Connected to database');
  
  const exportData = {
    clients: [],
    products: [],
    categories: [],
    client_categories: [],
    client_product_coefficients: []
  };
  
  // Export clients
  db.all('SELECT * FROM clients', (err, rows) => {
    if (err) {
      console.error('Error exporting clients:', err);
    } else {
      exportData.clients = rows;
      console.log(`Exported ${rows.length} clients`);
    }
    
    // Export products
    db.all('SELECT * FROM products', (err, rows) => {
      if (err) {
        console.error('Error exporting products:', err);
      } else {
        exportData.products = rows;
        console.log(`Exported ${rows.length} products`);
      }
      
      // Export categories
      db.all('SELECT * FROM categories', (err, rows) => {
        if (err) {
          console.error('Error exporting categories:', err);
        } else {
          exportData.categories = rows;
          console.log(`Exported ${rows.length} categories`);
        }
        
        // Export client_categories
        db.all('SELECT * FROM client_categories', (err, rows) => {
          if (err) {
            console.error('Error exporting client_categories:', err);
          } else {
            exportData.client_categories = rows;
            console.log(`Exported ${rows.length} client_categories`);
          }
          
          // Export client_product_coefficients
          db.all('SELECT * FROM client_product_coefficients', (err, rows) => {
            if (err) {
              console.error('Error exporting client_product_coefficients:', err);
            } else {
              exportData.client_product_coefficients = rows;
              console.log(`Exported ${rows.length} client_product_coefficients`);
            }
            
            // Write to file
            fs.writeFileSync(EXPORT_FILE, JSON.stringify(exportData, null, 2));
            console.log(`\n✅ Database exported to: ${EXPORT_FILE}`);
            console.log(`Total records:`);
            console.log(`  - Clients: ${exportData.clients.length}`);
            console.log(`  - Products: ${exportData.products.length}`);
            console.log(`  - Categories: ${exportData.categories.length}`);
            console.log(`  - Client Categories: ${exportData.client_categories.length}`);
            console.log(`  - Coefficients: ${exportData.client_product_coefficients.length}`);
            
            db.close();
          });
        });
      });
    });
  });
});


const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use Railway volume path if available, otherwise use local path
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');
const DB_PATH = path.join(DATA_DIR, 'database.sqlite');

// Old database path (before Volume was configured)
const OLD_DB_PATH = path.join(__dirname, '..', 'database.sqlite');

// Determine which database to use
let dbPath = DB_PATH;
if (!fs.existsSync(DB_PATH) && fs.existsSync(OLD_DB_PATH)) {
  dbPath = OLD_DB_PATH;
  console.log('Using old database path:', dbPath);
} else {
  console.log('Using database path:', dbPath);
}

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found at:', dbPath);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

// Find category ID for "Колоранти"
db.get('SELECT id FROM categories WHERE name = ?', ['Колоранти'], (err, category) => {
  if (err) {
    console.error('Error finding category:', err);
    db.close();
    process.exit(1);
  }

  if (!category) {
    console.error('Category "Колоранти" not found');
    db.close();
    process.exit(1);
  }

  const categoryId = category.id;
  console.log(`Found category "Колоранти" with ID: ${categoryId}`);

  // First, count products in this category
  db.get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [categoryId], (err, result) => {
    if (err) {
      console.error('Error counting products:', err);
      db.close();
      process.exit(1);
    }

    const productCount = result.count;
    console.log(`Found ${productCount} products in category "Колоранти"`);

    if (productCount === 0) {
      console.log('No products to delete');
      db.close();
      process.exit(0);
    }

    // Delete all products from this category
    db.run('DELETE FROM products WHERE category_id = ?', [categoryId], function(err) {
      if (err) {
        console.error('Error deleting products:', err);
        db.close();
        process.exit(1);
      }

      console.log(`Successfully deleted ${this.changes} products from category "Колоранти"`);

      // Also delete product coefficients for deleted products
      db.run('DELETE FROM product_coefficients WHERE product_id NOT IN (SELECT id FROM products)', [], function(err) {
        if (err) {
          console.error('Error cleaning up coefficients:', err);
        } else {
          console.log(`Cleaned up ${this.changes} orphaned product coefficients`);
        }

        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed');
          }
          process.exit(0);
        });
      });
    });
  });
});


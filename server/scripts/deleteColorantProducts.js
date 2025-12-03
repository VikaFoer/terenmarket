const db = require('../database');

const deleteColorantProducts = async () => {
  return new Promise((resolve, reject) => {
    const database = db.getDb();

    // Find category ID for "Колоранти"
    database.get('SELECT id FROM categories WHERE name = ?', ['Колоранти'], (err, category) => {
      if (err) {
        console.error('Error finding category:', err);
        return reject(err);
      }

      if (!category) {
        return reject(new Error('Category "Колоранти" not found'));
      }

      const categoryId = category.id;
      console.log(`Found category "Колоранти" with ID: ${categoryId}`);

      // First, count products in this category
      database.get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [categoryId], (err, result) => {
        if (err) {
          console.error('Error counting products:', err);
          return reject(err);
        }

        const productCount = result.count;
        console.log(`Found ${productCount} products in category "Колоранти"`);

        if (productCount === 0) {
          return resolve({ deleted: 0, message: 'No products to delete' });
        }

        // Delete all products from this category
        database.run('DELETE FROM products WHERE category_id = ?', [categoryId], function(err) {
          if (err) {
            console.error('Error deleting products:', err);
            return reject(err);
          }

          const deletedCount = this.changes;
          console.log(`Successfully deleted ${deletedCount} products from category "Колоранти"`);

          // Also delete product coefficients for deleted products
          database.run('DELETE FROM product_coefficients WHERE product_id NOT IN (SELECT id FROM products)', [], function(err) {
            if (err) {
              console.error('Error cleaning up coefficients:', err);
            } else {
              console.log(`Cleaned up ${this.changes} orphaned product coefficients`);
            }

            resolve({ 
              deleted: deletedCount, 
              coefficientsCleaned: this.changes || 0,
              message: `Deleted ${deletedCount} products from category "Колоранти"`
            });
          });
        });
      });
    });
  });
};

// If run directly (not imported)
if (require.main === module) {
  deleteColorantProducts()
    .then((result) => {
      console.log('Result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { deleteColorantProducts };

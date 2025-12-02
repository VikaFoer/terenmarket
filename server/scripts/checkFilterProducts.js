const db = require('../database');

const checkFilterProducts = async () => {
  try {
    console.log('Initializing database...');
    await db.init();
    const database = db.getDb();
    
    // Отримуємо категорію "Фільтри"
    const category = await new Promise((resolve, reject) => {
      database.get('SELECT * FROM categories WHERE name = ?', ['Фільтри'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!category) {
      console.error('❌ Category "Фільтри" not found!');
      process.exit(1);
      return;
    }
    
    console.log(`Found category: ${category.name} (ID: ${category.id})\n`);
    
    // Отримуємо всі товари категорії "Фільтри"
    const products = await new Promise((resolve, reject) => {
      database.all(
        'SELECT * FROM products WHERE category_id = ? ORDER BY name',
        [category.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    console.log(`Found ${products.length} products in category "Фільтри":\n`);
    
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (ID: ${product.id}, cost_price: ${product.cost_price})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkFilterProducts();


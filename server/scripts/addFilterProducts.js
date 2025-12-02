const db = require('../database');

// Товари для категорії "Фільтри"
const filterProducts = [
  'Фільтруючий елемент мішечного типу AGFE-51-R02H-O-15L (F5870079)',
  'Фільтруючий елемент мішечного типу PEXL-1-P01H-30L',
  'Корпус фільтру для використання з фільтрувальним мішком FBF-0102-AD10-050D (FL-0037)',
  'Корпус фільтру для використання з фільтрувальним мішком SF1A2-10-050B',
  'Фільтруючий елемент мішечного типу PE-5-P0S2',
  'Фільтруючий елемент мішечного типу NMO-200-P02S',
  'Фільтруючий елемент картриджного типу 03PP020-307SAG',
  'Капсульний фільтр BA-PTD2222-AC-5S',
  'Гофрований картридж з нержавіючої сталі CRPM4020H107E',
  'Фільтруючий елемент картриджного типу CRPPA0305003E'
];

const addFilterProducts = async () => {
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
    
    console.log(`Found category: ${category.name} (ID: ${category.id})`);
    console.log(`\nAdding ${filterProducts.length} products...\n`);
    
    let addedCount = 0;
    let skippedCount = 0;
    
    // Додаємо товари
    for (const productName of filterProducts) {
      // Перевіряємо чи товар вже існує
      const existing = await new Promise((resolve, reject) => {
        database.get(
          'SELECT id FROM products WHERE name = ? AND category_id = ?',
          [productName, category.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      if (existing) {
        console.log(`  ⏭️  Skipped: ${productName} (already exists)`);
        skippedCount++;
        continue;
      }
      
      // Додаємо товар (cost_price = 0 за замовчуванням, можна буде встановити пізніше)
      await new Promise((resolve, reject) => {
        database.run(
          'INSERT INTO products (name, category_id, cost_price) VALUES (?, ?, ?)',
          [productName, category.id, 0],
          function(err) {
            if (err) {
              console.error(`  ❌ Error adding ${productName}:`, err.message);
              reject(err);
            } else {
              console.log(`  ✅ Added: ${productName}`);
              addedCount++;
              resolve();
            }
          }
        );
      });
    }
    
    console.log(`\n✅ Done!`);
    console.log(`   Added: ${addedCount} products`);
    console.log(`   Skipped: ${skippedCount} products (already exist)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

addFilterProducts();



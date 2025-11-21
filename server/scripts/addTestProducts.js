const db = require('../database');
const path = require('path');

// Тестові товари для кожної категорії
const testProducts = {
  'Хімічна сировина': [
    { name: 'Сировина для колірування', cost_price: 12.30 },
    { name: 'Сировина базова', cost_price: 10.50 },
    { name: 'Сировина преміум', cost_price: 15.75 },
  ],
  'Колоранти': [
    { name: 'Колірна паста біла', cost_price: 15.50 },
    { name: 'Колірна паста чорна', cost_price: 18.75 },
    { name: 'Колірна паста синя', cost_price: 16.20 },
    { name: 'Колірна паста червона', cost_price: 17.90 },
    { name: 'Колірна паста жовта', cost_price: 14.80 },
  ],
  'Брукер Оптікс (БІЧ)': [
    { name: 'Брукер Оптікс БІЧ-100', cost_price: 1250.00 },
    { name: 'Брукер Оптікс БІЧ-200', cost_price: 1850.00 },
    { name: 'Брукер Оптікс БІЧ-300', cost_price: 2450.00 },
    { name: 'Аксесуари Брукер Оптікс', cost_price: 85.50 },
  ],
  'Колірувальне обладнання': [
    { name: 'Колірувальна машина PRO-500', cost_price: 3500.00 },
    { name: 'Колірувальна машина PRO-1000', cost_price: 5200.00 },
    { name: 'Дозатор колірних паст', cost_price: 450.00 },
    { name: 'Міксер для колірування', cost_price: 280.00 },
    { name: 'Шприц для колірування', cost_price: 15.75 },
  ],
  'Фільтри': [
    { name: 'Фільтр механічний 10 мкм', cost_price: 45.00 },
    { name: 'Фільтр механічний 5 мкм', cost_price: 52.50 },
    { name: 'Фільтр механічний 1 мкм', cost_price: 68.00 },
    { name: 'Фільтр картриджний', cost_price: 125.00 },
    { name: 'Фільтр для води', cost_price: 35.50 },
  ],
  'Брукер АХС': [
    { name: 'Брукер АХС-200', cost_price: 2100.00 },
    { name: 'Брукер АХС-300', cost_price: 2800.00 },
    { name: 'Брукер АХС-500', cost_price: 3600.00 },
    { name: 'Комплектуючі Брукер АХС', cost_price: 150.00 },
  ],
  'Лабораторка': [
    { name: 'Лабораторний міксер', cost_price: 320.00 },
    { name: 'Лабораторні ваги', cost_price: 450.00 },
    { name: 'Лабораторний термометр', cost_price: 85.00 },
    { name: 'Лабораторна посудина', cost_price: 25.50 },
    { name: 'Лабораторний дозатор', cost_price: 180.00 },
  ],
  'Роботи/автоматизація': [
    { name: 'Автоматизація колірування', cost_price: 5500.00 },
    { name: 'Система управління процесом', cost_price: 4200.00 },
    { name: 'Робот-дозатор', cost_price: 6800.00 },
    { name: 'Програмне забезпечення', cost_price: 1500.00 },
  ],
  'Каталоги кольору': [
    { name: 'Каталог RAL Classic', cost_price: 95.00 },
    { name: 'Каталог RAL Design', cost_price: 120.00 },
    { name: 'Каталог NCS', cost_price: 110.00 },
    { name: 'Каталог Pantone', cost_price: 150.00 },
    { name: 'Цифровий каталог кольорів', cost_price: 250.00 },
  ]
};

const addTestProducts = async () => {
  try {
    console.log('Initializing database...');
    await db.init();
    const database = db.getDb();
    
    // Отримуємо всі категорії
    const categories = await new Promise((resolve, reject) => {
      database.all('SELECT * FROM categories ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`Found ${categories.length} categories`);
    
    // Створюємо мапу категорій
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });
    
    let addedCount = 0;
    let skippedCount = 0;
    
    // Додаємо товари для кожної категорії
    for (const [categoryName, products] of Object.entries(testProducts)) {
      const categoryId = categoryMap[categoryName];
      
      if (!categoryId) {
        console.warn(`Category "${categoryName}" not found, skipping...`);
        continue;
      }
      
      console.log(`\nAdding products for category: ${categoryName} (ID: ${categoryId})`);
      
      for (const product of products) {
        // Перевіряємо чи товар вже існує
        const existing = await new Promise((resolve, reject) => {
          database.get(
            'SELECT id FROM products WHERE name = ? AND category_id = ?',
            [product.name, categoryId],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });
        
        if (existing) {
          console.log(`  ⏭️  Skipped: ${product.name} (already exists)`);
          skippedCount++;
          continue;
        }
        
        // Додаємо товар
        await new Promise((resolve, reject) => {
          database.run(
            'INSERT INTO products (name, category_id, cost_price) VALUES (?, ?, ?)',
            [product.name, categoryId, product.cost_price],
            function(err) {
              if (err) {
                console.error(`  ❌ Error adding ${product.name}:`, err.message);
                reject(err);
              } else {
                console.log(`  ✅ Added: ${product.name} - ${product.cost_price} EUR`);
                addedCount++;
                resolve();
              }
            }
          );
        });
      }
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

addTestProducts();


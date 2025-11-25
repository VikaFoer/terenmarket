const db = require('../database');

// Тестові товари по 10 для кожної категорії
const testProducts = {
  'Колоранти': [
    { name: 'Колірна паста біла', cost_price: 15.50 },
    { name: 'Колірна паста чорна', cost_price: 18.75 },
    { name: 'Колірна паста синя', cost_price: 16.20 },
    { name: 'Колірна паста червона', cost_price: 17.90 },
    { name: 'Колірна паста жовта', cost_price: 14.80 },
    { name: 'Колірна паста зелена', cost_price: 16.50 },
    { name: 'Колірна паста коричнева', cost_price: 15.90 },
    { name: 'Колірна паста оранжева', cost_price: 17.20 },
    { name: 'Колірна паста фіолетова', cost_price: 18.10 },
    { name: 'Колірна паста рожева', cost_price: 16.80 },
  ],
  'Колірувальне обладнання': [
    { name: 'Колірувальна машина PRO-500', cost_price: 3500.00 },
    { name: 'Колірувальна машина PRO-1000', cost_price: 5200.00 },
    { name: 'Дозатор колірних паст', cost_price: 450.00 },
    { name: 'Міксер для колірування', cost_price: 280.00 },
    { name: 'Шприц для колірування', cost_price: 15.75 },
    { name: 'Колірувальна машина PRO-2000', cost_price: 6800.00 },
    { name: 'Автоматичний дозатор', cost_price: 1250.00 },
    { name: 'Міксер планетарний', cost_price: 850.00 },
    { name: 'Шейкер для колірування', cost_price: 120.00 },
    { name: 'Дозатор пневматичний', cost_price: 650.00 },
  ],
  'Брукер Оптікс (БІЧ)': [
    { name: 'Брукер Оптікс БІЧ-100', cost_price: 1250.00 },
    { name: 'Брукер Оптікс БІЧ-200', cost_price: 1850.00 },
    { name: 'Брукер Оптікс БІЧ-300', cost_price: 2450.00 },
    { name: 'Аксесуари Брукер Оптікс', cost_price: 85.50 },
    { name: 'Брукер Оптікс БІЧ-150', cost_price: 1550.00 },
    { name: 'Брукер Оптікс БІЧ-250', cost_price: 2100.00 },
    { name: 'Брукер Оптікс БІЧ-350', cost_price: 2800.00 },
    { name: 'Комплектуючі БІЧ-100', cost_price: 150.00 },
    { name: 'Комплектуючі БІЧ-200', cost_price: 180.00 },
    { name: 'Комплектуючі БІЧ-300', cost_price: 220.00 },
  ],
  'Брукер АХС': [
    { name: 'Брукер АХС-200', cost_price: 2100.00 },
    { name: 'Брукер АХС-300', cost_price: 2800.00 },
    { name: 'Брукер АХС-500', cost_price: 3600.00 },
    { name: 'Комплектуючі Брукер АХС', cost_price: 150.00 },
    { name: 'Брукер АХС-150', cost_price: 1800.00 },
    { name: 'Брукер АХС-250', cost_price: 2400.00 },
    { name: 'Брукер АХС-400', cost_price: 3200.00 },
    { name: 'Аксесуари АХС-200', cost_price: 120.00 },
    { name: 'Аксесуари АХС-300', cost_price: 140.00 },
    { name: 'Аксесуари АХС-500', cost_price: 160.00 },
  ],
  'Фільтри': [
    { name: 'Фільтр механічний 10 мкм', cost_price: 45.00 },
    { name: 'Фільтр механічний 5 мкм', cost_price: 52.50 },
    { name: 'Фільтр механічний 1 мкм', cost_price: 68.00 },
    { name: 'Фільтр картриджний', cost_price: 125.00 },
    { name: 'Фільтр для води', cost_price: 35.50 },
    { name: 'Фільтр механічний 20 мкм', cost_price: 38.00 },
    { name: 'Фільтр механічний 0.5 мкм', cost_price: 75.00 },
    { name: 'Фільтр картриджний преміум', cost_price: 180.00 },
    { name: 'Фільтр для масла', cost_price: 95.00 },
    { name: 'Фільтр комбінований', cost_price: 145.00 },
  ],
  'Лабораторка': [
    { name: 'Лабораторний міксер', cost_price: 320.00 },
    { name: 'Лабораторні ваги', cost_price: 450.00 },
    { name: 'Лабораторний термометр', cost_price: 85.00 },
    { name: 'Лабораторна посудина', cost_price: 25.50 },
    { name: 'Лабораторний дозатор', cost_price: 180.00 },
    { name: 'Лабораторний шейкер', cost_price: 280.00 },
    { name: 'Лабораторні ваги прецизійні', cost_price: 650.00 },
    { name: 'Лабораторний pH-метр', cost_price: 420.00 },
    { name: 'Лабораторна колба', cost_price: 18.00 },
    { name: 'Лабораторний міксер планетарний', cost_price: 550.00 },
  ]
};

const addQRTestProducts = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      await db.init();
      const database = db.getDb();
      
      // Отримуємо всі категорії
      const categories = await new Promise((resolve, reject) => {
        database.all('SELECT * FROM categories ORDER BY name', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

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
          console.log(`⚠️ Категорія "${categoryName}" не знайдена`);
          continue;
        }

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
            skippedCount++;
            continue;
          }

          // Додаємо товар
          await new Promise((resolve, reject) => {
            database.run(
              'INSERT INTO products (name, category_id, cost_price) VALUES (?, ?, ?)',
              [product.name, categoryId, product.cost_price],
              function(err) {
                if (err) reject(err);
                else {
                  addedCount++;
                  resolve();
                }
              }
            );
          });
        }
      }

      console.log(`✅ Додано ${addedCount} товарів, пропущено ${skippedCount} (вже існують)`);
      resolve({ added: addedCount, skipped: skippedCount });
    } catch (error) {
      console.error('❌ Помилка додавання товарів:', error);
      reject(error);
    }
  });
};

// Якщо запускається напряму
if (require.main === module) {
  addQRTestProducts()
    .then(() => {
      console.log('✅ Готово!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Помилка:', error);
      process.exit(1);
    });
}

module.exports = { addQRTestProducts };


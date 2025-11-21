const db = require('../database');

// Міграція категорій: заміна "Сировина+колір. пасти" на "Хімічна сировина" та "Колоранти"
const migrateCategories = async () => {
  try {
    console.log('Initializing database...');
    await db.init();
    const database = db.getDb();
    
    console.log('\n=== Міграція категорій ===\n');
    
    // Знаходимо стару категорію
    const oldCategory = await new Promise((resolve, reject) => {
      database.get(
        "SELECT * FROM categories WHERE name = 'Сировина+колір. пасти'",
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!oldCategory) {
      console.log('✅ Стара категорія "Сировина+колір. пасти" не знайдена');
    } else {
      console.log(`📦 Знайдено стару категорію: "${oldCategory.name}" (ID: ${oldCategory.id})`);
      
      // Перевіряємо чи існують нові категорії
      const [himiynaCategory, kolorantyCategory] = await Promise.all([
        new Promise((resolve, reject) => {
          database.get(
            "SELECT * FROM categories WHERE name = 'Хімічна сировина'",
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        }),
        new Promise((resolve, reject) => {
          database.get(
            "SELECT * FROM categories WHERE name = 'Колоранти'",
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        })
      ]);
      
      // Створюємо нові категорії якщо їх немає
      let himiynaId = himiynaCategory ? himiynaCategory.id : null;
      let kolorantyId = kolorantyCategory ? kolorantyCategory.id : null;
      
      if (!himiynaId) {
        console.log('➕ Створюємо категорію "Хімічна сировина"...');
        himiynaId = await new Promise((resolve, reject) => {
          database.run(
            "INSERT INTO categories (name) VALUES ('Хімічна сировина')",
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
        console.log(`✅ Категорія "Хімічна сировина" створена (ID: ${himiynaId})`);
      } else {
        console.log(`✅ Категорія "Хімічна сировина" вже існує (ID: ${himiynaId})`);
      }
      
      if (!kolorantyId) {
        console.log('➕ Створюємо категорію "Колоранти"...');
        kolorantyId = await new Promise((resolve, reject) => {
          database.run(
            "INSERT INTO categories (name) VALUES ('Колоранти')",
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
        console.log(`✅ Категорія "Колоранти" створена (ID: ${kolorantyId})`);
      } else {
        console.log(`✅ Категорія "Колоранти" вже існує (ID: ${kolorantyId})`);
      }
      
      // Отримуємо всі товари зі старої категорії
      const products = await new Promise((resolve, reject) => {
        database.all(
          'SELECT * FROM products WHERE category_id = ?',
          [oldCategory.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      
      console.log(`\n📦 Знайдено ${products.length} товарів у старій категорії`);
      
      // Мігруємо товари: сировина -> Хімічна сировина, колірні пасти -> Колоранти
      let migratedToHimiyna = 0;
      let migratedToKoloranty = 0;
      
      for (const product of products) {
        const productName = product.name.toLowerCase();
        
        // Визначаємо в яку категорію перемістити товар
        let newCategoryId;
        if (productName.includes('сировина') || productName.includes('сировин')) {
          newCategoryId = himiynaId;
          migratedToHimiyna++;
        } else {
          // Всі інші (колірні пасти, колоранти) -> Колоранти
          newCategoryId = kolorantyId;
          migratedToKoloranty++;
        }
        
        // Оновлюємо категорію товару
        await new Promise((resolve, reject) => {
          database.run(
            'UPDATE products SET category_id = ? WHERE id = ?',
            [newCategoryId, product.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        
        console.log(`  ✓ "${product.name}" -> ${newCategoryId === himiynaId ? 'Хімічна сировина' : 'Колоранти'}`);
      }
      
      console.log(`\n📊 Міграція товарів:`);
      console.log(`   - Хімічна сировина: ${migratedToHimiyna} товарів`);
      console.log(`   - Колоранти: ${migratedToKoloranty} товарів`);
      
      // Мігруємо зв'язки клієнт-категорія
      const clientCategories = await new Promise((resolve, reject) => {
        database.all(
          'SELECT * FROM client_categories WHERE category_id = ?',
          [oldCategory.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      
      console.log(`\n👥 Знайдено ${clientCategories.length} зв'язків клієнт-категорія`);
      
      let migratedLinks = 0;
      for (const cc of clientCategories) {
        // Додаємо зв'язки з новими категоріями
        for (const newCategoryId of [himiynaId, kolorantyId]) {
          await new Promise((resolve, reject) => {
            database.run(
              'INSERT OR IGNORE INTO client_categories (client_id, category_id) VALUES (?, ?)',
              [cc.client_id, newCategoryId],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
        migratedLinks++;
      }
      
      console.log(`✅ Мігровано ${migratedLinks} зв'язків клієнт-категорія`);
      
      // Видаляємо стару категорію
      console.log(`\n🗑️  Видаляємо стару категорію "${oldCategory.name}"...`);
      await new Promise((resolve, reject) => {
        database.run(
          'DELETE FROM categories WHERE id = ?',
          [oldCategory.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      console.log(`✅ Стара категорія видалена`);
    }
    
    // Видаляємо дублікат "Коліранти" якщо він існує
    const duplicateCategory = await new Promise((resolve, reject) => {
      database.get(
        "SELECT * FROM categories WHERE name = 'Коліранти'",
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (duplicateCategory) {
      console.log(`\n🗑️  Видаляємо дублікат "Коліранти" (ID: ${duplicateCategory.id})...`);
      
      // Переміщуємо товари в правильну категорію "Колоранти"
      const kolorantyCorrect = await new Promise((resolve, reject) => {
        database.get(
          "SELECT * FROM categories WHERE name = 'Колоранти'",
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      if (kolorantyCorrect) {
        await new Promise((resolve, reject) => {
          database.run(
            'UPDATE products SET category_id = ? WHERE category_id = ?',
            [kolorantyCorrect.id, duplicateCategory.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        
        await new Promise((resolve, reject) => {
          database.run(
            'UPDATE client_categories SET category_id = ? WHERE category_id = ?',
            [kolorantyCorrect.id, duplicateCategory.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        
        await new Promise((resolve, reject) => {
          database.run(
            'DELETE FROM categories WHERE id = ?',
            [duplicateCategory.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        
        console.log(`✅ Дублікат видалено, товари та зв'язки переміщено в "Колоранти"`);
      }
    }
    
    console.log('\n✅ Міграція завершена успішно!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Помилка міграції:', error);
    process.exit(1);
  }
};

migrateCategories();


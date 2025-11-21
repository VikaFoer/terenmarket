const XLSX = require('xlsx');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../database');

const EXCEL_FILE_PATH = path.join(__dirname, '../../clients_products_prices.xlsx');

// Генерація логіну на основі назви клієнта
const generateLogin = (clientName, index) => {
  if (!clientName) return 'client_' + index;
  
  // Транслітерація українських символів
  const transliteration = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'є': 'ye',
    'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k',
    'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's',
    'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
    'щ': 'shch', 'ь': '', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Є': 'Ye',
    'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K',
    'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S',
    'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh',
    'Щ': 'Shch', 'Ь': '', 'Ю': 'Yu', 'Я': 'Ya'
  };
  
  let login = clientName
    .toLowerCase()
    .split('')
    .map(function(char) {
      return transliteration[char] || char;
    })
    .join('')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  if (!login) login = 'client_' + index;
  if (login.length > 30) login = login.substring(0, 30);
  
  return login;
};

// Генерація паролю
const generatePassword = () => {
  const length = 8;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

const importData = async () => {
  try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    
    // Отримуємо назву першого листа
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Конвертуємо в JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    
    if (data.length === 0) {
      console.log('No data found in Excel file');
      return;
    }
    
    console.log('Found ' + data.length + ' rows in Excel file');
    console.log('Columns:', Object.keys(data[0]));
    
    // Ініціалізуємо базу даних
    await db.init();
    const database = db.getDb();
    
    // Отримуємо всі категорії
    const categories = await new Promise((resolve, reject) => {
      database.all('SELECT * FROM categories', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const categoryMap = {};
    categories.forEach(function(cat) {
      categoryMap[cat.name.toLowerCase()] = cat.id;
    });
    
    // Знаходимо колонки
    const columns = Object.keys(data[0]);
    console.log('Available columns:', columns);
    
    // Шукаємо колонки
    const clientNameCol = columns.find(function(col) {
      const lower = col.toLowerCase();
      return lower.includes('клієнт') || lower.includes('client') || lower.includes('назва');
    });
    
    const productNameCol = columns.find(function(col) {
      const lower = col.toLowerCase();
      return lower.includes('продукт') || lower.includes('product') || lower.includes('товар') || 
             lower.includes('технічна') || lower.includes('назва') || lower.includes('техническая');
    });
    
    const categoryCol = columns.find(function(col) {
      const lower = col.toLowerCase();
      return lower.includes('категорія') || lower.includes('category');
    });
    
    const costPriceCol = columns.find(function(col) {
      const lower = col.toLowerCase();
      return lower.includes('собівартість') || lower.includes('cost') || lower.includes('ціна');
    });
    
    const coefficientCol = columns.find(function(col) {
      const lower = col.toLowerCase();
      return lower.includes('коефіцієнт') || lower.includes('coefficient') || lower.includes('коэф');
    });
    
    const emailCol = columns.find(function(col) {
      const lower = col.toLowerCase();
      return lower.includes('email') || lower.includes('емейл');
    });
    
    const phoneCol = columns.find(function(col) {
      const lower = col.toLowerCase();
      return lower.includes('телефон') || lower.includes('phone') || lower.includes('тел');
    });
    
    const locationCol = columns.find(function(col) {
      const lower = col.toLowerCase();
      return lower.includes('локація') || lower.includes('location') || lower.includes('адреса');
    });
    
    console.log('Detected columns:');
    console.log('  Client:', clientNameCol);
    console.log('  Product:', productNameCol);
    console.log('  Category:', categoryCol);
    console.log('  Cost Price:', costPriceCol);
    console.log('  Coefficient:', coefficientCol);
    console.log('  Email:', emailCol);
    console.log('  Phone:', phoneCol);
    console.log('  Location:', locationCol);
    
    // Групуємо дані по клієнтах
    const clientsMap = new Map();
    const productsMap = new Map();
    
    // Якщо категорія не вказана, використовуємо першу категорію за замовчуванням
    const defaultCategoryId = categories[0] ? categories[0].id : null;
    const defaultCategoryName = categories[0] ? categories[0].name : 'Хімічна сировина';
    
    data.forEach(function(row, index) {
      const clientName = row[clientNameCol] || ('Client_' + index);
      const productName = row[productNameCol];
      let categoryName = row[categoryCol];
      const costPrice = parseFloat(row[costPriceCol]) || 0;
      const coefficient = parseFloat(row[coefficientCol]) || 1.0;
      
      // Якщо категорія не вказана, використовуємо категорію за замовчуванням
      if (!categoryName && defaultCategoryName) {
        categoryName = defaultCategoryName;
      }
      
      if (!clientsMap.has(clientName)) {
        clientsMap.set(clientName, {
          name: clientName,
          email: row[emailCol] || null,
          phone: row[phoneCol] || null,
          location: row[locationCol] || null,
          categories: new Set(),
          products: []
        });
      }
      
      const client = clientsMap.get(clientName);
      
      if (categoryName) {
        const categoryId = categoryMap[categoryName.toLowerCase()];
        if (categoryId) {
          client.categories.add(categoryId);
        } else if (defaultCategoryId) {
          // Якщо категорія не знайдена, використовуємо категорію за замовчуванням
          client.categories.add(defaultCategoryId);
        }
      } else if (defaultCategoryId) {
        client.categories.add(defaultCategoryId);
      }
      
      if (productName) {
        const productKey = productName + '_' + (categoryName || defaultCategoryName || 'unknown');
        if (!productsMap.has(productKey)) {
          productsMap.set(productKey, {
            name: productName,
            categoryName: categoryName || defaultCategoryName,
            costPrice: costPrice
          });
        }
        
        client.products.push({
          productName: productName,
          categoryName: categoryName || defaultCategoryName,
          coefficient: coefficient
        });
      }
    });
    
    console.log('\nFound ' + clientsMap.size + ' unique clients');
    console.log('Found ' + productsMap.size + ' unique products');
    
    // Створюємо продукти
    const productIdMap = new Map();
    for (const [key, product] of productsMap) {
      const catName = (product.categoryName || '').toLowerCase();
      const categoryId = categoryMap[catName] || (categories[0] ? categories[0].id : null);
      
      if (!categoryId) {
        console.warn('Category not found for product: ' + product.name + ', category: ' + product.categoryName);
        continue;
      }
      
      const productId = await new Promise((resolve, reject) => {
        // Спочатку перевіряємо чи продукт вже існує
        database.get(
          'SELECT id FROM products WHERE name = ? AND category_id = ?',
          [product.name, categoryId],
          function(err, row) {
            if (err) {
              reject(err);
              return;
            }
            
            if (row) {
              resolve(row.id);
            } else {
              // Створюємо новий продукт
              database.run(
                'INSERT INTO products (name, category_id, cost_price) VALUES (?, ?, ?)',
                [product.name, categoryId, product.costPrice],
                function(err2) {
                  if (err2) reject(err2);
                  else resolve(this.lastID);
                }
              );
            }
          }
        );
      });
      
      if (productId) {
        productIdMap.set(key, productId);
      }
    }
    
    // Створюємо клієнтів та їх коефіцієнти
    const generatedCredentials = [];
    
    for (const [clientName, clientData] of clientsMap) {
      const login = generateLogin(clientName, clientsMap.size);
      const password = generatePassword();
      
      // Хешуємо пароль
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Перевіряємо чи клієнт вже існує
      let clientId = await new Promise((resolve, reject) => {
        database.get(
          'SELECT id FROM clients WHERE login = ?',
          [login],
          function(err, row) {
            if (err) reject(err);
            else resolve(row ? row.id : null);
          }
        );
      });
      
      if (clientId) {
        // Оновлюємо дані існуючого клієнта
        await new Promise((resolve, reject) => {
          database.run(
            'UPDATE clients SET password = ?, email = ?, phone = ?, location = ?, company_name = ? WHERE id = ?',
            [hashedPassword, clientData.email, clientData.phone, clientData.location, clientName, clientId],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      } else {
        // Створюємо нового клієнта
        clientId = await new Promise((resolve, reject) => {
          database.run(
            'INSERT INTO clients (login, password, email, phone, location, company_name) VALUES (?, ?, ?, ?, ?, ?)',
            [login, hashedPassword, clientData.email, clientData.phone, clientData.location, clientName],
            function(err) {
              if (err) {
                reject(err);
              } else {
                resolve(this.lastID);
              }
            }
          );
        });
      }
      
      if (!clientId) {
        console.warn('Failed to create or find client: ' + clientName);
        continue;
      }
      
      // Додаємо категорії для клієнта
      for (const categoryId of clientData.categories) {
        await new Promise((resolve, reject) => {
          database.run(
            'INSERT OR IGNORE INTO client_categories (client_id, category_id) VALUES (?, ?)',
            [clientId, categoryId],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      
      // Додаємо коефіцієнти для продуктів клієнта
      for (let i = 0; i < clientData.products.length; i++) {
        const product = clientData.products[i];
        const productKey = product.productName + '_' + (product.categoryName || 'unknown');
        const productId = productIdMap.get(productKey);
        
        if (productId) {
          await new Promise((resolve, reject) => {
            database.run(
              'INSERT INTO client_product_coefficients (client_id, product_id, coefficient) VALUES (?, ?, ?) ON CONFLICT(client_id, product_id) DO UPDATE SET coefficient = excluded.coefficient, updated_at = CURRENT_TIMESTAMP',
              [clientId, productId, product.coefficient],
              function(err) {
                if (err) {
                  console.error('Error setting coefficient for client ' + clientName + ', product ' + product.productName + ':', err);
                  reject(err);
                } else {
                  resolve();
                }
              }
            );
          });
        } else {
          console.warn('Product not found: ' + product.productName + ' (' + product.categoryName + ')');
        }
      }
      
      generatedCredentials.push({
        clientName: clientName,
        login: login,
        password: password
      });
    }
    
    console.log('\n=== Import completed successfully! ===\n');
    console.log('Generated credentials:');
    console.log('='.repeat(80));
    generatedCredentials.forEach(function(cred, index) {
      console.log((index + 1) + '. ' + cred.clientName);
      console.log('   Login: ' + cred.login);
      console.log('   Password: ' + cred.password);
      console.log('');
    });
    
    // Зберігаємо credentials в файл
    const fs = require('fs');
    const credentialsPath = path.join(__dirname, '../../imported_credentials.txt');
    const credentialsText = generatedCredentials.map(function(cred, index) {
      return (index + 1) + '. ' + cred.clientName + '\n   Login: ' + cred.login + '\n   Password: ' + cred.password + '\n';
    }).join('\n');
    
    fs.writeFileSync(credentialsPath, credentialsText, 'utf8');
    console.log('\nCredentials saved to: ' + credentialsPath);
    
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
};

// Запускаємо імпорт
if (require.main === module) {
  importData()
    .then(function() {
      console.log('\nImport process completed!');
      process.exit(0);
    })
    .catch(function(error) {
      console.error('\nImport failed:', error);
      process.exit(1);
    });
}

module.exports = { importData };


const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// Handle both old and new export formats
const authenticate = authMiddleware.authenticate || authMiddleware;

if (typeof authenticate !== 'function') {
  throw new Error('authenticate middleware is not a function. Got: ' + typeof authenticate);
}

const router = express.Router();

// All admin routes require authentication
router.use(authenticate);

// ========== CLIENTS MANAGEMENT ==========

// Get all clients
router.get('/clients', (req, res) => {
  const database = db.getDb();
  
  database.all(`
    SELECT 
      c.*,
      GROUP_CONCAT(DISTINCT cc.category_id) as category_ids
    FROM clients c
    LEFT JOIN client_categories cc ON c.id = cc.client_id
    GROUP BY c.id
    ORDER BY COALESCE(c.company_name, c.login) ASC
  `, (err, clients) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const clientsWithCategories = clients.map(client => ({
      ...client,
      category_ids: client.category_ids ? client.category_ids.split(',').map(Number) : []
    }));
    
    res.json(clientsWithCategories);
  });
});

// Get single client
router.get('/clients/:id', (req, res) => {
  const database = db.getDb();
  const clientId = req.params.id;
  
  database.get('SELECT * FROM clients WHERE id = ?', [clientId], (err, client) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  });
});

// Create new client
router.post('/clients', async (req, res) => {
  const { login, password, email, phone, location, company_name, category_ids } = req.body;
  
  if (!login || !password) {
    return res.status(400).json({ error: 'Login and password are required' });
  }

  const database = db.getDb();
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    database.run(
      'INSERT INTO clients (login, password, email, phone, location, company_name) VALUES (?, ?, ?, ?, ?, ?)',
      [login, hashedPassword, email || null, phone || null, location || null, company_name || null],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Login already exists' });
          }
          return res.status(500).json({ error: err.message });
        }
        
        const clientId = this.lastID;
        
        // Set categories for client
        if (category_ids && category_ids.length > 0) {
          const stmt = database.prepare('INSERT INTO client_categories (client_id, category_id) VALUES (?, ?)');
          category_ids.forEach(catId => {
            stmt.run([clientId, catId]);
          });
          stmt.finalize();
        }
        
        res.status(201).json({ id: clientId, message: 'Client created successfully' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update client
router.put('/clients/:id', async (req, res) => {
  const { login, password, email, phone, location, company_name, category_ids } = req.body;
  const clientId = req.params.id;
  
  const database = db.getDb();
  
  try {
    let updateQuery = 'UPDATE clients SET login = ?, email = ?, phone = ?, location = ?, company_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    let params = [login, email || null, phone || null, location || null, company_name || null, clientId];
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery = 'UPDATE clients SET login = ?, password = ?, email = ?, phone = ?, location = ?, company_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      params = [login, hashedPassword, email || null, phone || null, location || null, company_name || null, clientId];
    }
    
    database.run(updateQuery, params, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ error: 'Login already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      // Update categories
      database.run('DELETE FROM client_categories WHERE client_id = ?', [clientId], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        if (category_ids && category_ids.length > 0) {
          const stmt = database.prepare('INSERT INTO client_categories (client_id, category_id) VALUES (?, ?)');
          category_ids.forEach(catId => {
            stmt.run([clientId, catId]);
          });
          stmt.finalize();
        }
        
        res.json({ message: 'Client updated successfully' });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete client
router.delete('/clients/:id', (req, res) => {
  const database = db.getDb();
  const clientId = req.params.id;
  
  database.run('DELETE FROM clients WHERE id = ?', [clientId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Client deleted successfully' });
  });
});

// ========== PRODUCTS MANAGEMENT ==========

// Get all products
router.get('/products', (req, res) => {
  const database = db.getDb();
  
  database.all(`
    SELECT 
      p.*,
      c.name as category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    ORDER BY p.created_at DESC
  `, (err, products) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(products);
  });
});

// Get single product
router.get('/products/:id', (req, res) => {
  const database = db.getDb();
  const productId = req.params.id;
  
  database.get(`
    SELECT 
      p.*,
      c.name as category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `, [productId], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  });
});

// Create new product
router.post('/products', (req, res) => {
  const { name, category_id, cost_price, image_url, unit, price_currency, cost_price_eur, cost_price_uah, card_color } = req.body;
  
  if (!name || !category_id) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  const database = db.getDb();
  
  // Use new fields if provided, otherwise fallback to cost_price
  const priceCurrency = price_currency || 'EUR';
  const priceEur = cost_price_eur !== undefined ? cost_price_eur : (priceCurrency === 'EUR' ? (cost_price || 0) : null);
  const priceUah = cost_price_uah !== undefined ? cost_price_uah : (priceCurrency === 'UAH' ? (cost_price || 0) : null);
  const fallbackPrice = cost_price || 0;
  
  database.run(
    'INSERT INTO products (name, category_id, cost_price, image_url, unit, price_currency, cost_price_eur, cost_price_uah, card_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, category_id, fallbackPrice, image_url || null, unit || 'шт', priceCurrency, priceEur, priceUah, card_color || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, message: 'Product created successfully' });
    }
  );
});

// Update product
router.put('/products/:id', (req, res) => {
  const { name, category_id, cost_price, image_url, unit, price_currency, cost_price_eur, cost_price_uah, card_color } = req.body;
  const productId = req.params.id;
  
  const database = db.getDb();
  
  // Use new fields if provided, otherwise fallback to cost_price
  const priceCurrency = price_currency || 'EUR';
  const priceEur = cost_price_eur !== undefined ? cost_price_eur : (priceCurrency === 'EUR' ? (cost_price || 0) : null);
  const priceUah = cost_price_uah !== undefined ? cost_price_uah : (priceCurrency === 'UAH' ? (cost_price || 0) : null);
  const fallbackPrice = cost_price || 0;
  
  database.run(
    'UPDATE products SET name = ?, category_id = ?, cost_price = ?, image_url = ?, unit = ?, price_currency = ?, cost_price_eur = ?, cost_price_uah = ?, card_color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, category_id, fallbackPrice, image_url || null, unit || 'шт', priceCurrency, priceEur, priceUah, card_color || null, productId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Product updated successfully' });
    }
  );
});

// Delete product
router.delete('/products/:id', (req, res) => {
  const database = db.getDb();
  const productId = req.params.id;
  
  database.run('DELETE FROM products WHERE id = ?', [productId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Product deleted successfully' });
  });
});

// ========== COEFFICIENTS MANAGEMENT ==========

// Get coefficients for a product
router.get('/products/:id/coefficients', (req, res) => {
  const database = db.getDb();
  const productId = req.params.id;
  
  database.all(`
    SELECT 
      cpc.*,
      cl.login as client_login,
      cl.email as client_email
    FROM client_product_coefficients cpc
    JOIN clients cl ON cpc.client_id = cl.id
    WHERE cpc.product_id = ?
  `, [productId], (err, coefficients) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(coefficients);
  });
});

// Get coefficients for a client
router.get('/clients/:id/coefficients', (req, res) => {
  const database = db.getDb();
  const clientId = req.params.id;
  
  database.all(`
    SELECT 
      cpc.*,
      p.name as product_name,
      p.cost_price,
      cat.name as category_name
    FROM client_product_coefficients cpc
    JOIN products p ON cpc.product_id = p.id
    JOIN categories cat ON p.category_id = cat.id
    WHERE cpc.client_id = ?
  `, [clientId], (err, coefficients) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(coefficients);
  });
});

// Set coefficient for client-product pair
router.post('/coefficients', (req, res) => {
  const { client_id, product_id, coefficient } = req.body;
  
  if (!client_id || !product_id || coefficient === undefined) {
    return res.status(400).json({ error: 'Client ID, Product ID and coefficient are required' });
  }

  const database = db.getDb();
  
  database.run(
    `INSERT INTO client_product_coefficients (client_id, product_id, coefficient)
     VALUES (?, ?, ?)
     ON CONFLICT(client_id, product_id) DO UPDATE SET
     coefficient = excluded.coefficient,
     updated_at = CURRENT_TIMESTAMP`,
    [client_id, product_id, coefficient],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Coefficient set successfully' });
    }
  );
});

// Update coefficient
router.put('/coefficients/:id', (req, res) => {
  const { coefficient } = req.body;
  const coefficientId = req.params.id;
  
  if (coefficient === undefined) {
    return res.status(400).json({ error: 'Coefficient is required' });
  }

  const database = db.getDb();
  
  database.run(
    'UPDATE client_product_coefficients SET coefficient = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [coefficient, coefficientId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Coefficient updated successfully' });
    }
  );
});

// Delete coefficient
router.delete('/coefficients/:id', (req, res) => {
  const database = db.getDb();
  const coefficientId = req.params.id;
  
  database.run('DELETE FROM client_product_coefficients WHERE id = ?', [coefficientId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Coefficient deleted successfully' });
  });
});

// ========== CATEGORIES MANAGEMENT ==========

// Get all categories
router.get('/categories', (req, res) => {
  const database = db.getDb();
  
  database.all('SELECT * FROM categories ORDER BY name', (err, categories) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(categories);
  });
});

// Get single category
router.get('/categories/:id', (req, res) => {
  const database = db.getDb();
  const categoryId = req.params.id;
  
  database.get('SELECT * FROM categories WHERE id = ?', [categoryId], (err, category) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  });
});

// Create new category
router.post('/categories', (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const database = db.getDb();
  
  database.run(
    'INSERT INTO categories (name) VALUES (?)',
    [name],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ error: 'Category with this name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, message: 'Category created successfully' });
    }
  );
});

// Update category
router.put('/categories/:id', (req, res) => {
  const { name } = req.body;
  const categoryId = req.params.id;
  
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const database = db.getDb();
  
  database.run(
    'UPDATE categories SET name = ? WHERE id = ?',
    [name, categoryId],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ error: 'Category with this name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.json({ message: 'Category updated successfully' });
    }
  );
});

// Delete category
router.delete('/categories/:id', (req, res) => {
  const database = db.getDb();
  const categoryId = req.params.id;
  
  // Перевіряємо чи є товари в цій категорії
  database.get(
    'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
    [categoryId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (result.count > 0) {
        return res.status(400).json({ 
          error: `Cannot delete category: there are ${result.count} products in this category` 
        });
      }
      
      // Видаляємо категорію
      database.run('DELETE FROM categories WHERE id = ?', [categoryId], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ message: 'Category deleted successfully' });
      });
    }
  );
});

// Upload product image
router.post('/products/:id/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const productId = req.params.id;
  const database = db.getDb();
  
  // Формуємо URL для зображення
  // В production це буде /api/uploads/images/filename
  // В development це буде http://localhost:5000/api/uploads/images/filename
  const imageUrl = `/api/uploads/images/${req.file.filename}`;
  
  // Оновлюємо image_url в базі даних
  database.run(
    'UPDATE products SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [imageUrl, productId],
    function(err) {
      if (err) {
        // Видаляємо завантажений файл у разі помилки
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        message: 'Image uploaded successfully',
        image_url: imageUrl,
        filename: req.file.filename
      });
    }
  );
});

// Delete product image
router.delete('/products/:id/image', (req, res) => {
  const productId = req.params.id;
  const database = db.getDb();
  
  // Отримуємо поточне image_url
  database.get(
    'SELECT image_url FROM products WHERE id = ?',
    [productId],
    function(err, product) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Видаляємо файл з диску, якщо він існує
      // Use DATA_DIR if available (Railway Volume), otherwise use local path
      const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');
      if (product.image_url && product.image_url.startsWith('/api/uploads/images/')) {
        const filename = path.basename(product.image_url);
        const filePath = path.join(DATA_DIR, 'uploads', 'images', filename);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('Deleted image file:', filePath);
        } else {
          console.warn('Image file not found for deletion:', filePath);
        }
      }
      
      // Оновлюємо image_url на null
      database.run(
        'UPDATE products SET image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [productId],
        function(updateErr) {
          if (updateErr) {
            return res.status(500).json({ error: updateErr.message });
          }
          
          res.json({ message: 'Image deleted successfully' });
        }
      );
    }
  );
});

// Add QR test products (10 for each category)
router.post('/products/add-qr-test-products', async (req, res) => {
  try {
    const { addQRTestProducts } = require('../scripts/addQRTestProducts');
    const result = await addQRTestProducts();
    res.json({
      success: true,
      message: `Додано ${result.added} товарів, пропущено ${result.skipped} (вже існують)`,
      ...result
    });
  } catch (error) {
    console.error('Error adding QR test products:', error);
    res.status(500).json({ 
      error: 'Помилка додавання тестових товарів',
      details: error.message 
    });
  }
});

// Delete all products from "Колоранти" category
router.post('/products/delete-colorant-products', async (req, res) => {
  try {
    const { deleteColorantProducts } = require('../scripts/deleteColorantProducts');
    const result = await deleteColorantProducts();
    res.json({
      success: true,
      message: `Видалено ${result.deleted} товарів з категорії "Колоранти"`,
      ...result
    });
  } catch (error) {
    console.error('Error deleting colorant products:', error);
    res.status(500).json({ 
      error: 'Помилка видалення товарів',
      details: error.message 
    });
  }
});

// Add test products for all categories
router.post('/products/add-test-products', async (req, res) => {
  const database = db.getDb();
  
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

  try {
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
    const results = [];

    // Додаємо товари для кожної категорії
    for (const [categoryName, products] of Object.entries(testProducts)) {
      const categoryId = categoryMap[categoryName];

      if (!categoryId) {
        results.push({ category: categoryName, status: 'not_found' });
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

      results.push({ 
        category: categoryName, 
        status: 'success',
        products: products.length 
      });
    }

    res.json({
      success: true,
      message: `Додано ${addedCount} товарів, пропущено ${skippedCount} (вже існують)`,
      added: addedCount,
      skipped: skippedCount,
      results: results
    });
  } catch (error) {
    console.error('Error adding test products:', error);
    res.status(500).json({ 
      error: 'Помилка додавання тестових товарів',
      details: error.message 
    });
  }
});

// Add filter products (10 specific products for Filters category)
router.post('/products/add-filter-products', async (req, res) => {
  const database = db.getDb();
  
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

  try {
    // Отримуємо категорію "Фільтри"
    const category = await new Promise((resolve, reject) => {
      database.get('SELECT * FROM categories WHERE name = ?', ['Фільтри'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category "Фільтри" not found' });
    }
    
    let addedCount = 0;
    let skippedCount = 0;
    const results = [];
    
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
        skippedCount++;
        results.push({ name: productName, status: 'skipped', reason: 'already exists' });
        continue;
      }
      
      // Додаємо товар
      await new Promise((resolve, reject) => {
        database.run(
          'INSERT INTO products (name, category_id, cost_price) VALUES (?, ?, ?)',
          [productName, category.id, 0],
          function(err) {
            if (err) reject(err);
            else {
              addedCount++;
              results.push({ name: productName, status: 'added', id: this.lastID });
              resolve();
            }
          }
        );
      });
    }
    
    res.json({
      success: true,
      message: `Додано ${addedCount} товарів, пропущено ${skippedCount} (вже існують)`,
      added: addedCount,
      skipped: skippedCount,
      results: results
    });
  } catch (error) {
    console.error('Error adding filter products:', error);
    res.status(500).json({ 
      error: 'Помилка додавання товарів категорії "Фільтри"',
      details: error.message 
    });
  }
});

// ========== EMAIL SUBSCRIPTIONS MANAGEMENT ==========

// Get all email subscriptions
router.get('/email-subscriptions', (req, res) => {
  const database = db.getDb();
  
  database.all(`
    SELECT 
      id,
      email,
      category,
      created_at
    FROM email_subscriptions
    ORDER BY created_at DESC
  `, (err, subscriptions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(subscriptions);
  });
});

// Delete email subscription
router.delete('/email-subscriptions/:id', (req, res) => {
  const database = db.getDb();
  const subscriptionId = req.params.id;
  
  database.run('DELETE FROM email_subscriptions WHERE id = ?', [subscriptionId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    res.json({ message: 'Subscription deleted successfully' });
  });
});

// ========== DATABASE DIAGNOSTICS ==========

// Check database state - products, categories, client categories
router.get('/db-diagnostics', (req, res) => {
  const database = db.getDb();
  
  // Get all products with categories
  database.all(`
    SELECT 
      p.id,
      p.name,
      p.cost_price,
      c.id as category_id,
      c.name as category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    ORDER BY c.name, p.name
  `, (err, products) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Get all categories with product counts
    database.all(`
      SELECT 
        c.id,
        c.name,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY c.name
    `, (err, categories) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Get all clients with their assigned categories
      database.all(`
        SELECT 
          cl.id as client_id,
          cl.login,
          cl.company_name,
          GROUP_CONCAT(c.name) as assigned_categories,
          GROUP_CONCAT(c.id) as assigned_category_ids
        FROM clients cl
        LEFT JOIN client_categories cc ON cl.id = cc.client_id
        LEFT JOIN categories c ON cc.category_id = c.id
        GROUP BY cl.id, cl.login, cl.company_name
        ORDER BY cl.login
      `, (err, clients) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Get products in "Фільтри" category
        database.all(`
          SELECT 
            p.id,
            p.name,
            p.cost_price
          FROM products p
          JOIN categories c ON p.category_id = c.id
          WHERE c.name = 'Фільтри'
          ORDER BY p.name
        `, (err, filterProducts) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Get which clients have access to "Фільтри" category
          database.all(`
            SELECT 
              cl.id as client_id,
              cl.login,
              cl.company_name
            FROM clients cl
            JOIN client_categories cc ON cl.id = cc.client_id
            JOIN categories c ON cc.category_id = c.id
            WHERE c.name = 'Фільтри'
            ORDER BY cl.login
          `, (err, clientsWithFilterAccess) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            res.json({
              total_products: products.length,
              total_categories: categories.length,
              total_clients: clients.length,
              categories: categories,
              filter_category: {
                name: 'Фільтри',
                products_count: filterProducts.length,
                products: filterProducts,
                clients_with_access: clientsWithFilterAccess.length,
                clients_with_access_list: clientsWithFilterAccess
              },
              clients: clients.map(client => ({
                ...client,
                assigned_categories: client.assigned_categories ? client.assigned_categories.split(',') : [],
                assigned_category_ids: client.assigned_category_ids ? client.assigned_category_ids.split(',').map(Number) : [],
                has_filter_access: client.assigned_category_ids ? client.assigned_category_ids.split(',').map(Number).includes(4) : false
              }))
            });
          });
        });
      });
    });
  });
});

// ========== QR PAGES MANAGEMENT ==========

// Get all QR pages with their assigned categories
router.get('/qr-pages', (req, res) => {
  const database = db.getDb();
  
  database.all(`
    SELECT 
      qpc.qr_page_url,
      qpc.category_id,
      c.name as category_name,
      qpc.id as mapping_id
    FROM qr_page_categories qpc
    JOIN categories c ON qpc.category_id = c.id
    ORDER BY qpc.qr_page_url, c.name
  `, (err, mappings) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Group by QR page URL
    const qrPages = {};
    mappings.forEach(mapping => {
      if (!qrPages[mapping.qr_page_url]) {
        qrPages[mapping.qr_page_url] = [];
      }
      qrPages[mapping.qr_page_url].push({
        category_id: mapping.category_id,
        category_name: mapping.category_name,
        mapping_id: mapping.mapping_id
      });
    });
    
    res.json(qrPages);
  });
});

// Get categories for a specific QR page
router.get('/qr-pages/:url/categories', (req, res) => {
  const database = db.getDb();
  const { url } = req.params;
  
  database.all(`
    SELECT 
      qpc.category_id,
      c.name as category_name,
      qpc.id as mapping_id
    FROM qr_page_categories qpc
    JOIN categories c ON qpc.category_id = c.id
    WHERE qpc.qr_page_url = ?
    ORDER BY c.name
  `, [url], (err, categories) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(categories);
  });
});

// Add category to QR page
router.post('/qr-pages/:url/categories', (req, res) => {
  const database = db.getDb();
  const { url } = req.params;
  const { category_id } = req.body;
  
  if (!category_id) {
    return res.status(400).json({ error: 'category_id is required' });
  }
  
  database.run(
    'INSERT OR IGNORE INTO qr_page_categories (qr_page_url, category_id) VALUES (?, ?)',
    [url, category_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(409).json({ error: 'Category already assigned to this QR page' });
      }
      res.json({ 
        success: true, 
        message: 'Category added to QR page',
        id: this.lastID 
      });
    }
  );
});

// Remove category from QR page
router.delete('/qr-pages/:url/categories/:categoryId', (req, res) => {
  const database = db.getDb();
  const { url, categoryId } = req.params;
  
  database.run(
    'DELETE FROM qr_page_categories WHERE qr_page_url = ? AND category_id = ?',
    [url, categoryId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Mapping not found' });
      }
      res.json({ 
        success: true, 
        message: 'Category removed from QR page' 
      });
    }
  );
});

module.exports = router;


const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

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
    ORDER BY c.created_at DESC
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
  const { login, password, email, phone, location, category_ids } = req.body;
  
  if (!login || !password) {
    return res.status(400).json({ error: 'Login and password are required' });
  }

  const database = db.getDb();
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    database.run(
      'INSERT INTO clients (login, password, email, phone, location) VALUES (?, ?, ?, ?, ?)',
      [login, hashedPassword, email || null, phone || null, location || null],
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
  const { login, password, email, phone, location, category_ids } = req.body;
  const clientId = req.params.id;
  
  const database = db.getDb();
  
  try {
    let updateQuery = 'UPDATE clients SET login = ?, email = ?, phone = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    let params = [login, email || null, phone || null, location || null, clientId];
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery = 'UPDATE clients SET login = ?, password = ?, email = ?, phone = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      params = [login, hashedPassword, email || null, phone || null, location || null, clientId];
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
  const { name, category_id, cost_price, image_url } = req.body;
  
  if (!name || !category_id) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  const database = db.getDb();
  
  database.run(
    'INSERT INTO products (name, category_id, cost_price, image_url) VALUES (?, ?, ?, ?)',
    [name, category_id, cost_price || 0, image_url || null],
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
  const { name, category_id, cost_price, image_url } = req.body;
  const productId = req.params.id;
  
  const database = db.getDb();
  
  database.run(
    'UPDATE products SET name = ?, category_id = ?, cost_price = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, category_id, cost_price || 0, image_url || null, productId],
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

module.exports = router;


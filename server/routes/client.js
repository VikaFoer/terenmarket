const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

// Handle both old and new export formats
const authenticate = authMiddleware.authenticate || authMiddleware;

if (typeof authenticate !== 'function') {
  throw new Error('authenticate middleware is not a function. Got: ' + typeof authenticate);
}

const router = express.Router();

// All client routes require authentication
router.use(authenticate);

// Get products visible to the authenticated client
router.get('/products', (req, res) => {
  const database = db.getDb();
  const clientId = req.user.id;
  
  // Get categories available to this client
  database.all(`
    SELECT DISTINCT
      p.id,
      p.name,
      p.image_url,
      c.name as category_name,
      c.id as category_id,
      COALESCE(cpc.coefficient, 1.0) as coefficient,
      (p.cost_price * COALESCE(cpc.coefficient, 1.0)) as price
    FROM products p
    JOIN categories c ON p.category_id = c.id
    JOIN client_categories cc ON c.id = cc.category_id AND cc.client_id = ?
    LEFT JOIN client_product_coefficients cpc ON p.id = cpc.product_id AND cpc.client_id = ?
    ORDER BY c.name, p.name
  `, [clientId, clientId], (err, products) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(products);
  });
});

// Get categories available to the authenticated client
router.get('/categories', (req, res) => {
  const database = db.getDb();
  const clientId = req.user.id;
  
  database.all(`
    SELECT DISTINCT
      c.id,
      c.name,
      COUNT(p.id) as product_count
    FROM categories c
    JOIN client_categories cc ON c.id = cc.category_id AND cc.client_id = ?
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id, c.name
    ORDER BY c.name
  `, [clientId], (err, categories) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(categories);
  });
});

// Get client's own info
router.get('/profile', (req, res) => {
  const database = db.getDb();
  const clientId = req.user.id;
  
  database.get('SELECT id, login, email, phone, location FROM clients WHERE id = ?', [clientId], (err, client) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  });
});

module.exports = router;


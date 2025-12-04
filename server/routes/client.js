const express = require('express');
const axios = require('axios');
const https = require('https');
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

// Helper function to get EUR exchange rate from NBU API
const getEURRate = async () => {
  try {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const nbuUrl = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=EUR&json';
    
    const response = await axios.get(nbuUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      httpsAgent: httpsAgent
    });
    
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const rate = response.data[0].rate;
      if (rate && typeof rate === 'number' && rate > 0) {
        return rate;
      }
    }
  } catch (error) {
    console.error('[Client API] Failed to fetch EUR rate:', error.message);
  }
  return null;
};

// Get products visible to the authenticated client
router.get('/products', async (req, res) => {
  const database = db.getDb();
  const clientId = req.user.id;
  
  try {
    // Get EUR exchange rate
    const eurRate = await getEURRate();
    if (!eurRate) {
      console.warn('[Client API] EUR rate not available, using default calculation');
    }
    
    // Get categories available to this client
    database.all(`
      SELECT DISTINCT
        p.id,
        p.name,
        p.image_url,
        p.cost_price,
        p.unit,
        c.name as category_name,
        c.id as category_id,
        COALESCE(cpc.coefficient, 1.0) as coefficient
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN client_categories cc ON c.id = cc.category_id AND cc.client_id = ?
      LEFT JOIN client_product_coefficients cpc ON p.id = cpc.product_id AND cpc.client_id = ?
      ORDER BY c.name, p.name
    `, [clientId, clientId], (err, products) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Calculate prices with EUR rate
      const productsWithPrices = products.map(product => {
        const coefficient = product.coefficient || 1.0;
        // cost_price is in EUR, multiply by EUR rate and coefficient
        const priceInUAH = eurRate 
          ? (product.cost_price * eurRate * coefficient)
          : (product.cost_price * coefficient); // Fallback if rate not available
        
        return {
          ...product,
          cost_price_eur: product.cost_price, // Original price in EUR
          price: priceInUAH, // Final price in UAH (EUR * rate * coefficient)
          eur_rate: eurRate // Include rate for reference
        };
      });
      
      res.json(productsWithPrices);
    });
  } catch (error) {
    console.error('[Client API] Error fetching products:', error);
    res.status(500).json({ error: 'Помилка отримання товарів' });
  }
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

// Get all categories (for client to choose which to display)
router.get('/categories/all', (req, res) => {
  const database = db.getDb();
  
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


const express = require('express');
const axios = require('axios');
const https = require('https');
const router = express.Router();

// Create HTTPS agent that doesn't reject unauthorized certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Helper function to get exchange rate from NBU API
// Official NBU API documentation: https://bank.gov.ua/ua/open-data/api-dev
const getRateFromNBU = async (code) => {
  try {
    const currencyCode = code.toUpperCase(); // EUR or USD
    console.log(`[NBU API] Fetching rate for ${currencyCode}...`);
    
    // NBU API endpoint for specific currency
    // Format: https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json
    const nbuUrl = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${currencyCode}&json`;
    console.log(`[NBU API] Request URL: ${nbuUrl}`);
    
    const nbuResponse = await axios.get(nbuUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      httpsAgent: httpsAgent
    });
    
    console.log(`[NBU API] Response status: ${nbuResponse.status}`);
    
    if (nbuResponse.data && Array.isArray(nbuResponse.data) && nbuResponse.data.length > 0) {
      const rateData = nbuResponse.data[0];
      const rate = rateData.rate;
      
      if (rate && typeof rate === 'number' && rate > 0) {
        console.log(`[NBU API] Found ${currencyCode} rate: ${rate} (date: ${rateData.exchangedate || 'N/A'})`);
        return rate;
      } else {
        console.warn(`[NBU API] Invalid rate value for ${currencyCode}:`, rate);
      }
    } else {
      console.warn(`[NBU API] No data returned for ${currencyCode}`);
    }
  } catch (error) {
    console.error(`[NBU API] Failed for ${code}:`, error.message);
    if (error.response) {
      console.error(`[NBU API] Response status: ${error.response.status}`);
      console.error(`[NBU API] Response data:`, error.response.data);
    }
  }
  
  return null;
};

// Get all exchange rates (EUR and USD)
// IMPORTANT: This route must be registered BEFORE /rates/:currencyCode
router.get('/rates', async (req, res) => {
  try {
    console.log('[Currency API] GET /rates - fetching all rates from NBU...');
    const rates = {};
    
    // Fetch both rates in parallel for better performance
    const [eurRate, usdRate] = await Promise.all([
      getRateFromNBU('EUR'),
      getRateFromNBU('USD')
    ]);
    
    if (eurRate) {
      rates.EUR = eurRate;
      console.log('[Currency API] EUR rate set:', rates.EUR);
    } else {
      console.warn('[Currency API] EUR rate not available');
    }
    
    if (usdRate) {
      rates.USD = usdRate;
      console.log('[Currency API] USD rate set:', rates.USD);
    } else {
      console.warn('[Currency API] USD rate not available');
    }
    
    const result = {
      date: new Date().toISOString().split('T')[0],
      rates: []
    };
    
    if (rates.EUR) {
      result.rates.push({
        code: 'EUR',
        name: 'Євро',
        rate: rates.EUR
      });
    }
    
    if (rates.USD) {
      result.rates.push({
        code: 'USD',
        name: 'Долар США',
        rate: rates.USD
      });
    }
    
    console.log('[Currency API] Sending result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error fetching exchange rates:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Не вдалося отримати курси валют',
      details: error.message 
    });
  }
});

// Get exchange rate for specific currency (EUR or USD)
// IMPORTANT: This route must be registered AFTER /rates route
router.get('/rates/:currencyCode', async (req, res) => {
  try {
    const { currencyCode } = req.params;
    const code = currencyCode.toUpperCase();
    
    console.log(`[Currency API] GET /rates/${code} - fetching rate for ${code}`);
    
    if (code !== 'EUR' && code !== 'USD') {
      return res.status(400).json({ error: 'Підтримуються тільки EUR та USD' });
    }
    
    // Get rate from NBU API
    const rate = await getRateFromNBU(code);
    
    if (!rate) {
      console.warn(`Rate ${code} not found from NBU API`);
      return res.status(404).json({ 
        error: `Курс ${code} не знайдено`,
        message: 'Спробуйте пізніше'
      });
    }
    
    const result = {
      code: code,
      name: code === 'EUR' ? 'Євро' : 'Долар США',
      rate: rate,
      date: new Date().toISOString().split('T')[0]
    };
    
    console.log(`[Currency API] Sending result for ${code}:`, result);
    res.json(result);
  } catch (error) {
    console.error(`Error fetching exchange rate for ${req.params.currencyCode}:`, error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Не вдалося отримати курс валюти',
      details: error.message 
    });
  }
});

module.exports = router;

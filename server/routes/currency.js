const express = require('express');
const axios = require('axios');
const router = express.Router();

// Parse HTML to extract exchange rates from udinform.com
const parseUdinformRates = (html) => {
  const rates = {};
  
  // Remove script and style tags to avoid false matches
  const cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Try multiple patterns to find rates
  // Pattern 1: Look for table rows with currency codes
  const tableRowPattern = /<tr[^>]*>[\s\S]*?(EUR|USD|євро|долар)[\s\S]*?<\/tr>/gi;
  let match;
  while ((match = tableRowPattern.exec(cleanHtml)) !== null) {
    const row = match[0];
    const currencyCode = match[1].toUpperCase();
    const code = currencyCode.includes('EUR') || currencyCode.includes('ЄВРО') ? 'EUR' : 
                 currencyCode.includes('USD') || currencyCode.includes('ДОЛАР') ? 'USD' : null;
    
    if (code) {
      // Find all numbers in the row
      const numbers = row.match(/\d+[.,]\d{2,4}/g);
      if (numbers && numbers.length > 0) {
        // Take the largest number (usually the rate)
        const rateValues = numbers.map(n => parseFloat(n.replace(',', '.')));
        const maxRate = Math.max(...rateValues);
        // Filter out unrealistic values (rates should be between 20 and 100 for UAH)
        if (maxRate >= 20 && maxRate <= 100) {
          rates[code] = maxRate;
        }
      }
    }
  }
  
  // Pattern 2: Look for specific currency patterns with numbers nearby
  const eurPatterns = [
    /EUR[^<]*?(\d+[.,]\d{2,4})/i,
    /євро[^<]*?(\d+[.,]\d{2,4})/i,
    /(\d+[.,]\d{2,4})[^<]*?EUR/i,
    /(\d+[.,]\d{2,4})[^<]*?євро/i
  ];
  
  const usdPatterns = [
    /USD[^<]*?(\d+[.,]\d{2,4})/i,
    /долар[^<]*?(\d+[.,]\d{2,4})/i,
    /(\d+[.,]\d{2,4})[^<]*?USD/i,
    /(\d+[.,]\d{2,4})[^<]*?долар/i
  ];
  
  // Try EUR patterns
  if (!rates.EUR) {
    for (const pattern of eurPatterns) {
      const match = cleanHtml.match(pattern);
      if (match) {
        const rate = parseFloat(match[1].replace(',', '.'));
        if (rate >= 20 && rate <= 100) {
          rates.EUR = rate;
          break;
        }
      }
    }
  }
  
  // Try USD patterns
  if (!rates.USD) {
    for (const pattern of usdPatterns) {
      const match = cleanHtml.match(pattern);
      if (match) {
        const rate = parseFloat(match[1].replace(',', '.'));
        if (rate >= 20 && rate <= 100) {
          rates.USD = rate;
          break;
        }
      }
    }
  }
  
  return rates;
};

// Get exchange rates from udinform.com
router.get('/rates', async (req, res) => {
  try {
    const response = await axios.get('https://www.udinform.com/index.php?option=com_dealingquotation&task=forexukrarchive', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent: httpsAgent
    });
    
    const rates = parseUdinformRates(response.data);
    
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
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching exchange rates:', error.message);
    res.status(500).json({ 
      error: 'Не вдалося отримати курси валют',
      details: error.message 
    });
  }
});

// Get exchange rate for specific currency (EUR or USD)
router.get('/rates/:currencyCode', async (req, res) => {
  try {
    const { currencyCode } = req.params;
    const code = currencyCode.toUpperCase();
    
    if (code !== 'EUR' && code !== 'USD') {
      return res.status(400).json({ error: 'Підтримуються тільки EUR та USD' });
    }
    
    const response = await axios.get('https://www.udinform.com/index.php?option=com_dealingquotation&task=forexukrarchive', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent: httpsAgent
    });
    
    const rates = parseUdinformRates(response.data);
    const rate = rates[code];
    
    if (!rate) {
      return res.status(404).json({ error: `Курс ${code} не знайдено` });
    }
    
    res.json({
      code: code,
      name: code === 'EUR' ? 'Євро' : 'Долар США',
      rate: rate,
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error fetching exchange rate:', error.message);
    res.status(500).json({ 
      error: 'Не вдалося отримати курс валюти',
      details: error.message 
    });
  }
});

module.exports = router;


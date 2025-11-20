const express = require('express');
const axios = require('axios');
const https = require('https');
const router = express.Router();

// Create HTTPS agent that doesn't reject unauthorized certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Parse HTML to extract exchange rates from udinform.com
const parseUdinformRates = (html) => {
  const rates = {};
  
  if (!html || typeof html !== 'string') {
    console.error('Invalid HTML provided to parseUdinformRates');
    return rates;
  }
  
  // Remove script and style tags to avoid false matches
  const cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                         .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                         .replace(/<!--[\s\S]*?-->/g, '');
  
  console.log('Cleaned HTML length:', cleanHtml.length);
  
  // Try to find tables first
  const tableMatches = cleanHtml.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
  if (tableMatches) {
    console.log('Found', tableMatches.length, 'tables');
    tableMatches.forEach((table, index) => {
      // Look for EUR in table
      if (table.match(/EUR|євро|ЄВРО/i)) {
        const numbers = table.match(/\d{1,2}[.,]\d{2,4}/g);
        if (numbers) {
          const validRates = numbers.map(n => parseFloat(n.replace(',', '.')))
                                    .filter(r => r >= 20 && r <= 100);
          if (validRates.length > 0) {
            rates.EUR = Math.max(...validRates);
            console.log(`Found EUR in table ${index}:`, rates.EUR);
          }
        }
      }
      // Look for USD in table
      if (table.match(/USD|долар|ДОЛАР/i)) {
        const numbers = table.match(/\d{1,2}[.,]\d{2,4}/g);
        if (numbers) {
          const validRates = numbers.map(n => parseFloat(n.replace(',', '.')))
                                    .filter(r => r >= 20 && r <= 100);
          if (validRates.length > 0) {
            rates.USD = Math.max(...validRates);
            console.log(`Found USD in table ${index}:`, rates.USD);
          }
        }
      }
    });
  }
  
  // Pattern 1: Look for table rows with currency codes
  const tableRowPattern = /<tr[^>]*>[\s\S]*?(EUR|USD|євро|ЄВРО|долар|ДОЛАР)[\s\S]*?<\/tr>/gi;
  let match;
  let rowCount = 0;
  while ((match = tableRowPattern.exec(cleanHtml)) !== null && rowCount < 50) {
    rowCount++;
    const row = match[0];
    const currencyCode = match[1].toUpperCase();
    const code = currencyCode.includes('EUR') || currencyCode.includes('ЄВРО') ? 'EUR' : 
                 currencyCode.includes('USD') || currencyCode.includes('ДОЛАР') ? 'USD' : null;
    
    if (code && !rates[code]) {
      // Find all numbers in the row
      const numbers = row.match(/\d{1,2}[.,]\d{2,4}/g);
      if (numbers && numbers.length > 0) {
        // Take numbers that look like rates
        const rateValues = numbers.map(n => parseFloat(n.replace(',', '.')))
                                  .filter(r => r >= 20 && r <= 100);
        if (rateValues.length > 0) {
          rates[code] = Math.max(...rateValues);
          console.log(`Found ${code} in table row:`, rates[code]);
        }
      }
    }
  }
  
  // Pattern 2: Look for specific currency patterns with numbers nearby (more flexible)
  const eurPatterns = [
    /EUR[^<>\n]{0,100}?(\d{1,2}[.,]\d{2,4})/gi,
    /євро[^<>\n]{0,100}?(\d{1,2}[.,]\d{2,4})/gi,
    /ЄВРО[^<>\n]{0,100}?(\d{1,2}[.,]\d{2,4})/gi,
    /(\d{1,2}[.,]\d{2,4})[^<>\n]{0,100}?EUR/gi,
    /(\d{1,2}[.,]\d{2,4})[^<>\n]{0,100}?євро/gi,
    /(\d{1,2}[.,]\d{2,4})[^<>\n]{0,100}?ЄВРО/gi
  ];
  
  const usdPatterns = [
    /USD[^<>\n]{0,100}?(\d{1,2}[.,]\d{2,4})/gi,
    /долар[^<>\n]{0,100}?(\d{1,2}[.,]\d{2,4})/gi,
    /ДОЛАР[^<>\n]{0,100}?(\d{1,2}[.,]\d{2,4})/gi,
    /(\d{1,2}[.,]\d{2,4})[^<>\n]{0,100}?USD/gi,
    /(\d{1,2}[.,]\d{2,4})[^<>\n]{0,100}?долар/gi,
    /(\d{1,2}[.,]\d{2,4})[^<>\n]{0,100}?ДОЛАР/gi
  ];
  
  // Try EUR patterns
  if (!rates.EUR) {
    for (const pattern of eurPatterns) {
      const matches = [...cleanHtml.matchAll(pattern)];
      for (const match of matches) {
        const rate = parseFloat(match[1].replace(',', '.'));
        if (rate >= 20 && rate <= 100) {
          rates.EUR = rate;
          console.log('Found EUR with pattern:', rate);
          break;
        }
      }
      if (rates.EUR) break;
    }
  }
  
  // Try USD patterns
  if (!rates.USD) {
    for (const pattern of usdPatterns) {
      const matches = [...cleanHtml.matchAll(pattern)];
      for (const match of matches) {
        const rate = parseFloat(match[1].replace(',', '.'));
        if (rate >= 20 && rate <= 100) {
          rates.USD = rate;
          console.log('Found USD with pattern:', rate);
          break;
        }
      }
      if (rates.USD) break;
    }
  }
  
  // Last resort: look for any number between 20-100 near currency keywords
  if (!rates.EUR || !rates.USD) {
    const allNumbers = cleanHtml.match(/\d{1,2}[.,]\d{2,4}/g);
    if (allNumbers) {
      const validRates = allNumbers.map(n => parseFloat(n.replace(',', '.')))
                                    .filter(r => r >= 20 && r <= 100)
                                    .sort((a, b) => b - a); // Sort descending
      
      // Try to find EUR and USD by context
      const eurIndex = cleanHtml.toLowerCase().indexOf('eur');
      const usdIndex = cleanHtml.toLowerCase().indexOf('usd');
      
      if (eurIndex >= 0 && !rates.EUR && validRates.length > 0) {
        // Find number closest to EUR keyword
        const eurContext = cleanHtml.substring(Math.max(0, eurIndex - 200), eurIndex + 200);
        const eurNumbers = eurContext.match(/\d{1,2}[.,]\d{2,4}/g);
        if (eurNumbers) {
          const eurRates = eurNumbers.map(n => parseFloat(n.replace(',', '.')))
                                     .filter(r => r >= 20 && r <= 100);
          if (eurRates.length > 0) {
            rates.EUR = Math.max(...eurRates);
            console.log('Found EUR by context:', rates.EUR);
          }
        }
      }
      
      if (usdIndex >= 0 && !rates.USD && validRates.length > 0) {
        // Find number closest to USD keyword
        const usdContext = cleanHtml.substring(Math.max(0, usdIndex - 200), usdIndex + 200);
        const usdNumbers = usdContext.match(/\d{1,2}[.,]\d{2,4}/g);
        if (usdNumbers) {
          const usdRates = usdNumbers.map(n => parseFloat(n.replace(',', '.')))
                                     .filter(r => r >= 20 && r <= 100);
          if (usdRates.length > 0) {
            rates.USD = Math.max(...usdRates);
            console.log('Found USD by context:', rates.USD);
          }
        }
      }
    }
  }
  
  console.log('Final parsed rates:', rates);
  return rates;
};

// Get exchange rates from udinform.com
// IMPORTANT: This route must be registered BEFORE /rates/:currencyCode
router.get('/rates', async (req, res) => {
  try {
    console.log('[Currency API] GET /rates - fetching all rates from udinform.com...');
    const response = await axios.get('https://www.udinform.com/index.php?option=com_dealingquotation&task=forexukrarchive', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      httpsAgent: httpsAgent
    });
    
    console.log('Response received, HTML length:', response.data?.length || 0);
    const rates = parseUdinformRates(response.data);
    console.log('Parsed rates:', rates);
    
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
    
    console.log('Sending result:', result);
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
    
    console.log(`[Currency API] Fetching rate for ${code}, path: ${req.path}, params:`, req.params);
    
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
    
    console.log(`Response received for ${code}, HTML length:`, response.data?.length || 0);
    const rates = parseUdinformRates(response.data);
    console.log(`Parsed rates for ${code}:`, rates);
    const rate = rates[code];
    
    if (!rate) {
      console.warn(`Rate ${code} not found. Available rates:`, Object.keys(rates));
      return res.status(404).json({ 
        error: `Курс ${code} не знайдено`,
        availableRates: Object.keys(rates),
        parsedRates: rates
      });
    }
    
    const result = {
      code: code,
      name: code === 'EUR' ? 'Євро' : 'Долар США',
      rate: rate,
      date: new Date().toISOString().split('T')[0]
    };
    
    console.log(`Sending result for ${code}:`, result);
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


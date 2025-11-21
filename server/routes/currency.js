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

// Parse HTML to extract exchange rates from Minfin.com.ua
const parseMinfinRates = (html) => {
  const rates = {};
  
  if (!html || typeof html !== 'string') {
    console.error('Invalid HTML provided to parseMinfinRates');
    return rates;
  }
  
  // Remove script and style tags
  const cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                         .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                         .replace(/<!--[\s\S]*?-->/g, '');
  
  console.log('Parsing Minfin HTML, length:', cleanHtml.length);
  
  // Look for interbank rates in Minfin format
  // Minfin displays rates in format like "48,7374" or "48.7374"
  const eurPatterns = [
    /EUR[^<>\n]{0,200}?(\d{1,2}[.,]\d{2,4})/gi,
    /євро[^<>\n]{0,200}?(\d{1,2}[.,]\d{2,4})/gi,
    /ЄВРО[^<>\n]{0,200}?(\d{1,2}[.,]\d{2,4})/gi,
    /міжбанк[^<>\n]{0,200}?EUR[^<>\n]{0,200}?(\d{1,2}[.,]\d{2,4})/gi,
    /міжбанк[^<>\n]{0,200}?євро[^<>\n]{0,200}?(\d{1,2}[.,]\d{2,4})/gi
  ];
  
  const usdPatterns = [
    /USD[^<>\n]{0,200}?(\d{1,2}[.,]\d{2,4})/gi,
    /долар[^<>\n]{0,200}?(\d{1,2}[.,]\d{2,4})/gi,
    /ДОЛАР[^<>\n]{0,200}?(\d{1,2}[.,]\d{2,4})/gi,
    /міжбанк[^<>\n]{0,200}?USD[^<>\n]{0,200}?(\d{1,2}[.,]\d{2,4})/gi,
    /міжбанк[^<>\n]{0,200}?долар[^<>\n]{0,200}?(\d{1,2}[.,]\d{2,4})/gi
  ];
  
  // Try to find EUR rate
  for (const pattern of eurPatterns) {
    const matches = [...cleanHtml.matchAll(pattern)];
    for (const match of matches) {
      const rate = parseFloat(match[1].replace(',', '.'));
      if (rate >= 20 && rate <= 100) {
        rates.EUR = rate;
        console.log('Found EUR rate from Minfin:', rates.EUR);
        break;
      }
    }
    if (rates.EUR) break;
  }
  
  // Try to find USD rate
  for (const pattern of usdPatterns) {
    const matches = [...cleanHtml.matchAll(pattern)];
    for (const match of matches) {
      const rate = parseFloat(match[1].replace(',', '.'));
      if (rate >= 20 && rate <= 100) {
        rates.USD = rate;
        console.log('Found USD rate from Minfin:', rates.USD);
        break;
      }
    }
    if (rates.USD) break;
  }
  
  // Alternative: look for data attributes or JSON in page
  const jsonMatch = cleanHtml.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      // Try to extract rates from JSON structure
      if (data.currency && data.currency.rates) {
        const currencyRates = data.currency.rates;
        if (currencyRates.eur && !rates.EUR) {
          rates.EUR = parseFloat(currencyRates.eur);
        }
        if (currencyRates.usd && !rates.USD) {
          rates.USD = parseFloat(currencyRates.usd);
        }
      }
    } catch (e) {
      console.log('Could not parse JSON from Minfin page');
    }
  }
  
  console.log('Final Minfin parsed rates:', rates);
  return rates;
};

// Helper function to get rate from Minfin (primary) or NBU (fallback)
const getRateFromMinfin = async (code) => {
  try {
    // Minfin interbank archive page
    const currency = code.toLowerCase();
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
    
    const minfinUrl = `https://minfin.com.ua/ua/currency/mb/archive/${currency}/${dateStr}/`;
    console.log(`[Minfin] Fetching from: ${minfinUrl}`);
    
    const minfinResponse = await axios.get(minfinUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8'
      },
      httpsAgent: httpsAgent
    });
    
    if (minfinResponse.data) {
      const rates = parseMinfinRates(minfinResponse.data);
      const rate = rates[code];
      
      if (rate) {
        console.log(`[Minfin] Found ${code} rate:`, rate);
        return rate;
      }
    }
  } catch (error) {
    console.log(`[Minfin] Failed for ${code}, trying NBU API...`, error.message);
  }
  
  // Fallback to NBU API
  try {
    const nbuCode = code === 'EUR' ? 'EUR' : 'USD';
    const nbuResponse = await axios.get(`https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${nbuCode}&json`, {
      timeout: 5000,
      httpsAgent: httpsAgent
    });
    
    if (nbuResponse.data && nbuResponse.data.length > 0) {
      const rate = nbuResponse.data[0].rate;
      console.log(`[NBU API] Found ${code} rate:`, rate);
      return rate;
    }
  } catch (error) {
    console.log(`[NBU API] Failed for ${code}`);
  }
  
  return null;
};

// Get exchange rates from Minfin (primary) or NBU (fallback)
// IMPORTANT: This route must be registered BEFORE /rates/:currencyCode
router.get('/rates', async (req, res) => {
  try {
    console.log('[Currency API] GET /rates - fetching all rates...');
    const rates = {};
    
    // Try Minfin first
    try {
      const today = new Date();
      const dateStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
      
      const eurUrl = `https://minfin.com.ua/ua/currency/mb/archive/eur/${dateStr}/`;
      const usdUrl = `https://minfin.com.ua/ua/currency/mb/archive/usd/${dateStr}/`;
      
      const [eurResponse, usdResponse] = await Promise.allSettled([
        axios.get(eurUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          httpsAgent: httpsAgent
        }),
        axios.get(usdUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          httpsAgent: httpsAgent
        })
      ]);
      
      if (eurResponse.status === 'fulfilled' && eurResponse.value.data) {
        const eurRates = parseMinfinRates(eurResponse.value.data);
        if (eurRates.EUR) {
          rates.EUR = eurRates.EUR;
          console.log('[Minfin] EUR rate:', rates.EUR);
        }
      }
      
      if (usdResponse.status === 'fulfilled' && usdResponse.value.data) {
        const usdRates = parseMinfinRates(usdResponse.value.data);
        if (usdRates.USD) {
          rates.USD = usdRates.USD;
          console.log('[Minfin] USD rate:', rates.USD);
        }
      }
    } catch (minfinError) {
      console.log('[Minfin] Failed, trying NBU API...', minfinError.message);
    }
    
    // Fallback to NBU API if Minfin didn't return both rates
    if (!rates.EUR || !rates.USD) {
      try {
        const eurResponse = await axios.get('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=EUR&json', {
          timeout: 5000,
          httpsAgent: httpsAgent
        });
        if (eurResponse.data && eurResponse.data.length > 0 && !rates.EUR) {
          rates.EUR = eurResponse.data[0].rate;
          console.log('[NBU API] EUR rate:', rates.EUR);
        }
        
        const usdResponse = await axios.get('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json', {
          timeout: 5000,
          httpsAgent: httpsAgent
        });
        if (usdResponse.data && usdResponse.data.length > 0 && !rates.USD) {
          rates.USD = usdResponse.data[0].rate;
          console.log('[NBU API] USD rate:', rates.USD);
        }
      } catch (nbuError) {
        console.error('[NBU API] Error:', nbuError.message);
      }
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
    
    // Try Minfin first (primary source)
    let rate = await getRateFromMinfin(code);
    
    if (!rate) {
      console.warn(`Rate ${code} not found from any source`);
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


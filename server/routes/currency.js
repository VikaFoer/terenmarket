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
  
  // Try to find JSON data in script tags first (most reliable)
  const jsonPatterns = [
    /window\.__INITIAL_STATE__\s*=\s*({.+?});/s,
    /window\.__PRELOADED_STATE__\s*=\s*({.+?});/s,
    /"currency"[^}]*"rates"[^}]*({[^}]+})/s,
    /data-rates\s*=\s*["']({[^"']+})["']/s
  ];
  
  for (const pattern of jsonPatterns) {
    const jsonMatch = cleanHtml.match(pattern);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        // Try different JSON structures
        if (data.currency && data.currency.rates) {
          const currencyRates = data.currency.rates;
          if (currencyRates.eur || currencyRates.EUR) {
            rates.EUR = parseFloat(currencyRates.eur || currencyRates.EUR);
            console.log('Found EUR rate from JSON:', rates.EUR);
          }
          if (currencyRates.usd || currencyRates.USD) {
            rates.USD = parseFloat(currencyRates.usd || currencyRates.USD);
            console.log('Found USD rate from JSON:', rates.USD);
          }
        }
        // Try direct structure
        if (data.rates) {
          if (data.rates.eur || data.rates.EUR) {
            rates.EUR = parseFloat(data.rates.eur || data.rates.EUR);
          }
          if (data.rates.usd || data.rates.USD) {
            rates.USD = parseFloat(data.rates.usd || data.rates.USD);
          }
        }
      } catch (e) {
        console.log('Could not parse JSON from Minfin page:', e.message);
      }
    }
  }
  
  // If JSON parsing didn't work, try HTML parsing
  if (!rates.EUR || !rates.USD) {
    // Look for interbank rates in Minfin format
    // Minfin displays rates in format like "48,7374" or "48.7374"
    // Look for table cells or specific divs with rates
    const ratePatterns = [
      /<td[^>]*>[\s\S]{0,100}?(\d{1,2}[.,]\d{2,4})[\s\S]{0,100}?<\/td>/gi,
      /<span[^>]*class[^>]*rate[^>]*>[\s\S]{0,50}?(\d{1,2}[.,]\d{2,4})/gi,
      /data-rate[^=]*=\s*["']?(\d{1,2}[.,]\d{2,4})["']?/gi
    ];
    
    const allNumbers = [];
    for (const pattern of ratePatterns) {
      const matches = [...cleanHtml.matchAll(pattern)];
      for (const match of matches) {
        const num = parseFloat(match[1].replace(',', '.'));
        if (num >= 20 && num <= 100) {
          allNumbers.push(num);
        }
      }
    }
    
    // Find EUR rate - usually higher values (around 48-50)
    if (!rates.EUR && allNumbers.length > 0) {
      const eurCandidates = allNumbers.filter(n => n >= 40 && n <= 60).sort((a, b) => b - a);
      if (eurCandidates.length > 0) {
        rates.EUR = eurCandidates[0];
        console.log('Found EUR rate from HTML parsing:', rates.EUR);
      }
    }
    
    // Find USD rate - usually lower values (around 36-42)
    if (!rates.USD && allNumbers.length > 0) {
      const usdCandidates = allNumbers.filter(n => n >= 30 && n <= 45).sort((a, b) => b - a);
      if (usdCandidates.length > 0) {
        rates.USD = usdCandidates[0];
        console.log('Found USD rate from HTML parsing:', rates.USD);
      }
    }
    
    // Fallback: look for currency codes near numbers
    if (!rates.EUR) {
      const eurPatterns = [
        /EUR[^<>\n]{0,100}?(\d{1,2}[.,]\d{2,4})/gi,
        /євро[^<>\n]{0,100}?(\d{1,2}[.,]\d{2,4})/gi,
        /ЄВРО[^<>\n]{0,100}?(\d{1,2}[.,]\d{2,4})/gi
      ];
      
      for (const pattern of eurPatterns) {
        const matches = [...cleanHtml.matchAll(pattern)];
        for (const match of matches) {
          const rate = parseFloat(match[1].replace(',', '.'));
          if (rate >= 40 && rate <= 60) {
            rates.EUR = rate;
            console.log('Found EUR rate from pattern:', rates.EUR);
            break;
          }
        }
        if (rates.EUR) break;
      }
    }
    
    if (!rates.USD) {
      const usdPatterns = [
        /USD[^<>\n]{0,100}?(\d{1,2}[.,]\d{2,4})/gi,
        /долар[^<>\n]{0,100}?(\d{1,2}[.,]\d{2,4})/gi,
        /ДОЛАР[^<>\n]{0,100}?(\d{1,2}[.,]\d{2,4})/gi
      ];
      
      for (const pattern of usdPatterns) {
        const matches = [...cleanHtml.matchAll(pattern)];
        for (const match of matches) {
          const rate = parseFloat(match[1].replace(',', '.'));
          if (rate >= 30 && rate <= 45) {
            rates.USD = rate;
            console.log('Found USD rate from pattern:', rates.USD);
            break;
          }
        }
        if (rates.USD) break;
      }
    }
  }
  
  console.log('Final Minfin parsed rates:', rates);
  return rates;
};

// Helper function to get rate from Minfin (primary) or NBU (fallback)
const getRateFromMinfin = async (code) => {
  try {
    // Try current date first
    const currency = code.toLowerCase();
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
    
    // Try main Minfin page first (current rates)
    const minfinMainUrl = `https://minfin.com.ua/ua/currency/mb/${currency}/`;
    console.log(`[Minfin] Fetching current rates from: ${minfinMainUrl}`);
    
    try {
      const mainResponse = await axios.get(minfinMainUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8'
        },
        httpsAgent: httpsAgent
      });
      
      if (mainResponse.data) {
        const rates = parseMinfinRates(mainResponse.data);
        const rate = rates[code];
        
        if (rate) {
          console.log(`[Minfin] Found ${code} rate from main page:`, rate);
          return rate;
        }
      }
    } catch (mainError) {
      console.log(`[Minfin] Main page failed, trying archive...`, mainError.message);
    }
    
    // Try archive page
    const minfinArchiveUrl = `https://minfin.com.ua/ua/currency/mb/archive/${currency}/${dateStr}/`;
    console.log(`[Minfin] Fetching archive from: ${minfinArchiveUrl}`);
    
    const archiveResponse = await axios.get(minfinArchiveUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8'
      },
      httpsAgent: httpsAgent
    });
    
    if (archiveResponse.data) {
      const rates = parseMinfinRates(archiveResponse.data);
      const rate = rates[code];
      
      if (rate) {
        console.log(`[Minfin] Found ${code} rate from archive:`, rate);
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
    
    // Try Minfin API first
    try {
      const eurRate = await getRateFromMinfin('EUR');
      if (eurRate) {
        rates.EUR = eurRate;
        console.log('[Minfin API] EUR rate:', rates.EUR);
      }
      
      const usdRate = await getRateFromMinfin('USD');
      if (usdRate) {
        rates.USD = usdRate;
        console.log('[Minfin API] USD rate:', rates.USD);
      }
    } catch (minfinError) {
      console.log('[Minfin API] Failed, trying NBU API...', minfinError.message);
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


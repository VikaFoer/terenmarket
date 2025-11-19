const express = require('express');
const axios = require('axios');
const router = express.Router();

// Get exchange rates from NBU API
router.get('/rates', async (req, res) => {
  try {
    // Get current date in format yyyymmdd
    const today = new Date();
    const dateStr = today.getFullYear() + 
                   String(today.getMonth() + 1).padStart(2, '0') + 
                   String(today.getDate()).padStart(2, '0');
    
    // Try to get today's rates
    let response;
    try {
      response = await axios.get(`https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?date=${dateStr}&json`, {
        timeout: 5000
      });
    } catch (error) {
      // If today's rates are not available, try previous day
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const prevDateStr = yesterday.getFullYear() + 
                         String(yesterday.getMonth() + 1).padStart(2, '0') + 
                         String(yesterday.getDate()).padStart(2, '0');
      
      response = await axios.get(`https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?date=${prevDateStr}&json`, {
        timeout: 5000
      });
    }
    
    res.json({
      date: response.data[0]?.exchangedate || dateStr,
      rates: response.data.map(rate => ({
        code: rate.cc,
        name: rate.txt,
        rate: rate.rate,
        units: rate.r030
      }))
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error.message);
    res.status(500).json({ 
      error: 'Не вдалося отримати курси валют',
      details: error.message 
    });
  }
});

// Get exchange rate for specific currency
router.get('/rates/:currencyCode', async (req, res) => {
  try {
    const { currencyCode } = req.params;
    const today = new Date();
    const dateStr = today.getFullYear() + 
                   String(today.getMonth() + 1).padStart(2, '0') + 
                   String(today.getDate()).padStart(2, '0');
    
    let response;
    try {
      response = await axios.get(`https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?date=${dateStr}&json`, {
        timeout: 5000
      });
    } catch (error) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const prevDateStr = yesterday.getFullYear() + 
                         String(yesterday.getMonth() + 1).padStart(2, '0') + 
                         String(yesterday.getDate()).padStart(2, '0');
      
      response = await axios.get(`https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?date=${prevDateStr}&json`, {
        timeout: 5000
      });
    }
    
    const currency = response.data.find(rate => 
      rate.cc.toLowerCase() === currencyCode.toLowerCase()
    );
    
    if (!currency) {
      return res.status(404).json({ error: 'Валюта не знайдена' });
    }
    
    res.json({
      code: currency.cc,
      name: currency.txt,
      rate: currency.rate,
      units: currency.r030,
      date: currency.exchangedate
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


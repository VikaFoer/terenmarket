const express = require('express');
const axios = require('axios');
const router = express.Router();

// URL зовнішнього сервісу для менеджерів (можна винести в змінні середовища)
const MANAGER_SERVICE_URL = process.env.MANAGER_SERVICE_URL || 'https://your-manager-service.com/api';

// Функція для відправки запиту менеджеру
const sendRequestToManager = async (managerId, requestData) => {
  try {
    console.log(`[Manager API] Sending request to manager ${managerId}...`);
    
    const response = await axios.post(
      `${MANAGER_SERVICE_URL}/managers/${managerId}/requests`,
      {
        ...requestData,
        timestamp: new Date().toISOString(),
        source: 'SmartMarket'
      },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          // Додайте API ключ, якщо потрібна автентифікація
          'Authorization': `Bearer ${process.env.MANAGER_SERVICE_API_KEY || ''}`
        }
      }
    );
    
    console.log(`[Manager API] Request sent successfully to manager ${managerId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error(`[Manager API] Failed to send request to manager ${managerId}:`, error.message);
    if (error.response) {
      console.error(`[Manager API] Response status: ${error.response.status}`);
      console.error(`[Manager API] Response data:`, error.response.data);
    }
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    };
  }
};

// Відправити запит відповідальному менеджеру клієнта
// POST /api/manager/send-request
router.post('/send-request', async (req, res) => {
  try {
    const { clientId, managerId, requestType, message, additionalData } = req.body;
    
    if (!clientId || !managerId || !requestType) {
      return res.status(400).json({ 
        error: 'clientId, managerId та requestType є обов\'язковими полями' 
      });
    }
    
    const requestData = {
      clientId,
      requestType, // наприклад: 'order', 'question', 'complaint', 'support'
      message: message || '',
      additionalData: additionalData || {}
    };
    
    const result = await sendRequestToManager(managerId, requestData);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Запит успішно відправлено менеджеру',
        data: result.data
      });
    } else {
      res.status(result.status || 500).json({
        success: false,
        error: 'Не вдалося відправити запит менеджеру',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Error sending request to manager:', error);
    res.status(500).json({ 
      error: 'Помилка при відправці запиту',
      details: error.message 
    });
  }
});

// Відправити запит менеджеру на основі клієнта (якщо менеджер зберігається в БД)
// POST /api/manager/send-request-by-client
router.post('/send-request-by-client', async (req, res) => {
  try {
    const db = require('../database');
    const database = db.getDb();
    const { clientId, requestType, message, additionalData } = req.body;
    
    if (!clientId || !requestType) {
      return res.status(400).json({ 
        error: 'clientId та requestType є обов\'язковими полями' 
      });
    }
    
    // Отримуємо інформацію про клієнта та його менеджера
    database.get(
      'SELECT id, login, email, phone, company_name, manager_id FROM clients WHERE id = ?',
      [clientId],
      async (err, client) => {
        if (err) {
          return res.status(500).json({ error: 'Помилка бази даних' });
        }
        
        if (!client) {
          return res.status(404).json({ error: 'Клієнт не знайдено' });
        }
        
        // Якщо менеджер не призначений, можна використати дефолтного менеджера
        const managerId = client.manager_id || process.env.DEFAULT_MANAGER_ID || '1';
        
        const requestData = {
          clientId: client.id,
          clientName: client.company_name || client.login,
          clientEmail: client.email,
          clientPhone: client.phone,
          requestType,
          message: message || '',
          additionalData: additionalData || {}
        };
        
        const result = await sendRequestToManager(managerId, requestData);
        
        if (result.success) {
          res.json({
            success: true,
            message: 'Запит успішно відправлено менеджеру',
            managerId: managerId,
            data: result.data
          });
        } else {
          res.status(result.status || 500).json({
            success: false,
            error: 'Не вдалося відправити запит менеджеру',
            details: result.error
          });
        }
      }
    );
  } catch (error) {
    console.error('Error sending request to manager:', error);
    res.status(500).json({ 
      error: 'Помилка при відправці запиту',
      details: error.message 
    });
  }
});

// Отримати список менеджерів з зовнішнього сервісу (якщо такий endpoint існує)
// GET /api/manager/list
router.get('/list', async (req, res) => {
  try {
    const response = await axios.get(`${MANAGER_SERVICE_URL}/managers`, {
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${process.env.MANAGER_SERVICE_API_KEY || ''}`
      }
    });
    
    res.json({
      success: true,
      managers: response.data
    });
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ 
      error: 'Не вдалося отримати список менеджерів',
      details: error.message 
    });
  }
});

module.exports = router;


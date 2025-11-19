const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

router.post('/login', (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Login and password are required' });
  }

  const database = db.getDb();
  
  database.get('SELECT * FROM clients WHERE login = ?', [login], async (err, client) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!client) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, client.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: client.id, login: client.login },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      client: {
        id: client.id,
        login: client.login,
        email: client.email,
        location: client.location,
        phone: client.phone
      }
    });
  });
});

module.exports = router;


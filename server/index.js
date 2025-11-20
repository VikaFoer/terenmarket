const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./database');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const clientRoutes = require('./routes/client');
const currencyRoutes = require('./routes/currency');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database and start server
db.init()
  .then(() => {
    console.log('Database initialized successfully');
    
    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/client', clientRoutes);
    app.use('/api/currency', currencyRoutes);

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // Serve static files from React app in production
    if (process.env.NODE_ENV === 'production') {
      const buildPath = path.join(__dirname, '..', 'client', 'build');
      app.use(express.static(buildPath));
      
      // Serve React app for all non-API routes
      app.get('*', (req, res) => {
        // Don't serve React app for API routes
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(path.join(buildPath, 'index.html'));
      });
    } else {
      // Development mode - show API info
      app.get('/', (req, res) => {
        res.json({
          message: 'SmartMarket API Server',
          version: '1.0.0',
          endpoints: {
            health: '/api/health',
            auth: '/api/auth/login',
            admin: '/api/admin/*',
            client: '/api/client/*'
          },
          note: 'This is an API server. In production, React app is served from root path.'
        });
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });


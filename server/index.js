const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./database');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const clientRoutes = require('./routes/client');
const currencyRoutes = require('./routes/currency');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Middleware
app.use(cors({
  origin: FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database and start server
console.log('Starting database initialization...');
db.init()
  .then(() => {
    console.log('✅ Database initialization completed successfully');
    
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
      
      // Check if build directory exists
      if (!fs.existsSync(buildPath)) {
        console.warn(`Warning: Build directory not found at ${buildPath}. Make sure to build the frontend before starting the server.`);
      } else {
        app.use(express.static(buildPath));
        
        // Serve React app for all non-API routes
        app.get('*', (req, res) => {
          // Don't serve React app for API routes
          if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'API endpoint not found' });
          }
          res.sendFile(path.join(buildPath, 'index.html'), (err) => {
            if (err) {
              console.error('Error serving index.html:', err);
              res.status(500).json({ error: 'Failed to serve frontend' });
            }
          });
        });
      }
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
    console.error('❌ Failed to initialize database:', err);
    console.error('Error details:', err.message);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  });


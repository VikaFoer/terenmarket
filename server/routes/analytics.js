const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Helper function to get device type from user agent
const getDeviceType = (userAgent) => {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

// Helper function to get browser from user agent
const getBrowser = (userAgent) => {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('edge')) return 'Edge';
  if (ua.includes('opera')) return 'Opera';
  return 'Other';
};

// Track analytics event (public endpoint)
router.post('/track', (req, res) => {
  const database = db.getDb();
  const {
    sessionId,
    eventType,
    eventName,
    pagePath,
    pageTitle,
    category,
    action,
    label,
    value,
    metadata
  } = req.body;

  if (!sessionId || !eventType || !eventName || !pagePath) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const userAgent = req.get('user-agent') || '';
  const ipAddress = req.ip || req.connection.remoteAddress || '';
  const referrer = req.get('referer') || '';
  const deviceType = getDeviceType(userAgent);
  const browser = getBrowser(userAgent);

  // Get user_id from token if available (optional)
  const authHeader = req.headers.authorization;
  let userId = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      userId = decoded.id;
    } catch (err) {
      // Token invalid or missing, continue without user_id
    }
  }

  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  database.run(
    `INSERT INTO analytics_events (
      session_id, user_id, event_type, event_name, page_path, page_title,
      category, action, label, value, metadata, user_agent, ip_address,
      referrer, device_type, browser
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId, userId, eventType, eventName, pagePath, pageTitle,
      category, action, label, value, metadataJson, userAgent, ipAddress,
      referrer, deviceType, browser
    ],
    function(err) {
      if (err) {
        console.error('Error tracking event:', err);
        return res.status(500).json({ error: 'Failed to track event' });
      }
      res.json({ success: true, eventId: this.lastID });
    }
  );
});

// Create or update session (public endpoint)
router.post('/session', (req, res) => {
  const database = db.getDb();
  const { sessionId, pagePath } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  const userAgent = req.get('user-agent') || '';
  const referrer = req.get('referer') || '';
  const deviceType = getDeviceType(userAgent);
  const browser = getBrowser(userAgent);

  // Get user_id from token if available
  const authHeader = req.headers.authorization;
  let userId = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      userId = decoded.id;
    } catch (err) {
      // Token invalid, continue without user_id
    }
  }

  // Check if session exists
  database.get('SELECT * FROM analytics_sessions WHERE id = ?', [sessionId], (err, existingSession) => {
    if (err) {
      console.error('Error checking session:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingSession) {
      // Update existing session
      database.run(
        `UPDATE analytics_sessions 
         SET page_views = page_views + 1,
             exit_page = ?,
             ended_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [pagePath || existingSession.exit_page, sessionId],
        (err) => {
          if (err) {
            console.error('Error updating session:', err);
            return res.status(500).json({ error: 'Failed to update session' });
          }
          res.json({ success: true, session: existingSession });
        }
      );
    } else {
      // Create new session
      database.run(
        `INSERT INTO analytics_sessions (
          id, user_id, device_type, browser, referrer, landing_page, exit_page, page_views
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [sessionId, userId, deviceType, browser, referrer, pagePath || '/', pagePath || '/'],
        function(err) {
          if (err) {
            console.error('Error creating session:', err);
            return res.status(500).json({ error: 'Failed to create session' });
          }
          res.json({ success: true, sessionId });
        }
      );
    }
  });
});

// Get analytics statistics (admin only)
const authenticate = authMiddleware.authenticate || authMiddleware;
router.use('/stats', authenticate);

router.get('/stats', (req, res) => {
  const database = db.getDb();
  const { startDate, endDate, eventType } = req.query;

  let dateFilter = '';
  const params = [];
  
  if (startDate && endDate) {
    dateFilter = 'WHERE created_at BETWEEN ? AND ?';
    params.push(startDate, endDate);
  } else if (startDate) {
    dateFilter = 'WHERE created_at >= ?';
    params.push(startDate);
  } else if (endDate) {
    dateFilter = 'WHERE created_at <= ?';
    params.push(endDate);
  }

  if (eventType) {
    dateFilter += dateFilter ? ' AND event_type = ?' : 'WHERE event_type = ?';
    params.push(eventType);
  }

  // Get overall statistics
  database.all(`
    SELECT 
      COUNT(DISTINCT session_id) as unique_sessions,
      COUNT(*) as total_events,
      COUNT(DISTINCT user_id) as unique_users
    FROM analytics_events
    ${dateFilter}
  `, params, (err, stats) => {
    if (err) {
      console.error('Error fetching stats:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Get page views
    let pageViewFilter = "WHERE event_type = 'page_view'";
    const pageViewParams = [];
    
    if (startDate && endDate) {
      pageViewFilter += ' AND created_at BETWEEN ? AND ?';
      pageViewParams.push(startDate, endDate);
    } else if (startDate) {
      pageViewFilter += ' AND created_at >= ?';
      pageViewParams.push(startDate);
    } else if (endDate) {
      pageViewFilter += ' AND created_at <= ?';
      pageViewParams.push(endDate);
    }
    
    database.all(`
      SELECT 
        page_path,
        COUNT(*) as views,
        COUNT(DISTINCT session_id) as unique_views
      FROM analytics_events
      ${pageViewFilter}
      GROUP BY page_path
      ORDER BY views DESC
      LIMIT 20
    `, pageViewParams, (err, pageViews) => {
      if (err) {
        console.error('Error fetching page views:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Get event types breakdown
      database.all(`
        SELECT 
          event_type,
          COUNT(*) as count
        FROM analytics_events
        ${dateFilter || ''}
        GROUP BY event_type
        ORDER BY count DESC
      `, params, (err, eventTypes) => {
        if (err) {
          console.error('Error fetching event types:', err);
          console.error('SQL Error details:', err.message);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }

          // Get QR page statistics
          let qrFilter = "WHERE page_path IN ('/colorant', '/mix', '/bruker-o', '/axs', '/filter', '/lab')";
          const qrParams = [];
          
          if (startDate && endDate) {
            qrFilter += ' AND created_at BETWEEN ? AND ?';
            qrParams.push(startDate, endDate);
          } else if (startDate) {
            qrFilter += ' AND created_at >= ?';
            qrParams.push(startDate);
          } else if (endDate) {
            qrFilter += ' AND created_at <= ?';
            qrParams.push(endDate);
          }
          
          database.all(`
            SELECT 
              page_path,
              COUNT(*) as total_views,
              COUNT(DISTINCT session_id) as unique_visitors,
              COUNT(CASE WHEN event_name = 'email_signup' THEN 1 END) as email_signups,
              COUNT(CASE WHEN event_name = 'greeting_view' THEN 1 END) as greeting_views,
              COUNT(CASE WHEN event_name = 'expand_products' THEN 1 END) as expand_clicks
            FROM analytics_events
            ${qrFilter}
            GROUP BY page_path
            ORDER BY total_views DESC
          `, qrParams, (err, qrStats) => {
          if (err) {
            console.error('Error fetching QR stats:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          // Get daily statistics
          let dailyFilter = '';
          const dailyParams = [];
          
          if (startDate && endDate) {
            dailyFilter = 'WHERE created_at BETWEEN ? AND ?';
            dailyParams.push(startDate, endDate);
          } else if (startDate) {
            dailyFilter = 'WHERE created_at >= ?';
            dailyParams.push(startDate);
          } else if (endDate) {
            dailyFilter = 'WHERE created_at <= ?';
            dailyParams.push(endDate);
          }
          
          database.all(`
            SELECT 
              DATE(created_at) as date,
              COUNT(DISTINCT session_id) as sessions,
              COUNT(*) as events
            FROM analytics_events
            ${dailyFilter}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
          `, dailyParams, (err, dailyStats) => {
            if (err) {
              console.error('Error fetching daily stats:', err);
              return res.status(500).json({ error: 'Database error' });
            }

            res.json({
              overview: stats[0] || { unique_sessions: 0, total_events: 0, unique_users: 0 },
              pageViews,
              eventTypes,
              qrPages: qrStats,
              dailyStats
            });
          });
        });
      });
    });
  });
});

module.exports = router;

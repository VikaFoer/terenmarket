const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Helper function to generate session ID
const generateSessionId = () => {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to detect device type
const detectDeviceType = (userAgent) => {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'mobile';
  }
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
};

// Helper function to detect browser
const detectBrowser = (userAgent) => {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
  return 'Other';
};

// Track event (public endpoint for frontend)
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
    metadata,
    userId
  } = req.body;

  const userAgent = req.get('user-agent') || '';
  const ipAddress = req.ip || req.connection.remoteAddress || '';
  const referrer = req.get('referer') || '';
  const deviceType = detectDeviceType(userAgent);
  const browser = detectBrowser(userAgent);

  // Create or update session
  const currentSessionId = sessionId || generateSessionId();
  
  database.get('SELECT * FROM analytics_sessions WHERE id = ?', [currentSessionId], (err, session) => {
    if (err) {
      console.error('Error checking session:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!session) {
      // Create new session
      database.run(
        `INSERT INTO analytics_sessions 
        (id, user_id, started_at, device_type, browser, referrer, landing_page, page_views) 
        VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, 1)`,
        [currentSessionId, userId || null, deviceType, browser, referrer, pagePath],
        (err) => {
          if (err) {
            console.error('Error creating session:', err);
            return res.status(500).json({ error: 'Database error' });
          }
        }
      );
    } else {
      // Update session
      database.run(
        'UPDATE analytics_sessions SET page_views = page_views + 1, exit_page = ? WHERE id = ?',
        [pagePath, currentSessionId],
        (err) => {
          if (err) {
            console.error('Error updating session:', err);
          }
        }
      );
    }

    // Insert event
    database.run(
      `INSERT INTO analytics_events 
      (session_id, user_id, event_type, event_name, page_path, page_title, category, action, label, value, metadata, user_agent, ip_address, referrer, device_type, browser)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        currentSessionId,
        userId || null,
        eventType || 'custom',
        eventName,
        pagePath,
        pageTitle || null,
        category || null,
        action || null,
        label || null,
        value || null,
        metadata ? JSON.stringify(metadata) : null,
        userAgent,
        ipAddress,
        referrer,
        deviceType,
        browser
      ],
      function(err) {
        if (err) {
          console.error('Error inserting event:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ 
          success: true, 
          sessionId: currentSessionId,
          eventId: this.lastID 
        });
      }
    );
  });
});

// Get analytics stats (admin only)
router.get('/stats', authMiddleware.authenticate || authMiddleware, (req, res) => {
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

  // Get total events
  database.get(
    `SELECT COUNT(*) as total FROM analytics_events ${dateFilter}`,
    params,
    (err, totalResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Get unique sessions
      database.get(
        `SELECT COUNT(DISTINCT session_id) as sessions FROM analytics_events ${dateFilter}`,
        params,
        (err, sessionsResult) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Get unique users
          database.get(
            `SELECT COUNT(DISTINCT user_id) as users FROM analytics_events ${dateFilter} AND user_id IS NOT NULL`,
            params,
            (err, usersResult) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              // Get events by type
              database.all(
                `SELECT event_type, COUNT(*) as count 
                FROM analytics_events ${dateFilter}
                GROUP BY event_type
                ORDER BY count DESC`,
                params,
                (err, eventsByType) => {
                  if (err) {
                    return res.status(500).json({ error: err.message });
                  }

                  // Get top pages
                  database.all(
                    `SELECT page_path, COUNT(*) as views 
                    FROM analytics_events ${dateFilter}
                    GROUP BY page_path
                    ORDER BY views DESC
                    LIMIT 10`,
                    params,
                    (err, topPages) => {
                      if (err) {
                        return res.status(500).json({ error: err.message });
                      }

                      res.json({
                        total: totalResult.total,
                        sessions: sessionsResult.sessions,
                        users: usersResult.users,
                        eventsByType: eventsByType || [],
                        topPages: topPages || []
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// Get QR pages analytics
router.get('/qr-pages', authMiddleware.authenticate || authMiddleware, (req, res) => {
  const database = db.getDb();
  const { startDate, endDate } = req.query;

  let dateFilter = '';
  const params = [];

  if (startDate && endDate) {
    dateFilter = 'WHERE created_at BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  // Get visits per QR category
  database.all(
    `SELECT 
      page_path,
      COUNT(DISTINCT session_id) as unique_visits,
      COUNT(*) as total_views,
      AVG((SELECT COUNT(*) FROM analytics_events e2 WHERE e2.session_id = e1.session_id AND e2.page_path = e1.page_path)) as avg_time_on_page
    FROM analytics_events e1
    ${dateFilter}
    AND page_path IN ('/colorant', '/mix', '/bruker-o', '/axs', '/filter', '/lab')
    GROUP BY page_path
    ORDER BY unique_visits DESC`,
    params,
    (err, qrStats) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Get greeting views
      database.all(
        `SELECT 
          page_path,
          COUNT(*) as greeting_clicks
        FROM analytics_events
        ${dateFilter}
        AND event_name = 'greeting_view'
        GROUP BY page_path`,
        params,
        (err, greetingStats) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Get email registrations by category
          let emailDateFilter = '';
          let emailParams = [];
          if (startDate && endDate) {
            emailDateFilter = 'WHERE created_at BETWEEN ? AND ?';
            emailParams = [startDate, endDate];
          } else if (startDate) {
            emailDateFilter = 'WHERE created_at >= ?';
            emailParams = [startDate];
          } else if (endDate) {
            emailDateFilter = 'WHERE created_at <= ?';
            emailParams = [endDate];
          }
          
          database.all(
            `SELECT 
              category,
              COUNT(*) as registrations
            FROM email_subscriptions
            ${emailDateFilter}
            GROUP BY category
            ORDER BY registrations DESC`,
            emailParams,
            (err, emailStats) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              res.json({
                qrPages: qrStats || [],
                greetingViews: greetingStats || [],
                emailRegistrations: emailStats || []
              });
            }
          );
        }
      );
    }
  );
});

// Get dashboard data
router.get('/dashboard', authMiddleware.authenticate || authMiddleware, (req, res) => {
  const database = db.getDb();
  const { days = 7 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Get daily stats
  database.all(
    `SELECT 
      DATE(created_at) as date,
      COUNT(*) as events,
      COUNT(DISTINCT session_id) as sessions,
      COUNT(DISTINCT user_id) as users
    FROM analytics_events
    WHERE created_at >= ?
    GROUP BY DATE(created_at)
    ORDER BY date DESC`,
    [startDate.toISOString()],
    (err, dailyStats) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        dailyStats: dailyStats || [],
        period: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
          days: parseInt(days)
        }
      });
    }
  );
});

module.exports = router;


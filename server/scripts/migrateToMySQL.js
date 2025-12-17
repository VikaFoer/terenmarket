/**
 * Migration script to transfer data from SQLite to MySQL
 * 
 * Usage:
 * 1. Set up MySQL connection in .env file
 * 2. Run: node server/scripts/migrateToMySQL.js
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// SQLite database path
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'database.sqlite');

// MySQL configuration
const mysqlConfig = {
  host: process.env.DB_HOST || 'tecsa.mysql.ukraine.com.ua',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'tecsa_marketdatabase',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'tecsa_marketdatabase',
  charset: 'utf8mb4'
};

async function migrate() {
  console.log('=== Starting Migration from SQLite to MySQL ===');
  console.log('SQLite DB:', SQLITE_DB_PATH);
  console.log('MySQL Host:', mysqlConfig.host);
  console.log('MySQL Database:', mysqlConfig.database);
  console.log('===============================================\n');

  // Check if SQLite database exists
  if (!fs.existsSync(SQLITE_DB_PATH)) {
    console.error(`❌ SQLite database not found at: ${SQLITE_DB_PATH}`);
    process.exit(1);
  }

  // Connect to SQLite
  const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error opening SQLite database:', err);
      process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
  });

  // Connect to MySQL
  let mysqlConnection;
  try {
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Connected to MySQL database');
  } catch (err) {
    console.error('❌ Error connecting to MySQL:', err);
    sqliteDb.close();
    process.exit(1);
  }

  try {
    // Start transaction
    await mysqlConnection.beginTransaction();
    console.log('\n📦 Starting data migration...\n');

    // Migrate categories
    console.log('Migrating categories...');
    const categories = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM categories ORDER BY id', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const cat of categories) {
      await mysqlConnection.execute(
        'INSERT IGNORE INTO categories (id, name) VALUES (?, ?)',
        [cat.id, cat.name]
      );
    }
    console.log(`✅ Migrated ${categories.length} categories`);

    // Migrate clients
    console.log('Migrating clients...');
    const clients = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM clients ORDER BY id', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const client of clients) {
      await mysqlConnection.execute(
        `INSERT IGNORE INTO clients 
         (id, login, password, company_name, location, phone, email, manager_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          client.id,
          client.login,
          client.password,
          client.company_name || null,
          client.location || null,
          client.phone || null,
          client.email || null,
          client.manager_id || null,
          client.created_at || null,
          client.updated_at || null
        ]
      );
    }
    console.log(`✅ Migrated ${clients.length} clients`);

    // Migrate products
    console.log('Migrating products...');
    const products = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM products ORDER BY id', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const product of products) {
      await mysqlConnection.execute(
        `INSERT IGNORE INTO products 
         (id, name, category_id, cost_price, image_url, unit, price_currency, 
          cost_price_eur, cost_price_uah, card_color, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.name,
          product.category_id,
          product.cost_price || 0,
          product.image_url || null,
          product.unit || 'шт',
          product.price_currency || 'EUR',
          product.cost_price_eur || null,
          product.cost_price_uah || null,
          product.card_color || null,
          product.created_at || null,
          product.updated_at || null
        ]
      );
    }
    console.log(`✅ Migrated ${products.length} products`);

    // Migrate client_categories
    console.log('Migrating client_categories...');
    const clientCategories = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM client_categories', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const cc of clientCategories) {
      await mysqlConnection.execute(
        'INSERT IGNORE INTO client_categories (id, client_id, category_id) VALUES (?, ?, ?)',
        [cc.id, cc.client_id, cc.category_id]
      );
    }
    console.log(`✅ Migrated ${clientCategories.length} client_category mappings`);

    // Migrate client_product_coefficients
    console.log('Migrating client_product_coefficients...');
    const coefficients = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM client_product_coefficients', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const cpc of coefficients) {
      await mysqlConnection.execute(
        `INSERT IGNORE INTO client_product_coefficients 
         (id, client_id, product_id, coefficient, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          cpc.id,
          cpc.client_id,
          cpc.product_id,
          cpc.coefficient,
          cpc.created_at || null,
          cpc.updated_at || null
        ]
      );
    }
    console.log(`✅ Migrated ${coefficients.length} product coefficients`);

    // Migrate category_managers
    console.log('Migrating category_managers...');
    const categoryManagers = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM category_managers', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    for (const cm of categoryManagers) {
      await mysqlConnection.execute(
        `INSERT IGNORE INTO category_managers 
         (id, category_id, manager_id, manager_name, manager_email, manager_phone, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cm.id,
          cm.category_id,
          cm.manager_id,
          cm.manager_name || null,
          cm.manager_email || null,
          cm.manager_phone || null,
          cm.created_at || null,
          cm.updated_at || null
        ]
      );
    }
    console.log(`✅ Migrated ${categoryManagers.length} category managers`);

    // Migrate email_subscriptions
    console.log('Migrating email_subscriptions...');
    const emailSubscriptions = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM email_subscriptions', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    for (const es of emailSubscriptions) {
      await mysqlConnection.execute(
        'INSERT IGNORE INTO email_subscriptions (id, email, category, created_at) VALUES (?, ?, ?, ?)',
        [es.id, es.email, es.category || null, es.created_at || null]
      );
    }
    console.log(`✅ Migrated ${emailSubscriptions.length} email subscriptions`);

    // Migrate qr_page_categories
    console.log('Migrating qr_page_categories...');
    const qrPageCategories = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM qr_page_categories', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    for (const qpc of qrPageCategories) {
      await mysqlConnection.execute(
        'INSERT IGNORE INTO qr_page_categories (id, qr_page_url, category_id, created_at) VALUES (?, ?, ?, ?)',
        [qpc.id, qpc.qr_page_url, qpc.category_id, qpc.created_at || null]
      );
    }
    console.log(`✅ Migrated ${qrPageCategories.length} QR page categories`);

    // Migrate analytics_sessions
    console.log('Migrating analytics_sessions...');
    const analyticsSessions = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM analytics_sessions', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    for (const session of analyticsSessions) {
      await mysqlConnection.execute(
        `INSERT IGNORE INTO analytics_sessions 
         (id, user_id, started_at, ended_at, duration, page_views, device_type, browser, referrer, landing_page, exit_page) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.user_id || null,
          session.started_at || null,
          session.ended_at || null,
          session.duration || null,
          session.page_views || 0,
          session.device_type || null,
          session.browser || null,
          session.referrer || null,
          session.landing_page || null,
          session.exit_page || null
        ]
      );
    }
    console.log(`✅ Migrated ${analyticsSessions.length} analytics sessions`);

    // Migrate analytics_events
    console.log('Migrating analytics_events...');
    const analyticsEvents = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM analytics_events', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    for (const event of analyticsEvents) {
      await mysqlConnection.execute(
        `INSERT IGNORE INTO analytics_events 
         (id, session_id, user_id, event_type, event_name, page_path, page_title, category, action, label, value, 
          metadata, user_agent, ip_address, referrer, device_type, browser, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id,
          event.session_id,
          event.user_id || null,
          event.event_type,
          event.event_name,
          event.page_path,
          event.page_title || null,
          event.category || null,
          event.action || null,
          event.label || null,
          event.value || null,
          event.metadata || null,
          event.user_agent || null,
          event.ip_address || null,
          event.referrer || null,
          event.device_type || null,
          event.browser || null,
          event.created_at || null
        ]
      );
    }
    console.log(`✅ Migrated ${analyticsEvents.length} analytics events`);

    // Commit transaction
    await mysqlConnection.commit();
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Set DB_TYPE=mysql in your .env file');
    console.log('2. Restart your server');
    console.log('3. Verify data in MySQL database');

  } catch (error) {
    await mysqlConnection.rollback();
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await mysqlConnection.end();
    sqliteDb.close();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Migration script failed:', err);
    process.exit(1);
  });


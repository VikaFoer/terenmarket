const db = require('../database');
const axios = require('axios');

// Railway production URL
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://confident-alignment-stage.up.railway.app';

// Admin credentials for API call (you may need to adjust this)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''; // Set this if you have a token

const compareEnvironments = async () => {
  console.log('🔍 Порівняння стану бази даних: Staging (локально) vs Production (Railway)\n');
  console.log('='.repeat(80));

  // Initialize local database
  console.log('\n📊 Перевірка локальної бази даних (Staging)...');
  await db.init();
  const localDb = db.getDb();

  // Get local database stats
  const getLocalStats = () => {
    return new Promise((resolve, reject) => {
      // Get all products with categories
      localDb.all(`
        SELECT 
          p.id,
          p.name,
          p.cost_price,
          c.id as category_id,
          c.name as category_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        ORDER BY c.name, p.name
      `, (err, products) => {
        if (err) return reject(err);

        // Get all categories with product counts
        localDb.all(`
          SELECT 
            c.id,
            c.name,
            COUNT(p.id) as product_count
          FROM categories c
          LEFT JOIN products p ON p.category_id = c.id
          GROUP BY c.id, c.name
          ORDER BY c.name
        `, (err, categories) => {
          if (err) return reject(err);

          // Get all clients with their assigned categories
          localDb.all(`
            SELECT 
              cl.id as client_id,
              cl.login,
              cl.company_name,
              GROUP_CONCAT(c.name) as assigned_categories,
              GROUP_CONCAT(c.id) as assigned_category_ids
            FROM clients cl
            LEFT JOIN client_categories cc ON cl.id = cc.client_id
            LEFT JOIN categories c ON cc.category_id = c.id
            GROUP BY cl.id, cl.login, cl.company_name
            ORDER BY cl.login
          `, (err, clients) => {
            if (err) return reject(err);

            // Get products in "Фільтри" category
            localDb.all(`
              SELECT 
                p.id,
                p.name,
                p.cost_price
              FROM products p
              JOIN categories c ON p.category_id = c.id
              WHERE c.name = 'Фільтри'
              ORDER BY p.name
            `, (err, filterProducts) => {
              if (err) return reject(err);

              // Get which clients have access to "Фільтри" category
              localDb.all(`
                SELECT 
                  cl.id as client_id,
                  cl.login,
                  cl.company_name
                FROM clients cl
                JOIN client_categories cc ON cl.id = cc.client_id
                JOIN categories c ON cc.category_id = c.id
                WHERE c.name = 'Фільтри'
                ORDER BY cl.login
              `, (err, clientsWithFilterAccess) => {
                if (err) return reject(err);

                resolve({
                  total_products: products.length,
                  total_categories: categories.length,
                  total_clients: clients.length,
                  categories: categories,
                  filter_category: {
                    name: 'Фільтри',
                    products_count: filterProducts.length,
                    products: filterProducts,
                    clients_with_access: clientsWithFilterAccess.length,
                    clients_with_access_list: clientsWithFilterAccess
                  },
                  clients: clients.map(client => ({
                    ...client,
                    assigned_categories: client.assigned_categories ? client.assigned_categories.split(',') : [],
                    assigned_category_ids: client.assigned_category_ids ? client.assigned_category_ids.split(',').map(Number) : [],
                    has_filter_access: client.assigned_category_ids ? client.assigned_category_ids.split(',').map(Number).includes(4) : false
                  }))
                });
              });
            });
          });
        });
      });
    });
  };

  try {
    const localStats = await getLocalStats();

    console.log('\n✅ Локальна база даних (Staging):');
    console.log(`   📦 Всього товарів: ${localStats.total_products}`);
    console.log(`   📁 Всього категорій: ${localStats.total_categories}`);
    console.log(`   👥 Всього клієнтів: ${localStats.total_clients}`);
    console.log(`   🔍 Товарів у категорії "Фільтри": ${localStats.filter_category.products_count}`);
    console.log(`   👤 Клієнтів з доступом до "Фільтри": ${localStats.filter_category.clients_with_access}`);

    if (localStats.filter_category.products.length > 0) {
      console.log('\n   Товари в категорії "Фільтри":');
      localStats.filter_category.products.forEach((p, idx) => {
        console.log(`      ${idx + 1}. ${p.name}`);
      });
    }

    if (localStats.filter_category.clients_with_access_list.length > 0) {
      console.log('\n   Клієнти з доступом до "Фільтри":');
      localStats.filter_category.clients_with_access_list.forEach((client) => {
        console.log(`      • ${client.login} ${client.company_name ? `(${client.company_name})` : ''}`);
      });
    }

    // Get production stats
    console.log('\n\n📊 Перевірка бази даних на Railway (Production)...');
    console.log(`   URL: ${PRODUCTION_URL}/api/db-status`);

    let productionStats = null;
    try {
      // Try public endpoint first
      const response = await axios.get(`${PRODUCTION_URL}/api/db-status`, {
        timeout: 10000
      });
      productionStats = response.data;
      console.log('✅ Отримано дані з Production (публічний endpoint)');
    } catch (error) {
      // If public endpoint fails, try admin endpoint with token
      if (ADMIN_TOKEN) {
        try {
          const response = await axios.get(`${PRODUCTION_URL}/api/admin/db-diagnostics`, {
            timeout: 10000,
            headers: {
              'Authorization': `Bearer ${ADMIN_TOKEN}`
            }
          });
          productionStats = response.data;
          console.log('✅ Отримано дані з Production (admin endpoint)');
        } catch (adminError) {
          console.error('❌ Помилка отримання даних з Production:');
          if (adminError.response) {
            console.error(`   Статус: ${adminError.response.status}`);
            console.error(`   Помилка: ${adminError.response.data?.error || adminError.response.data?.message || 'Unknown error'}`);
          } else {
            console.error(`   Помилка: ${adminError.message}`);
          }
        }
      } else {
        console.error('❌ Помилка отримання даних з Production:');
        if (error.response) {
          console.error(`   Статус: ${error.response.status}`);
          console.error(`   Помилка: ${error.response.data?.error || error.response.data?.message || 'Unknown error'}`);
        } else if (error.request) {
          console.error('   Не вдалося з\'єднатися з сервером');
          console.error('   Перевірте, чи працює Railway deployment');
        } else {
          console.error(`   Помилка: ${error.message}`);
        }
      }
    }

    if (productionStats) {
      console.log('\n✅ База даних на Railway (Production):');
      console.log(`   📦 Всього товарів: ${productionStats.total_products}`);
      console.log(`   📁 Всього категорій: ${productionStats.total_categories}`);
      console.log(`   👥 Всього клієнтів: ${productionStats.total_clients}`);
      console.log(`   🔍 Товарів у категорії "Фільтри": ${productionStats.filter_category.products_count}`);
      console.log(`   👤 Клієнтів з доступом до "Фільтри": ${productionStats.filter_category.clients_with_access}`);

      if (productionStats.filter_category.products.length > 0) {
        console.log('\n   Товари в категорії "Фільтри":');
        productionStats.filter_category.products.forEach((p, idx) => {
          console.log(`      ${idx + 1}. ${p.name}`);
        });
      }

      if (productionStats.filter_category.clients_with_access_list && productionStats.filter_category.clients_with_access_list.length > 0) {
        console.log('\n   Клієнти з доступом до "Фільтри":');
        productionStats.filter_category.clients_with_access_list.forEach((client) => {
          console.log(`      • ${client.login} ${client.company_name ? `(${client.company_name})` : ''}`);
        });
      }

      // Compare
      console.log('\n\n📊 ПОРІВНЯННЯ:');
      console.log('='.repeat(80));

      const differences = [];

      if (localStats.total_products !== productionStats.total_products) {
        differences.push(`Товари: Staging=${localStats.total_products}, Production=${productionStats.total_products}`);
      }
      if (localStats.total_categories !== productionStats.total_categories) {
        differences.push(`Категорії: Staging=${localStats.total_categories}, Production=${productionStats.total_categories}`);
      }
      if (localStats.total_clients !== productionStats.total_clients) {
        differences.push(`Клієнти: Staging=${localStats.total_clients}, Production=${productionStats.total_clients}`);
      }
      if (localStats.filter_category.products_count !== productionStats.filter_category.products_count) {
        differences.push(`Товари "Фільтри": Staging=${localStats.filter_category.products_count}, Production=${productionStats.filter_category.products_count}`);
      }
      if (localStats.filter_category.clients_with_access !== productionStats.filter_category.clients_with_access) {
        differences.push(`Доступ до "Фільтри": Staging=${localStats.filter_category.clients_with_access}, Production=${productionStats.filter_category.clients_with_access}`);
      }

      if (differences.length === 0) {
        console.log('✅ Бази даних ідентичні!');
      } else {
        console.log('⚠️  Виявлено відмінності:');
        differences.forEach(diff => console.log(`   • ${diff}`));
      }

      // Compare categories
      console.log('\n📁 Порівняння категорій:');
      const localCategoriesMap = new Map(localStats.categories.map(c => [c.name, c.product_count]));
      const prodCategoriesMap = new Map(productionStats.categories.map(c => [c.name, c.product_count]));

      const allCategoryNames = new Set([...localCategoriesMap.keys(), ...prodCategoriesMap.keys()]);
      let categoryDiff = false;
      allCategoryNames.forEach(catName => {
        const localCount = localCategoriesMap.get(catName) || 0;
        const prodCount = prodCategoriesMap.get(catName) || 0;
        if (localCount !== prodCount) {
          console.log(`   ⚠️  "${catName}": Staging=${localCount}, Production=${prodCount}`);
          categoryDiff = true;
        }
      });
      if (!categoryDiff) {
        console.log('   ✅ Всі категорії мають однакову кількість товарів');
      }

      // Compare clients (only if we have full client data from admin endpoint)
      if (productionStats.clients) {
        console.log('\n👥 Порівняння клієнтів та їх доступу:');
        const localClientsMap = new Map(localStats.clients.map(c => [c.login, {
          categories: c.assigned_categories,
          has_filter: c.has_filter_access
        }]));
        const prodClientsMap = new Map(productionStats.clients.map(c => [c.login, {
          categories: c.assigned_categories,
          has_filter: c.has_filter_access
        }]));

        const allClientLogins = new Set([...localClientsMap.keys(), ...prodClientsMap.keys()]);
        let clientDiff = false;
        allClientLogins.forEach(login => {
          const localClient = localClientsMap.get(login);
          const prodClient = prodClientsMap.get(login);
          if (!localClient || !prodClient) {
            console.log(`   ⚠️  "${login}": ${!localClient ? 'відсутній у Staging' : 'відсутній у Production'}`);
            clientDiff = true;
          } else {
            const localHasFilter = localClient.has_filter;
            const prodHasFilter = prodClient.has_filter;
            if (localHasFilter !== prodHasFilter) {
              console.log(`   ⚠️  "${login}": доступ до "Фільтри" - Staging=${localHasFilter}, Production=${prodHasFilter}`);
              clientDiff = true;
            }
          }
        });
        if (!clientDiff) {
          console.log('   ✅ Всі клієнти мають однаковий доступ');
        }
      } else {
        console.log('\n👥 Порівняння клієнтів:');
        console.log(`   📊 Кількість клієнтів з доступом до "Фільтри": Staging=${localStats.filter_category.clients_with_access}, Production=${productionStats.filter_category.clients_with_access}`);
        if (localStats.filter_category.clients_with_access !== productionStats.filter_category.clients_with_access) {
          console.log('   ⚠️  Відмінність у кількості клієнтів з доступом до "Фільтри"');
        } else {
          console.log('   ✅ Однакова кількість клієнтів з доступом до "Фільтри"');
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Перевірка завершена');

  } catch (error) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  compareEnvironments()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { compareEnvironments };


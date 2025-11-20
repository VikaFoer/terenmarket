// Скрипт для відновлення бази даних на Railway через API
const fs = require('fs');
const path = require('path');
const https = require('https');

const RAILWAY_URL = process.env.RAILWAY_URL || 'https://confident-alignment-stage.up.railway.app';
const EXPORT_FILE = path.join(__dirname, 'server', 'database_export.json');

console.log('🚀 Відновлення бази даних на Railway...');
console.log('URL:', RAILWAY_URL);
console.log('Файл:', EXPORT_FILE);

if (!fs.existsSync(EXPORT_FILE)) {
  console.error('❌ Файл database_export.json не знайдено!');
  console.error('Шлях:', EXPORT_FILE);
  process.exit(1);
}

const exportData = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));

console.log('\n📊 Дані для відновлення:');
console.log(`  - Клієнти: ${exportData.clients.length}`);
console.log(`  - Товари: ${exportData.products.length}`);
console.log(`  - Категорії: ${exportData.categories.length}`);
console.log(`  - Client Categories: ${exportData.client_categories?.length || 0}`);
console.log(`  - Коефіцієнти: ${exportData.client_product_coefficients?.length || 0}`);

const postData = JSON.stringify(exportData);

const options = {
  hostname: new URL(RAILWAY_URL).hostname,
  port: 443,
  path: '/api/db-restore',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  rejectUnauthorized: false // Для Railway SSL
};

console.log('\n📤 Відправка даних...');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('\n✅ База даних відновлена успішно!');
        console.log('\n📈 Відновлено:');
        console.log(`  - Клієнтів: ${result.imported.clients}`);
        console.log(`  - Товарів: ${result.imported.products}`);
        console.log(`  - Категорій клієнтів: ${result.imported.client_categories}`);
        console.log(`  - Коефіцієнтів: ${result.imported.coefficients}`);
        console.log('\n🔗 Перевірте через:');
        console.log(`   ${RAILWAY_URL}/api/db-info`);
      } else {
        console.error('\n❌ Помилка відновлення:');
        console.error(result);
      }
    } catch (error) {
      console.error('\n❌ Помилка парсингу відповіді:');
      console.error(data);
      console.error(error);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Помилка запиту:');
  console.error(error);
});

req.write(postData);
req.end();


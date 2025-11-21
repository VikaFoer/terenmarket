const XLSX = require('xlsx');
const path = require('path');
const db = require('../database');

const EXCEL_FILE_PATH = path.join(__dirname, '../../clients_products_prices.xlsx');

const updateCompanyNames = async () => {
  try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    
    // Отримуємо назву першого листа
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Конвертуємо в JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    
    if (data.length === 0) {
      console.log('No data found in Excel file');
      return;
    }
    
    console.log('Found ' + data.length + ' rows in Excel file');
    console.log('Columns:', Object.keys(data[0]));
    
    // Ініціалізуємо базу даних
    await db.init();
    const database = db.getDb();
    
    // Знаходимо колонки
    const columns = Object.keys(data[0]);
    console.log('Available columns:', columns);
    
    // Шукаємо колонку з назвою клієнта
    const clientNameCol = columns.find(function(col) {
      const lower = col.toLowerCase();
      return lower.includes('клієнт') || lower.includes('client') || lower.includes('назва');
    });
    
    console.log('Detected client name column:', clientNameCol);
    
    if (!clientNameCol) {
      console.error('Could not find client name column in Excel file');
      return;
    }
    
    // Створюємо мапу: login -> company_name
    const loginToCompanyName = new Map();
    
    // Генерація логіну на основі назви клієнта (така ж логіка як в importExcel.js)
    const generateLogin = (clientName, index) => {
      if (!clientName) return 'client_' + index;
      
      // Транслітерація українських символів
      const transliteration = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'є': 'ye',
        'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k',
        'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's',
        'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
        'щ': 'shch', 'ь': '', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Є': 'Ye',
        'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K',
        'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S',
        'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh',
        'Щ': 'Shch', 'Ь': '', 'Ю': 'Yu', 'Я': 'Ya'
      };
      
      let login = clientName
        .toLowerCase()
        .split('')
        .map(function(char) {
          return transliteration[char] || char;
        })
        .join('')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      if (!login) login = 'client_' + index;
      if (login.length > 30) login = login.substring(0, 30);
      
      return login;
    };
    
    // Збираємо унікальні назви клієнтів
    const uniqueClients = new Map();
    data.forEach(function(row, index) {
      const clientName = row[clientNameCol];
      if (clientName) {
        const login = generateLogin(clientName, index);
        if (!uniqueClients.has(login)) {
          uniqueClients.set(login, clientName);
        }
      }
    });
    
    console.log('\nFound ' + uniqueClients.size + ' unique clients in Excel');
    
    // Оновлюємо company_name для кожного клієнта
    let updatedCount = 0;
    let notFoundCount = 0;
    
    for (const [login, companyName] of uniqueClients) {
      // Спочатку пробуємо знайти за точним логіном
      let found = false;
      
      await new Promise((resolve, reject) => {
        database.run(
          'UPDATE clients SET company_name = ? WHERE login = ?',
          [companyName, login],
          function(err) {
            if (err) {
              console.error('Error updating client ' + login + ':', err);
              reject(err);
            } else {
              if (this.changes > 0) {
                console.log('Updated: ' + login + ' -> ' + companyName);
                updatedCount++;
                found = true;
              }
              resolve();
            }
          }
        );
      });
      
      // Якщо не знайдено за точним логіном, пробуємо знайти за частиною логіну
      if (!found) {
        await new Promise((resolve, reject) => {
          // Видаляємо останні символи з логіну для пошуку
          const loginPrefix = login.replace(/[a-z]$/, '').replace(/[a-z]$/, '');
          
          database.all(
            'SELECT id, login FROM clients WHERE login LIKE ? AND (company_name IS NULL OR company_name = "")',
            [loginPrefix + '%'],
            function(err, rows) {
              if (err) {
                reject(err);
              } else {
                if (rows.length === 1) {
                  // Знайдено один клієнт, оновлюємо його
                  database.run(
                    'UPDATE clients SET company_name = ? WHERE id = ?',
                    [companyName, rows[0].id],
                    function(updateErr) {
                      if (updateErr) {
                        console.error('Error updating client by ID:', updateErr);
                        reject(updateErr);
                      } else {
                        console.log('Updated (by partial match): ' + rows[0].login + ' -> ' + companyName);
                        updatedCount++;
                        found = true;
                        resolve();
                      }
                    }
                  );
                } else {
                  // Не знайдено або знайдено багато
                  if (rows.length === 0) {
                    console.log('Not found in database: ' + login + ' (' + companyName + ')');
                    notFoundCount++;
                  } else {
                    console.log('Multiple matches found for: ' + login + ' (' + companyName + '), skipping');
                    notFoundCount++;
                  }
                  resolve();
                }
              }
            }
          );
        });
      }
    }
    
    console.log('\n=== Update completed! ===');
    console.log('Updated: ' + updatedCount + ' clients');
    console.log('Not found: ' + notFoundCount + ' clients');
    
  } catch (error) {
    console.error('Error updating company names:', error);
    throw error;
  }
};

// Запускаємо оновлення
if (require.main === module) {
  updateCompanyNames()
    .then(function() {
      console.log('\nUpdate process completed!');
      process.exit(0);
    })
    .catch(function(error) {
      console.error('\nUpdate failed:', error);
      process.exit(1);
    });
}

module.exports = { updateCompanyNames };


const db = require('../database');

const checkImages = async () => {
  try {
    await db.init();
    const database = db.getDb();

    const products = await new Promise((resolve, reject) => {
      database.all('SELECT id, name, image_url FROM products', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`Found ${products.length} products\n`);
    products.forEach(p => {
      console.log(`${p.id}. ${p.name}`);
      console.log(`   Image URL: ${p.image_url || 'NULL'}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkImages();


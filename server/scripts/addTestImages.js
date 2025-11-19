const db = require('../database');

const addTestImages = async () => {
  try {
    await db.init();
    const database = db.getDb();

    // Get all products
    const products = await new Promise((resolve, reject) => {
      database.all('SELECT id, name FROM products', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`Found ${products.length} products`);

    // Update each product with a placeholder image URL
    for (const product of products) {
      const imageUrl = `https://via.placeholder.com/300x200/2c3e50/ffffff?text=${encodeURIComponent(product.name)}`;
      
      await new Promise((resolve, reject) => {
        database.run(
          'UPDATE products SET image_url = ? WHERE id = ?',
          [imageUrl, product.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      console.log(`Updated product "${product.name}" with image URL`);
    }

    console.log('\n✓ All products updated with test images!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

addTestImages();


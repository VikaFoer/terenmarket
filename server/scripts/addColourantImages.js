const db = require('../database');

// Мапінг назв продуктів до URL картинок колорантів
// Використовуємо picsum.photos для надійних картинок
const productImageMap = {
  'KX': 'https://picsum.photos/400/300?random=1',
  'V': 'https://picsum.photos/400/300?random=2',
  'R': 'https://picsum.photos/400/300?random=3',
  'F': 'https://picsum.photos/400/300?random=4',
  'I': 'https://picsum.photos/400/300?random=5',
  'C': 'https://picsum.photos/400/300?random=6',
  'L': 'https://picsum.photos/400/300?random=7',
  'T': 'https://picsum.photos/400/300?random=8',
  'AXX': 'https://picsum.photos/400/300?random=9',
  'D': 'https://picsum.photos/400/300?random=10',
  'E': 'https://picsum.photos/400/300?random=11',
  'B ': 'https://picsum.photos/400/300?random=12',
  'AN': 'https://picsum.photos/400/300?random=13',
  'RN': 'https://picsum.photos/400/300?random=14',
  'ВХ': 'https://picsum.photos/400/300?random=15',
  'A3-R': 'https://picsum.photos/400/300?random=16',
  'Средний %': 'https://picsum.photos/400/300?random=17',
  'Повышение 2019': 'https://picsum.photos/400/300?random=18',
  'Поддержка лабы': 'https://picsum.photos/400/300?random=19',
  'К-во колорантов/год': 'https://picsum.photos/400/300?random=20',
};

// Загальні картинки для різних типів колорантів
const getColourantImage = (productName) => {
  // Перевіряємо чи є конкретна картинка
  if (productImageMap[productName]) {
    return productImageMap[productName];
  }
  
  // Використовуємо picsum.photos з різними random seeds
  let hash = 0;
  for (let i = 0; i < productName.length; i++) {
    hash = productName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const randomSeed = Math.abs(hash) % 1000;
  
  return `https://picsum.photos/400/300?random=${randomSeed}`;
};

const addColourantImages = async () => {
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

    // Update each product with colourant image URL
    for (const product of products) {
      const imageUrl = getColourantImage(product.name);
      
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

      console.log(`Updated product "${product.name}" with colourant image`);
    }

    console.log('\n✓ All products updated with colourant images!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

addColourantImages();


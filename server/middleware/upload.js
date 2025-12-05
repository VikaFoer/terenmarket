const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Use Railway volume path if available, otherwise use local path
// This ensures uploaded images persist across deployments
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');
const uploadsDir = path.join(DATA_DIR, 'uploads', 'images');

// Створюємо папку для зображень, якщо її немає
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
  console.log('Using DATA_DIR:', DATA_DIR);
} else {
  console.log('Uploads directory already exists:', uploadsDir);
  console.log('Using DATA_DIR:', DATA_DIR);
}

// Налаштування зберігання файлів
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Генеруємо унікальне ім'я файлу: timestamp + оригінальне ім'я
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

// Фільтр для перевірки типу файлу
const fileFilter = (req, file, cb) => {
  // Дозволяємо тільки зображення
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Дозволені тільки зображення (jpeg, jpg, png, gif, webp)'));
  }
};

// Налаштування multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB максимум
  },
  fileFilter: fileFilter
});

module.exports = upload;


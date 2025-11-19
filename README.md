# SmartMarket - Internet Shop з унікальними цінами

Інтернет магазин з системою унікальних цін для кожного клієнта на основі коефіцієнтів.

## Особливості

- **Унікальні ціни**: Кожен клієнт бачить індивідуальні ціни на товари
- **Управління коефіцієнтами**: Адміністратор може встановлювати коефіцієнти для кожного клієнта та продукту
- **Категорії товарів**: Система категорій з можливістю обмеження доступу для клієнтів
- **Адмін панель**: Повне управління клієнтами, продуктами та коефіцієнтами
- **Курси валют**: Відображення курсу Євро з API НБУ
- **Кошик покупок**: Функціонал додавання товарів до кошика

## Технології

- **Backend**: Node.js, Express, SQLite
- **Frontend**: React, Material-UI
- **Аутентифікація**: JWT
- **API валют**: НБУ (bank.gov.ua)

## Деплой на Railway

> **Примітка**: База даних створюється автоматично при запуску сервера. Детальні інструкції в `DATABASE_SETUP.md`

### Backend (API Server)

1. **Створіть новий проект на Railway**
   - Натисніть "New Project"
   - Оберіть "GitHub Repo" → `VikaFoer/smartmart`

2. **Налаштуйте Root Directory**
   - Settings → Source → Root Directory: **порожнє** (корінь проекту)

3. **Створіть Volume для бази даних**
   - Volumes → New Volume
   - Name: `database-storage`
   - Mount Path: `/app/server/data`
   - Size: 5 GB

4. **Додайте змінну середовища**
   - Settings → Variables
   - Name: `DATA_DIR`
   - Value: `/app/server/data`

5. **Railway автоматично**:
   - Використає `nixpacks.toml` або `Procfile` для збірки
   - Встановить залежності з `server/package.json`
   - Запустить сервер

6. **Перевірка**
   - Відкрийте URL вашого backend
   - Перевірте: `https://your-backend.railway.app/api/health`
   - Має повернути: `{"status":"ok"}`

### Frontend (React App)

1. **Створіть новий сервіс у тому ж проекті**
   - У проекті натисніть "New Service"
   - Оберіть "GitHub Repo" → `VikaFoer/smartmart`

2. **Налаштуйте Root Directory**
   - Settings → Source → Root Directory: `client`

3. **Додайте змінну середовища**
   - Settings → Variables
   - Name: `REACT_APP_API_URL`
   - Value: `https://your-backend.railway.app/api` (замініть на ваш backend URL)

4. **Railway автоматично**:
   - Використає `client/nixpacks.toml` для збірки
   - Збудує React додаток
   - Запустить через `serve`

5. **Перевірка**
   - Відкрийте URL вашого frontend
   - Спробуйте увійти: `admin` / `admin123`

## Локальна розробка

### Встановлення

1. Встановіть залежності:
```bash
npm run install-all
```

2. Запустіть сервер та клієнт:
```bash
npm run dev
```

Сервер буде доступний на `http://localhost:5000`  
Клієнт буде доступний на `http://localhost:3000`

### Імпорт даних з Excel

1. Покладіть файл `clients_products_prices.xlsx` в кореневу папку проекту

2. Запустіть скрипт імпорту:
```bash
cd server
npm run import
```

Скрипт автоматично:
- Згенерує унікальні логіни та паролі для кожного клієнта
- Створить клієнтів у системі
- Імпортує продукти з собівартістю
- Встановить коефіцієнти для кожного клієнта та продукту
- Збереже згенеровані credentials у файл `imported_credentials.txt`

## Вхід в систему

**Адміністратор:**
- Логін: `admin`
- Пароль: `admin123`

## Структура бази даних

- **categories** - Категорії товарів
- **products** - Продукти з собівартістю
- **clients** - Клієнти з контактними даними
- **client_product_coefficients** - Коефіцієнти для кожного клієнта та продукту
- **client_categories** - Доступні категорії для кожного клієнта

## API Endpoints

### Аутентифікація
- `POST /api/auth/login` - Вхід в систему

### Адмін панель (потребує аутентифікації)
- `GET /api/admin/clients` - Отримати всіх клієнтів
- `POST /api/admin/clients` - Створити клієнта
- `PUT /api/admin/clients/:id` - Оновити клієнта
- `DELETE /api/admin/clients/:id` - Видалити клієнта
- `GET /api/admin/products` - Отримати всі продукти
- `POST /api/admin/products` - Створити продукт
- `PUT /api/admin/products/:id` - Оновити продукт
- `DELETE /api/admin/products/:id` - Видалити продукт
- `POST /api/admin/coefficients` - Встановити коефіцієнт
- `GET /api/admin/categories` - Отримати всі категорії

### Клієнтська частина (потребує аутентифікації)
- `GET /api/client/products` - Отримати доступні продукти з унікальними цінами
- `GET /api/client/categories` - Отримати доступні категорії

### Курси валют (публічний)
- `GET /api/currency/rates` - Отримати всі курси валют
- `GET /api/currency/rates/:code` - Отримати курс конкретної валюти (наприклад, EUR)

## Структура проекту

```
SmartMarket/
├── client/                 # React frontend
│   ├── src/
│   ├── public/
│   ├── nixpacks.toml      # Railway конфігурація для frontend
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── routes/            # API routes
│   ├── middleware/        # Auth middleware
│   ├── scripts/           # Utility scripts
│   ├── database.js        # Database initialization
│   ├── index.js           # Server entry point
│   └── package.json
│
├── nixpacks.toml          # Railway конфігурація для backend
├── Procfile               # Railway альтернативна конфігурація
├── railway.json           # Railway налаштування
└── README.md
```

## Важливі примітки

- **Volume обов'язковий** для SQLite на Railway, інакше дані будуть втрачені при перезапуску
- База даних автоматично створюється при першому запуску
- Адміністратор створюється автоматично з логіном `admin` та паролем `admin123`
- Всі категорії додаються автоматично при ініціалізації
- CORS налаштований для роботи з frontend
- Railway автоматично надає HTTPS для обох сервісів

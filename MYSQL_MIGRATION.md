# Міграція на MySQL

Цей документ описує процес міграції проекту з SQLite на MySQL.

## Передумови

1. MySQL сервер повинен бути доступний
2. База даних повинна бути створена
3. Користувач повинен мати права на створення таблиць та запис даних

## Крок 1: Встановлення залежностей

```bash
cd server
npm install
```

Це встановить `mysql2` пакет, який необхідний для роботи з MySQL.

## Крок 2: Налаштування змінних середовища

Створіть файл `.env` в корені проекту або в папці `server/` з наступним вмістом:

```env
# Database Configuration
DB_TYPE=mysql
DB_HOST=tecsa.mysql.ukraine.com.ua
DB_PORT=3306
DB_USER=tecsa_marketdatabase
DB_PASSWORD=your_mysql_password_here
DB_NAME=tecsa_marketdatabase

# Server Configuration
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# JWT Secret
JWT_SECRET=your-secret-key-change-in-production
```

**Важливо:** Замініть `your_mysql_password_here` на реальний пароль від MySQL бази даних.

## Крок 3: Міграція даних з SQLite в MySQL

Якщо у вас є існуюча SQLite база даних з даними, які потрібно перенести:

```bash
node server/scripts/migrateToMySQL.js
```

Цей скрипт:
- Підключиться до SQLite бази даних
- Підключиться до MySQL бази даних
- Перенесе всі дані з SQLite в MySQL
- Збереже всі ID та зв'язки між таблицями

**Примітка:** Скрипт використовує `INSERT IGNORE`, тому якщо дані вже існують в MySQL, вони не будуть перезаписані.

## Крок 4: Запуск сервера

Після налаштування змінних середовища та міграції даних, запустіть сервер:

```bash
npm start
```

Сервер автоматично:
- Підключиться до MySQL бази даних
- Створить всі необхідні таблиці (якщо їх немає)
- Вставить дефолтні категорії (якщо таблиця порожня)
- Створить адміністратора (якщо його немає)

## Fallback на SQLite

Якщо MySQL не налаштовано (відсутні змінні середовища `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`), сервер автоматично використає SQLite як fallback.

## Перевірка підключення

Після запуску сервера перевірте логи. Ви повинні побачити:

```
=== MySQL Database Configuration ===
Host: tecsa.mysql.ukraine.com.ua
Port: 3306
Database: tecsa_marketdatabase
User: tecsa_marketdatabase
===================================
✅ Connected to MySQL database
```

## Структура бази даних

Проект підтримує наступні таблиці:
- `categories` - категорії товарів
- `products` - товари
- `clients` - клієнти
- `client_categories` - зв'язок клієнтів з категоріями
- `client_product_coefficients` - коефіцієнти цін для клієнтів
- `category_managers` - менеджери категорій
- `email_subscriptions` - підписки на email
- `qr_page_categories` - категорії для QR сторінок
- `analytics_sessions` - сесії аналітики
- `analytics_events` - події аналітики

## Відмінності між SQLite та MySQL

Проект автоматично конвертує SQL запити з SQLite синтаксису в MySQL:
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `INT AUTO_INCREMENT PRIMARY KEY`
- `INSERT OR IGNORE` → `INSERT IGNORE`
- `INSERT OR REPLACE` → `REPLACE`
- `GROUP_CONCAT` → `GROUP_CONCAT ... SEPARATOR ','`
- `TEXT` → `TEXT` (залишається)
- `REAL` → `DOUBLE`

## Усунення проблем

### Помилка підключення до MySQL

Перевірте:
1. Чи правильні дані для підключення в `.env`
2. Чи доступний MySQL сервер з вашого сервера
3. Чи має користувач права на підключення та роботу з базою даних

### Помилка створення таблиць

Перевірте:
1. Чи має користувач права на створення таблиць
2. Чи існує база даних з вказаною назвою
3. Чи правильна кодування бази даних (має бути `utf8mb4`)

### Дані не відображаються

Перевірте:
1. Чи виконана міграція даних
2. Чи підключення до правильної бази даних
3. Перевірте логи сервера на наявність помилок

## Додаткова інформація

Для отримання додаткової інформації про базу даних, використовуйте endpoint:
```
GET /api/db-info
```

Він поверне інформацію про тип бази даних та кількість записів у таблицях.


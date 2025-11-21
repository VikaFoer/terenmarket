# Інструкція зі створення бази даних на Railway

## Автоматичне створення (рекомендовано)

База даних **автоматично створюється** при запуску сервера через `server/database.js`.

### Що відбувається автоматично:

1. **Створюються всі таблиці**:
   - `categories` - Категорії товарів
   - `products` - Продукти
   - `clients` - Клієнти
   - `client_product_coefficients` - Коефіцієнти
   - `client_categories` - Доступні категорії для клієнтів

2. **Додаються категорії за замовчуванням**:
   - Хімічна сировина
   - Колоранти
   - Брукер Оптікс (БІЧ)
   - Колірувальне обладнання
   - Фільтри
   - Брукер АХС
   - Лабораторка
   - Роботи/автоматизація

3. **Створюється адміністратор**:
   - Login: `admin`
   - Password: `admin123`
   - Email: `admin@smartmarket.com`

### Налаштування на Railway:

1. **Створіть Volume**:
   - Volumes → New Volume
   - Name: `database-storage`
   - Mount Path: `/app/server/data`
   - Size: 5 GB

2. **Додайте змінну середовища**:
   - Variables → Add Variable
   - Name: `DATA_DIR`
   - Value: `/app/server/data`

3. **Запустіть сервер**:
   - Railway автоматично запустить сервер
   - База даних створиться автоматично при першому запуску

## Ручне створення (якщо потрібно)

Якщо потрібно створити БД вручну, використайте файл `server/database.sql`:

### Через Railway CLI:

```bash
# Підключіться до Railway
railway link

# Відкрийте shell
railway shell

# Створіть базу даних
sqlite3 /app/server/data/database.sqlite < /app/server/database.sql
```

### Через Railway Dashboard:

1. Відкрийте ваш сервіс на Railway
2. Відкрийте **Deployments** → **View Logs**
3. Натисніть **"Shell"** або **"Connect"**
4. Виконайте команди:
   ```bash
   cd server
   sqlite3 ../data/database.sqlite < database.sql
   ```

## Структура бази даних

### Таблиця: categories
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);
```

### Таблиця: products
```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    cost_price REAL NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

### Таблиця: clients
```sql
CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    location TEXT,
    phone TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Таблиця: client_product_coefficients
```sql
CREATE TABLE client_product_coefficients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    coefficient REAL NOT NULL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(client_id, product_id)
);
```

### Таблиця: client_categories
```sql
CREATE TABLE client_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(client_id, category_id)
);
```

## Початкові дані

### Категорії (додаються автоматично):
1. Хімічна сировина
2. Колоранти
2. Брукер Оптікс (БІЧ)
3. Колірувальне обладнання
4. Фільтри
5. Брукер АХС
6. Лабораторка
7. Роботи/автоматизація

### Адміністратор (створюється автоматично):
- **Login**: `admin`
- **Password**: `admin123`
- **Email**: `admin@smartmarket.com`

## Перевірка після створення

1. Перевірте логи Railway - має бути:
   ```
   Connected to SQLite database
   Database initialized successfully
   ```

2. Перевірте health endpoint:
   ```
   https://your-app.railway.app/api/health
   ```

3. Спробуйте увійти:
   - Login: `admin`
   - Password: `admin123`

## Важливі примітки

- **Volume обов'язковий** - без нього дані будуть втрачені при перезапуску
- База даних автоматично створюється при першому запуску
- Всі дані зберігаються в `/app/server/data/database.sqlite`
- Для зміни структури БД оновіть `server/database.js`


# Повний гайд по деплою на Railway

## Поточний статус

API працює (показує JSON відповідь), але можуть бути проблеми з базою даних або налаштуваннями.

## Покрокова інструкція

### Крок 1: Створення проекту

1. Зайдіть на [railway.app](https://railway.app)
2. Натисніть **"New Project"**
3. Оберіть **"Deploy from GitHub repo"**
4. Виберіть репозиторій `VikaFoer/smartmart`
5. Railway автоматично визначить проект

### Крок 2: Налаштування Backend сервісу

#### 2.1. Root Directory
- Відкрийте **Settings** → **Source**
- **Root Directory**: залиште **ПОРОЖНІМ** (не вказуйте нічого)
- ⚠️ **ВАЖЛИВО**: Якщо вказано `/client/src/components` або інший шлях - видаліть його!

#### 2.2. Створення Volume (ОБОВ'ЯЗКОВО!)

1. У вашому проекті натисніть **"New"** → **"Volume"**
2. Налаштування:
   - **Name**: `database-storage`
   - **Mount Path**: `/app/server/data`
   - **Size**: 5 GB
3. Натисніть **"Add"**

#### 2.3. Змінні середовища

1. Відкрийте ваш Backend сервіс
2. Відкрийте **Settings** → **Variables**
3. Додайте змінну:
   - **Name**: `DATA_DIR`
   - **Value**: `/app/server/data`
   - Натисніть **"Add"**

#### 2.4. Перевірка Build налаштувань

Railway автоматично використає один з файлів:
- `nixpacks.toml` (пріоритет)
- `Procfile`
- `railway.json`

Якщо потрібно вручну (Settings → Build):
- **Build Command**: `cd server && npm install`
- **Start Command**: `cd server && node index.js`

### Крок 3: Перевірка після деплою

#### 3.1. Перевірка логів

1. Відкрийте **Deployments** → **View Logs**
2. Має бути:
   ```
   > cd server && npm install
   > Connected to SQLite database
   > Database initialized successfully
   > Server is running on port <PORT>
   ```

#### 3.2. Перевірка API

1. Відкрийте URL вашого backend (наприклад, `https://smartmart-production.up.railway.app`)
2. Має показати JSON з інформацією про API
3. Перевірте health endpoint: `https://your-backend.railway.app/api/health`
   - Має повернути: `{"status":"ok"}`

#### 3.3. Перевірка бази даних

Спробуйте увійти:
- URL: `https://your-backend.railway.app/api/auth/login`
- Method: POST
- Body:
  ```json
  {
    "login": "admin",
    "password": "admin123"
  }
  ```
- Має повернути токен та дані користувача

## Можливі проблеми та рішення

### Проблема 1: "Application failed to respond" (502)

**Причина**: Сервер не запускається або не слухає на правильному порту

**Рішення**:
1. Перевірте логи - чи є помилки
2. Перевірте чи сервер слухає на `0.0.0.0` (вже налаштовано в коді)
3. Перевірте змінну `PORT` - Railway встановлює автоматично
4. Переконайтеся що Root Directory порожнє

### Проблема 2: "MODULE_NOT_FOUND"

**Причина**: Залежності не встановлені

**Рішення**:
1. Перевірте логи Build - чи виконується `npm install`
2. Переконайтеся що Root Directory порожнє (не `/server`)
3. Перевірте чи `server/package.json` містить всі залежності

### Проблема 3: База даних не створюється

**Причина**: Volume не створений або `DATA_DIR` не встановлено

**Рішення**:
1. Перевірте чи Volume створений:
   - Volumes → має бути `database-storage` з Mount Path `/app/server/data`
2. Перевірте змінну `DATA_DIR`:
   - Variables → має бути `DATA_DIR` = `/app/server/data`
3. Перевірте логи - має бути:
   ```
   Connected to SQLite database
   Database initialized successfully
   ```

### Проблема 4: Дані втрачаються після перезапуску

**Причина**: Volume не створений або не підключений

**Рішення**:
1. Створіть Volume (див. Крок 2.2)
2. Переконайтеся що Mount Path правильний: `/app/server/data`
3. Переконайтеся що `DATA_DIR` вказує на Mount Path

### Проблема 5: CORS помилки

**Причина**: Frontend не може зробити запити до API

**Рішення**:
- Backend вже має CORS налаштований: `app.use(cors())`
- Перевірте чи frontend використовує правильний API URL

## Структура після правильного налаштування

```
Railway Project: smartmart
│
├── smartmart (Backend Service)
│   ├── Root Directory: (порожнє)
│   ├── Variables:
│   │   └── DATA_DIR = /app/server/data
│   ├── Volume: database-storage
│   │   └── Mount Path: /app/server/data
│   └── URL: https://smartmart-production.up.railway.app
│
└── smartmart-frontend (Frontend - потрібно створити окремо)
    ├── Root Directory: client
    ├── Variables:
    │   └── REACT_APP_API_URL = https://smartmart-production.up.railway.app/api
    └── URL: https://smartmart-frontend.up.railway.app
```

## Чеклист для перевірки

- [ ] Root Directory порожнє (не `/client/src/components`)
- [ ] Volume створений з Mount Path `/app/server/data`
- [ ] Змінна `DATA_DIR` = `/app/server/data`
- [ ] Логи показують "Database initialized successfully"
- [ ] Health endpoint повертає `{"status":"ok"}`
- [ ] Можна увійти як `admin` / `admin123`

## Якщо нічого не допомагає

1. Видаліть всі налаштування Build/Start в Settings
2. Залиште тільки Root Directory порожнім
3. Railway автоматично використає `nixpacks.toml`
4. Перезапустіть деплой: Deployments → Redeploy

## Корисні команди для перевірки

### Перевірка через Railway CLI:

```bash
# Встановіть Railway CLI
npm i -g @railway/cli

# Підключіться до проекту
railway link

# Перевірте логи
railway logs

# Відкрийте shell
railway shell

# У shell перевірте базу даних
sqlite3 /app/server/data/database.sqlite "SELECT * FROM clients WHERE login='admin';"
```

### Перевірка через браузер:

1. Health check: `https://your-backend.railway.app/api/health`
2. API info: `https://your-backend.railway.app/`
3. Login test: POST до `https://your-backend.railway.app/api/auth/login`


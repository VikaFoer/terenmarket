# Налаштування Frontend на Railway

## Backend вже працює! ✅

Ваш backend доступний за адресою: `https://smartmart-production.up.railway.app`

## Крок 1: Створення Frontend сервісу

1. У вашому Railway проекті натисніть **"New"** → **"Service"**
2. Оберіть **"GitHub Repo"** → `VikaFoer/smartmart`
3. Railway створить новий сервіс

## Крок 2: Налаштування Frontend

### 2.1. Root Directory

1. Відкрийте **Settings** → **Source**
2. **Root Directory**: вкажіть `client`
   - ⚠️ **ВАЖЛИВО**: Для frontend має бути `client`, а не порожнє!

### 2.2. Змінні середовища

1. Відкрийте **Settings** → **Variables**
2. Додайте змінну:
   - **Name**: `REACT_APP_API_URL`
   - **Value**: `https://smartmart-production.up.railway.app/api`
   - ⚠️ **ВАЖЛИВО**: Замініть `smartmart-production.up.railway.app` на ваш реальний backend URL!
   - Натисніть **"Add"**

### 2.3. Build налаштування

Railway автоматично використає `client/nixpacks.toml`, який:
- Встановить залежності: `npm install`
- Збудує проект: `npm run build`
- Запустить сервер: `npx serve -s build -l $PORT`

**Не потрібно** вручну встановлювати Build/Start команди!

## Крок 3: Перевірка після деплою

### 3.1. Перевірка логів

1. Відкрийте **Deployments** → **View Logs**
2. Має бути:
   ```
   > npm install
   > npm run build
   > Compiled successfully!
   > npx serve -s build -l <PORT>
   ```

### 3.2. Перевірка сайту

1. Відкрийте URL вашого frontend (наприклад, `https://smartmart-frontend.up.railway.app`)
2. Має відкритися сторінка логіну
3. Спробуйте увійти:
   - **Логін**: `admin`
   - **Пароль**: `admin123`

### 3.3. Перевірка підключення до API

1. Відкрийте DevTools (F12) → Console
2. Спробуйте увійти
3. Не має бути помилок типу:
   - `Network Error`
   - `CORS Error`
   - `Failed to fetch`

## Можливі проблеми та рішення

### Проблема 1: "Failed to fetch" або CORS помилки

**Причина**: Frontend не може підключитися до backend

**Рішення**:
1. Перевірте змінну `REACT_APP_API_URL`:
   - Має бути: `https://your-backend.railway.app/api`
   - Не має бути: `http://localhost:5000/api`
2. Переконайтеся що backend URL правильний
3. Перезапустіть frontend після зміни змінної

### Проблема 2: "Cannot GET /" або 404

**Причина**: React Router не налаштований для production

**Рішення**:
- `client/nixpacks.toml` вже використовує `serve -s` (single-page app mode)
- Це автоматично обробляє React Router

### Проблема 3: Білий екран після логіну

**Причина**: API URL неправильний або backend недоступний

**Рішення**:
1. Перевірте DevTools → Network
2. Перевірте чи запити йдуть на правильний URL
3. Перевірте чи backend працює (health endpoint)

### Проблема 4: Build не проходить

**Причина**: Помилки в коді або залежностях

**Рішення**:
1. Перевірте логи Build
2. Спробуйте зібрати локально: `cd client && npm run build`
3. Виправте помилки якщо є

## Структура після правильного налаштування

```
Railway Project: smartmart
│
├── smartmart (Backend Service) ✅
│   ├── Root Directory: (порожнє)
│   ├── Variables:
│   │   └── DATA_DIR = /app/server/data
│   ├── Volume: database-storage
│   └── URL: https://smartmart-production.up.railway.app
│
└── smartmart-frontend (Frontend Service) ✅
    ├── Root Directory: client
    ├── Variables:
    │   └── REACT_APP_API_URL = https://smartmart-production.up.railway.app/api
    └── URL: https://smartmart-frontend.up.railway.app
```

## Чеклист для перевірки

- [ ] Frontend сервіс створений
- [ ] Root Directory встановлено: `client`
- [ ] Змінна `REACT_APP_API_URL` встановлена з правильним backend URL
- [ ] Build пройшов успішно
- [ ] Сторінка логіну відкривається
- [ ] Можна увійти як `admin` / `admin123`
- [ ] Всі функції працюють (товари, кошик, тощо)

## Важливі примітки

1. **Змінна `REACT_APP_API_URL`**:
   - Має починатися з `https://` (не `http://`)
   - Має закінчуватися на `/api` (не `/api/`)
   - Приклад: `https://smartmart-production.up.railway.app/api`

2. **Root Directory**:
   - Backend: **порожнє**
   - Frontend: **`client`**

3. **Після зміни змінних**:
   - Railway автоматично перезапустить сервіс
   - Зачекайте поки деплой завершиться

4. **Custom Domain** (опціонально):
   - Можна налаштувати власний домен для frontend
   - Settings → Domains → Add Domain


# Локальний запуск SmartMarket

## Швидкий старт

### 1. Встановлення залежностей

Якщо ще не встановлені залежності:

```bash
npm run install-all
```

Це встановить залежності для:
- Кореневого проекту
- Server (backend)
- Client (frontend)

### 2. Запуск проекту

Запустіть обидва сервіси одночасно:

```bash
npm run dev
```

Це запустить:
- **Backend** на `http://localhost:5000`
- **Frontend** на `http://localhost:3000`

### 3. Перевірка

1. **Backend API**:
   - Відкрийте: `http://localhost:5000`
   - Має показати JSON з інформацією про API
   - Health check: `http://localhost:5000/api/health`
   - Має повернути: `{"status":"ok"}`

2. **Frontend**:
   - Відкрийте: `http://localhost:3000`
   - Має відкритися сторінка логіну SmartMarket
   - Спробуйте увійти:
     - **Логін**: `admin`
     - **Пароль**: `admin123`

## Окремі команди

Якщо потрібно запустити окремо:

### Тільки Backend:
```bash
npm run server
```
або
```bash
cd server
npm run dev
```

### Тільки Frontend:
```bash
npm run client
```
або
```bash
cd client
npm start
```

## Структура в development режимі

В development режимі:
- **Backend** (`localhost:5000`) - обробляє API запити
- **Frontend** (`localhost:3000`) - React dev server з hot reload
- Frontend робить запити до `http://localhost:5000/api`

## Структура в production режимі (Railway)

В production режимі (після деплою):
- **Один сервіс** обслуговує і backend, і frontend
- Frontend збирається в `client/build`
- Backend обслуговує статичні файли з `client/build`
- Всі запити йдуть на один URL

## Перевірка бази даних

База даних автоматично створюється при першому запуску:
- Файл: `server/database.sqlite`
- Створюється автоматично з:
  - Категоріями товарів
  - Адміністратором (admin/admin123)

## Можливі проблеми

### Порт 5000 або 3000 зайнятий

**Рішення:**
- Закрийте інші програми що використовують ці порти
- Або змініть порти в `.env` файлах

### База даних не створюється

**Рішення:**
- Перевірте права доступу до папки `server`
- Переконайтеся що Node.js має права на запис

### Frontend не підключається до Backend

**Перевірте:**
- Backend запущений на `localhost:5000`
- DevTools → Console на помилки CORS
- Переконайтеся що обидва сервіси запущені

## Додаткові команди

### Імпорт даних з Excel:
```bash
cd server
npm run import
```

### Додавання тестових зображень:
```bash
cd server
npm run add-colourant-images
```


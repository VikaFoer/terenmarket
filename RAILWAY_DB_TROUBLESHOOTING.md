# Розв'язання проблем з базою даних на Railway

## Проблема: Дані втрачаються при перезапуску

Якщо дані зникають після перезапуску сервісу, це означає що база даних не зберігається в Volume.

## Перевірка налаштувань

### 1. Перевірте чи Volume створений

1. Відкрийте ваш проект на Railway
2. Перейдіть до **Volumes**
3. Має бути Volume з:
   - **Name**: `database-storage` (або інша назва)
   - **Mount Path**: `/app/server/data`
   - **Status**: Connected

### 2. Перевірте змінну DATA_DIR

1. Відкрийте ваш Backend сервіс
2. Перейдіть до **Settings** → **Variables**
3. Має бути змінна:
   - **Name**: `DATA_DIR`
   - **Value**: `/app/server/data`
   - ⚠️ **ВАЖЛИВО**: Значення має точно відповідати Mount Path Volume!

### 3. Перевірте логи після запуску

Після деплою перевірте логи. Має бути:

```
=== Database Configuration ===
DATA_DIR: /app/server/data
DB_PATH: /app/server/data/database.sqlite
DATA_DIR exists: true
DB_PATH exists: false (при першому запуску)
=============================
Creating DATA_DIR: /app/server/data
DATA_DIR created successfully
Attempting to open database at: /app/server/data/database.sqlite
Connected to SQLite database at: /app/server/data/database.sqlite
Database file exists: true
```

## Якщо DATA_DIR неправильний

### Проблема: DATA_DIR вказує на неправильний шлях

**Симптоми:**
- Логи показують `DATA_DIR: /app/server` або інший шлях
- База даних створюється не в Volume

**Рішення:**
1. Перевірте змінну `DATA_DIR` в Settings → Variables
2. Встановіть значення: `/app/server/data`
3. Переконайтеся що Mount Path Volume також `/app/server/data`
4. Перезапустіть сервіс

## Якщо Volume не підключений

### Проблема: Volume не підключений до сервісу

**Симптоми:**
- Volume створений, але не підключений
- Логи показують помилки доступу до файлів

**Рішення:**
1. Перевірте чи Volume підключений до вашого Backend сервісу
2. У Volume settings переконайтеся що він підключений до правильного сервісу
3. Якщо потрібно - перепідключіть Volume

## Якщо база даних створюється в неправильному місці

### Перевірка через Railway CLI:

```bash
# Встановіть Railway CLI
npm i -g @railway/cli

# Підключіться до проекту
railway link

# Відкрийте shell
railway shell

# У shell перевірте де знаходиться база даних
ls -la /app/server/data/
ls -la /app/server/

# Перевірте змінну DATA_DIR
echo $DATA_DIR
```

## Правильна конфігурація

### Backend сервіс:
- **Root Directory**: порожнє
- **Volume**: 
  - Name: `database-storage`
  - Mount Path: `/app/server/data`
- **Variables**:
  - `DATA_DIR` = `/app/server/data`
  - `NODE_ENV` = `production` (автоматично)
  - `PORT` (автоматично)

## Перевірка після виправлення

1. Перезапустіть сервіс
2. Перевірте логи - має бути `DATA_DIR: /app/server/data`
3. Створіть тестові дані (додайте клієнта або продукт)
4. Перезапустіть сервіс знову
5. Перевірте чи дані збереглися

## Якщо все ще не працює

1. Перевірте логи на помилки
2. Переконайтеся що Volume має достатньо місця
3. Спробуйте видалити та створити Volume заново
4. Переконайтеся що Mount Path правильний (без зайвих слешів)

## Важливі примітки

- **Mount Path** та **DATA_DIR** мають точно збігатися
- Volume має бути підключений до Backend сервісу
- Після зміни змінних потрібно перезапустити сервіс
- База даних створюється автоматично при першому запуску


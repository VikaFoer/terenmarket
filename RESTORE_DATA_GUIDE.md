# Гайд по відновленню даних на Railway

## Проблема

Дані не мігрували зі старої бази даних, бо вона була в тимчасовій файловій системі і вже видалена Railway.

## Рішення: Відновлення через експорт/імпорт

### Крок 1: Експорт даних з локальної бази

Локально виконайте:

```bash
cd server
npm run export-db
```

Це створить файл `server/database_export.json` з усіма даними.

### Крок 2: Завантажте файл на Railway

**Варіант A: Через Railway CLI (рекомендовано)**

```bash
# Встановіть Railway CLI якщо ще не встановлено
npm i -g @railway/cli

# Підключіться до проекту
railway link

# Завантажте файл на Railway
railway run --service <your-backend-service> -- node scripts/importDatabase.js
```

Але спочатку потрібно завантажити файл на Railway. Найпростіше через GitHub:

1. Закомітьте `database_export.json` в репозиторій (тимчасово)
2. На Railway файл буде доступний в `/app/server/database_export.json`
3. Запустіть імпорт через Railway CLI або через API endpoint

**Варіант B: Через API endpoint (найпростіше)**

Додайте endpoint для завантаження файлу через API.

### Крок 3: Імпорт даних на Railway

**Через Railway CLI:**

```bash
railway run --service <your-backend-service> -- npm run import-db
```

**Або через Railway Shell:**

1. Відкрийте Railway Shell для вашого Backend сервісу
2. Виконайте:
   ```bash
   cd /app/server
   npm run import-db
   ```

## Альтернативний спосіб: Через Excel імпорт

Якщо у вас є файл `clients_products_prices.xlsx`:

1. Завантажте файл на Railway (через GitHub або Railway CLI)
2. Запустіть:
   ```bash
   railway run --service <your-backend-service> -- npm run import
   ```

## Перевірка після відновлення

Відкрийте:
```
https://your-backend.railway.app/api/db-info
```

Перевірте:
- `counts.clients` - має бути 23 (якщо все відновилось)
- `counts.products` - має бути 20
- `counts.coefficients` - має бути більше 0

## Важливо

Після відновлення даних:
- Дані будуть зберігатися в Volume (`/app/server/data`)
- Дані не будуть втрачатися при перезапуску
- Можна видалити `database_export.json` з репозиторію після імпорту


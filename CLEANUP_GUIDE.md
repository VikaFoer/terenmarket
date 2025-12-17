# Cleanup Guide

## Автоматичне очищення

Система автоматично очищає файли в продакшені:

### Що очищається:

1. **Старые бекапи** (старше 30 днів)
   - `*.backup`
   - `*.bak`
   - Файли в `server/backups/`

2. **Тимчасові файли** (старше 1 дня)
   - `*.tmp`
   - `*.old` (старше 7 днів)
   - Файли в `server/uploads/temp/`

3. **Логи** (старше 7 днів)
   - `*.log`
   - Файли в `server/logs/`

4. **Кеш**
   - `.cache/`
   - `node_modules/.cache/`
   - `.npm/`

### Розклад очищення

- **Частота**: Щодня о 2:00 UTC
- **Умова**: Тільки в production режимі (`NODE_ENV=production`)
- **Вимкнення**: Встановіть `ENABLE_CLEANUP=false` щоб вимкнути

### Ручне очищення

```bash
cd server
npm run cleanup
```

## Ignore файли

### .gitignore
Виключає з git:
- `node_modules/`
- `.git/`
- `build/`, `dist/`
- `.env` файли
- База даних (`*.sqlite`, `*.db`)
- Бекапи (`*.backup`, `*.bak`, `*.old`)
- Кеш (`.cache/`, `.npm/`)
- Логи (`*.log`)

### .dockerignore
Виключає з Docker образа:
- Git файли
- `node_modules/` (будуть встановлені в контейнері)
- Документацію (крім README.md)
- Dev файли (`.vscode/`, `.idea/`)
- Build outputs (будуть зібрані в контейнері)

### .npmignore
Виключає з npm пакету:
- Git файли
- `node_modules/`
- Build outputs
- Dev файли
- Документацію (крім README.md)

## Рекомендації для продакшену

### Railway / Production

1. **База даних**: Використовуйте MySQL або Volume storage для SQLite
2. **Uploads**: Зберігайте в Railway Volume або S3
3. **Кеш**: Використовуйте Redis (якщо потрібно)
4. **Логи**: Використовуйте Railway logs або зовнішній сервіс

### Redis (опціонально)

Якщо потрібен Redis для кешування:

```bash
# Встановлення Redis (якщо локально)
# Windows: використовуйте WSL або Docker
# Linux/Mac: brew install redis або apt-get install redis

# Додати до .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Налаштування очищення

В `.env` або змінних оточення Railway:

```env
# Вимкнути автоматичне очищення
ENABLE_CLEANUP=false

# Або залишити увімкненим (за замовчуванням в production)
NODE_ENV=production
```

## Перевірка розміру файлів

```bash
# Linux/Mac
du -sh * | sort -h | tail -20

# Windows PowerShell
Get-ChildItem -Directory | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | 
             Measure-Object -Property Length -Sum).Sum
    [PSCustomObject]@{Name=$_.Name; SizeMB=[math]::Round($size/1MB,2)}
} | Sort-Object SizeMB -Descending | Select-Object -First 10
```

## Видалення з продакшену

### Що НЕ потрібно в продакшені:

1. ✅ `node_modules/` - встановлюються через `npm install`
2. ✅ `.git/` - не потрібен в Docker образі
3. ✅ `build/` (dev) - збирається в контейнері
4. ✅ Старі бекапи - очищаються автоматично
5. ✅ Кеш - очищається автоматично

### Що ЗАЛИШАЄТЬСЯ:

- ✅ `package.json` - потрібен для встановлення залежностей
- ✅ `server/index.js` - основний файл
- ✅ `server/routes/` - маршрути API
- ✅ `client/build/` (production build) - потрібен для фронтенду


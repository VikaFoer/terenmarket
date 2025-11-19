# Виправлення помилки MODULE_NOT_FOUND на Railway

## Проблема
Помилка `MODULE_NOT_FOUND` означає, що залежності не встановлені або не знайдені.

## Рішення

### Варіант 1: Використати Build Command вручну (рекомендовано)

На Railway Dashboard:

1. Відкрийте **Settings** → натисніть **"Build"** у правому сайдбарі
2. У секції **"Build Command"** введіть:
   ```
   cd server && npm install
   ```
3. У секції **"Start Command"** введіть:
   ```
   cd server && node index.js
   ```
4. Натисніть **"Save"**
5. Перейдіть до **"Deployments"** → натисніть **"Redeploy"**

### Варіант 2: Переконатися що nixpacks.toml правильний

Файл `nixpacks.toml` має містити:
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.install]
cmds = [
  "cd server && npm install"
]

[phases.build]
cmds = []

[start]
cmd = "cd server && node index.js"
```

### Перевірка після виправлення

Після redeploy перевірте логи. Має бути:

1. **Build логи:**
   ```
   > cd server && npm install
   > added 271 packages...
   ```

2. **Deploy логи:**
   ```
   > Connected to SQLite database
   > Database initialized successfully
   > Server is running on port <PORT>
   ```

### Якщо проблема залишається

1. Перевірте чи всі файли закомічені в git:
   ```bash
   git add .
   git commit -m "Fix Railway build configuration"
   git push
   ```

2. Переконайтеся що Root Directory порожнє (не `/client/src/components`)

3. Перевірте чи `server/package.json` містить всі залежності:
   - express
   - cors
   - sqlite3
   - dotenv
   - bcryptjs
   - jsonwebtoken
   - axios
   - xlsx

4. Спробуйте видалити всі налаштування Build Command і залишити тільки `nixpacks.toml`


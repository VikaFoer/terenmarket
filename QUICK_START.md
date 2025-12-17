# Швидкий старт після завантаження через Git

## Проблема: Проєкт завантажено через Git, але не працює

Це нормально! Після `git clone` потрібно ще кілька кроків.

## Покрокова інструкція

### Крок 1: Підключитися до сервера

```bash
ssh tecsa@web41
```

### Крок 2: Перейти в директорію проєкту

```bash
cd /home/tecsa/tecsamarket.com.ua/www
```

### Крок 3: Перевірити що файли на місці

```bash
ls -la
# Маєте побачити: client/, server/, package.json тощо
```

### Крок 4: Встановити залежності сервера

```bash
cd server
npm install --production
```

**Якщо помилка "npm: command not found":**
- Зверніться до підтримки хостингу щоб встановили Node.js
- Або використайте версію Node.js з хостингу (зазвичай є в панелі)

### Крок 5: Створити .env файл

```bash
# Скопіювати приклад
cp ../env.example .env

# Відредагувати (заповнити правильні значення)
nano .env
# або
vi .env
```

**Мінімальний .env файл:**
```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://tecsamarket.com.ua
JWT_SECRET=ваш-секретний-ключ-змініть-це
DB_TYPE=mysql
DB_HOST=tecsa.mysql.ukraine.com.ua
DB_USER=tecsa_marketdatabase
DB_PASSWORD=ваш-пароль-бази-даних
DB_NAME=tecsa_marketdatabase
```

### Крок 6: Збілдити фронтенд

```bash
cd ../client
npm install
CI=false GENERATE_SOURCEMAP=false npm run build
```

**Це створить папку `client/build/` з готовим фронтендом**

### Крок 7: Запустити сервер

**Варіант A: Простий запуск (для тесту)**

```bash
cd ../server
node index.js
```

Якщо бачите `Server is running on port 5000` - все працює!

**Варіант B: Запуск у фоні (для продакшену)**

```bash
cd ../server
nohup node index.js > app.log 2>&1 &
```

**Варіант C: Через PM2 (якщо встановлено)**

```bash
cd /home/tecsa/tecsamarket.com.ua/www
npm install pm2 --save-dev
npx pm2 start ecosystem.config.js
npx pm2 save
```

### Крок 8: Перевірити що працює

```bash
# Перевірити API
curl http://localhost:5000/api/health

# Має повернути: {"status":"ok"}
```

### Крок 9: Налаштувати Nginx (якщо потрібно)

Якщо сайт все ще не відкривається, потрібно налаштувати Nginx щоб він проксував запити до Node.js.

**Створіть конфігурацію Nginx** (може знадобитися root доступ):

```nginx
server {
    listen 80;
    server_name tecsamarket.com.ua www.tecsamarket.com.ua;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /home/tecsa/tecsamarket.com.ua/www/client/build;
        try_files $uri $uri/ /index.html;
    }
}
```

## Швидка перевірка проблем

### Проблема 1: "npm: command not found"
**Рішення:** Node.js не встановлений. Зверніться до підтримки хостингу.

### Проблема 2: "Cannot find module"
**Рішення:**
```bash
cd server
rm -rf node_modules
npm install --production
```

### Проблема 3: "Port 5000 already in use"
**Рішення:**
```bash
# Знайти процес
lsof -i :5000
# Зупинити
kill -9 <PID>
```

### Проблема 4: "Build directory not found"
**Рішення:**
```bash
cd client
npm run build
```

### Проблема 5: База даних не підключається
**Рішення:** Перевірте `.env` файл - правильні дані для MySQL.

## Чеклист після деплою

- [ ] Файли завантажені через git
- [ ] Залежності встановлені (`npm install`)
- [ ] `.env` файл створений та заповнений
- [ ] Фронтенд зібраний (`npm run build` в client/)
- [ ] Сервер запущений (`node index.js`)
- [ ] API працює (`curl http://localhost:5000/api/health`)
- [ ] Nginx налаштований (якщо потрібно)

## Якщо все ще не працює

1. **Перевірте логи:**
   ```bash
   tail -f server/app.log
   # або
   pm2 logs smartmarket
   ```

2. **Перевірте чи працює Node.js:**
   ```bash
   node --version
   npm --version
   ```

3. **Перевірте чи відкритий порт:**
   ```bash
   netstat -tulpn | grep 5000
   ```

4. **Зверніться до підтримки хостингу** з логами помилок.


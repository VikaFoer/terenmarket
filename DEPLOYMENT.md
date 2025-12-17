# Deployment Guide

## Швидкий деплой на продакшен сервер

### Передумови

1. **SSH доступ** до сервера `web41`
2. **Node.js** встановлений на сервері
3. **npm** встановлений
4. **PM2** або інший process manager (опціонально)

### Крок 1: Підготовка локально

```bash
# 1. Збілдити фронтенд
cd client
npm install
CI=false GENERATE_SOURCEMAP=false npm run build
cd ..

# 2. Перевірити що все працює локально
npm run start
```

### Крок 2: Завантаження на сервер

#### Варіант A: Через SSH/SCP (Linux/Mac)

```bash
# Використати готовий скрипт
chmod +x deploy.sh
./deploy.sh production

# Або вручну:
rsync -av --exclude='node_modules' --exclude='.git' \
  --exclude='client/src' --exclude='client/public' \
  --exclude='*.log' --exclude='*.backup' \
  ./ tecsa@web41:/home/tecsa/tecsamarket.com.ua/www/
```

#### Варіант B: Через FTP/SFTP (Windows)

1. Використати WinSCP або FileZilla
2. Підключитися до `web41`
3. Завантажити файли в `/home/tecsa/tecsamarket.com.ua/www/`
4. **Виключити**: `node_modules/`, `.git/`, `client/src/`, `client/public/`

#### Варіант C: Через Git (якщо налаштовано)

```bash
# На сервері
cd /home/tecsa/tecsamarket.com.ua/www
git pull origin main
```

### Крок 3: Встановлення залежностей на сервері

```bash
# SSH до сервера
ssh tecsa@web41

# Перейти в директорію проєкту
cd /home/tecsa/tecsamarket.com.ua/www

# Встановити залежності сервера
cd server
npm install --production

# Встановити залежності клієнта (якщо потрібно)
cd ../client
npm install --production
```

### Крок 4: Налаштування змінних оточення

```bash
# На сервері
cd /home/tecsa/tecsamarket.com.ua/www/server

# Створити .env файл
cp .env.example .env
nano .env  # або vim .env
```

**Обов'язкові змінні:**
```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://tecsamarket.com.ua
JWT_SECRET=your-super-secret-key-change-this
DB_TYPE=mysql
DB_HOST=tecsa.mysql.ukraine.com.ua
DB_USER=tecsa_marketdatabase
DB_PASSWORD=your-password
DB_NAME=tecsa_marketdatabase
```

### Крок 5: Запуск додатку

#### Варіант A: PM2 (рекомендовано)

```bash
# Встановити PM2 (якщо ще не встановлено)
npm install -g pm2

# Запустити додаток
cd /home/tecsa/tecsamarket.com.ua/www/server
pm2 start index.js --name smartmarket

# Або з конфігурацією
pm2 start ecosystem.config.js

# Перевірити статус
pm2 status
pm2 logs smartmarket
```

#### Варіант B: Systemd

Створити файл `/etc/systemd/system/smartmarket.service`:

```ini
[Unit]
Description=SmartMarket Server
After=network.target

[Service]
Type=simple
User=tecsa
WorkingDirectory=/home/tecsa/tecsamarket.com.ua/www/server
Environment=NODE_ENV=production
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable smartmarket
sudo systemctl start smartmarket
sudo systemctl status smartmarket
```

#### Варіант C: Nginx + Node.js

Налаштувати Nginx як reverse proxy:

```nginx
server {
    listen 80;
    server_name tecsamarket.com.ua www.tecsamarket.com.ua;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Крок 6: Перевірка

```bash
# Перевірити що сервер працює
curl http://localhost:5000/api/health

# Перевірити логи
pm2 logs smartmarket
# або
tail -f /var/log/smartmarket.log
```

### Структура файлів на сервері

```
/home/tecsa/tecsamarket.com.ua/www/
├── server/
│   ├── index.js
│   ├── database.js
│   ├── routes/
│   ├── middleware/
│   ├── scripts/
│   ├── .env          # ← Важливо!
│   ├── package.json
│   └── node_modules/
├── client/
│   ├── build/        # ← Зібраний фронтенд
│   ├── package.json
│   └── node_modules/
├── Procfile
└── package.json
```

### Автоматичне очищення

Автоматичне очищення працює щодня о 2:00 UTC в production режимі.

Щоб вимкнути:
```env
ENABLE_CLEANUP=false
```

Ручне очищення:
```bash
cd /home/tecsa/tecsamarket.com.ua/www/server
npm run cleanup
```

### Оновлення (redeploy)

```bash
# 1. Збілдити локально
cd client && npm run build && cd ..

# 2. Завантажити на сервер
rsync -av --exclude='node_modules' --exclude='.git' \
  ./ tecsa@web41:/home/tecsa/tecsamarket.com.ua/www/

# 3. На сервері
ssh tecsa@web41
cd /home/tecsa/tecsamarket.com.ua/www/server
npm install --production
pm2 restart smartmarket
```

### Troubleshooting

#### Помилка: "Cannot find module"
```bash
cd server
rm -rf node_modules
npm install --production
```

#### Помилка: "Port already in use"
```bash
# Знайти процес
lsof -i :5000
# Або
netstat -tulpn | grep 5000

# Зупинити
kill -9 <PID>
```

#### Помилка: "Database connection failed"
- Перевірити `.env` файл
- Перевірити доступ до MySQL
- Перевірити права користувача бази даних

#### Перевірити логи
```bash
# PM2
pm2 logs smartmarket --lines 100

# Systemd
sudo journalctl -u smartmarket -f

# Вручну
cd /home/tecsa/tecsamarket.com.ua/www/server
NODE_ENV=production node index.js
```

### Безпека

1. ✅ **Ніколи не комітьте `.env` файл** в git
2. ✅ **Змініть JWT_SECRET** на унікальний ключ
3. ✅ **Використовуйте HTTPS** (налаштуйте SSL сертифікат)
4. ✅ **Обмежте доступ** до сервера (firewall)
5. ✅ **Регулярно оновлюйте** залежності (`npm audit`)

### Підтримка

Якщо виникли проблеми:
1. Перевірте логи
2. Перевірте `.env` файл
3. Перевірте права доступу до файлів
4. Перевірте що порт не зайнятий


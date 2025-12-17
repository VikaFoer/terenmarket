# Виправлення помилки 404 на tecsamarket.com.ua

## Швидка діагностика

### 1. Перевірка чи працює Node.js сервер

```bash
# SSH до сервера
ssh tecsa@web41

# Перевірити чи працює процес
ps aux | grep node
# або
pm2 list

# Перевірити чи слухає порт 5000
netstat -tulpn | grep 5000
# або
lsof -i :5000
```

### 2. Перевірка логів

```bash
# PM2 логи
pm2 logs smartmarket --lines 50

# Або якщо запущено без PM2
cd /home/tecsa/tecsamarket.com.ua/www/server
tail -f logs/app.log
```

### 3. Перевірка структури файлів

```bash
cd /home/tecsa/tecsamarket.com.ua/www

# Перевірити чи є build директорія
ls -la client/build/

# Перевірити чи є index.html
ls -la client/build/index.html

# Перевірити структуру
tree -L 2
```

## Можливі проблеми та рішення

### Проблема 1: Node.js сервер не запущений

**Рішення:**
```bash
cd /home/tecsa/tecsamarket.com.ua/www/server

# Перевірити .env файл
cat .env

# Запустити сервер
NODE_ENV=production node index.js

# Або через PM2
pm2 start ecosystem.config.js
pm2 save
```

### Проблема 2: Build директорія не знайдена

**Симптоми:** В логах "Build directory not found"

**Рішення:**
```bash
cd /home/tecsa/tecsamarket.com.ua/www

# Перевірити чи є build
ls -la client/build/

# Якщо немає - збілдити
cd client
npm install
CI=false GENERATE_SOURCEMAP=false npm run build
cd ..
```

### Проблема 3: Nginx не налаштований правильно

**Перевірити конфігурацію Nginx:**
```bash
# Перевірити конфігурацію
sudo cat /etc/nginx/sites-available/tecsamarket.com.ua
# або
sudo cat /etc/nginx/conf.d/tecsamarket.com.ua.conf
```

**Правильна конфігурація Nginx:**
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tecsamarket.com.ua www.tecsamarket.com.ua;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tecsamarket.com.ua www.tecsamarket.com.ua;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Root directory
    root /home/tecsa/tecsamarket.com.ua/www/client/build;
    index index.html;

    # Proxy API requests to Node.js
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Перезавантажити Nginx:**
```bash
sudo nginx -t  # Перевірити конфігурацію
sudo systemctl reload nginx
```

### Проблема 4: Неправильні шляхи в server/index.js

**Перевірити логи сервера** - має бути:
```
✅ Found build directory at: /home/tecsa/tecsamarket.com.ua/www/client/build
```

**Якщо не знаходить**, додати шлях вручну в `server/index.js`:
```javascript
const possibleBuildPaths = [
  path.join(__dirname, '..', 'client', 'build'),
  path.join(process.cwd(), 'client', 'build'),
  '/home/tecsa/tecsamarket.com.ua/www/client/build', // Додати цей шлях
  // ...
];
```

### Проблема 5: Порт 5000 зайнятий або не доступний

**Перевірити:**
```bash
# Чи слухає порт
netstat -tulpn | grep 5000

# Чи доступний ззовні
curl http://localhost:5000/api/health
```

**Якщо порт зайнятий:**
```bash
# Знайти процес
lsof -i :5000
# Зупинити
kill -9 <PID>
```

### Проблема 6: Права доступу до файлів

**Перевірити права:**
```bash
cd /home/tecsa/tecsamarket.com.ua/www
ls -la

# Встановити правильні права
chown -R tecsa:tecsa .
chmod -R 755 .
```

## Покрокова інструкція виправлення

### Крок 1: Перевірка сервера
```bash
ssh tecsa@web41
cd /home/tecsa/tecsamarket.com.ua/www/server
pm2 status
```

### Крок 2: Перевірка build
```bash
cd /home/tecsa/tecsamarket.com.ua/www
ls -la client/build/index.html
```

### Крок 3: Перевірка логів
```bash
pm2 logs smartmarket --lines 100
```

### Крок 4: Тест API
```bash
curl http://localhost:5000/api/health
```

### Крок 5: Перевірка Nginx
```bash
curl -I https://tecsamarket.com.ua
```

## Швидке виправлення (якщо все зламано)

```bash
# 1. SSH до сервера
ssh tecsa@web41

# 2. Перейти в директорію проєкту
cd /home/tecsa/tecsamarket.com.ua/www

# 3. Збілдити фронтенд
cd client
npm install
CI=false GENERATE_SOURCEMAP=false npm run build
cd ..

# 4. Перезапустити сервер
cd server
pm2 restart smartmarket
# або
pm2 stop smartmarket
pm2 start ecosystem.config.js
pm2 save

# 5. Перевірити логи
pm2 logs smartmarket --lines 50

# 6. Перевірити сайт
curl http://localhost:5000/api/health
```

## Діагностика через браузер

1. Відкрити DevTools (F12)
2. Перейти на вкладку **Network**
3. Оновити сторінку (F5)
4. Подивитися які запити йдуть:
   - Якщо запити до `/api/*` - перевірити Node.js сервер
   - Якщо запити до статичних файлів - перевірити Nginx та build директорію
   - Якщо немає запитів - перевірити Nginx конфігурацію

## Контакти для підтримки

Якщо проблема не вирішується:
1. Збережіть логи: `pm2 logs smartmarket > logs.txt`
2. Перевірте конфігурацію Nginx
3. Перевірте .env файл на сервері


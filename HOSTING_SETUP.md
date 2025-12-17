# Налаштування на хостингу (adm.tools / подібний)

## Глобальна установка модулів Node.js

### Чи потрібно це робити?

**Для основного проєкту - НІ**, бо ми використовуємо локальні залежності:
- `npm install` встановлює модулі в `node_modules/` кожного проєкту
- Це працює без глобальної установки

**АЛЕ потрібно для:**
- ✅ **PM2** (process manager) - для запуску та управління Node.js процесами
- ✅ **npm** оновлення (якщо потрібно)
- ✅ Інші глобальні інструменти

## Крок 1: Налаштування глобальної директорії (для PM2)

Якщо потрібно встановити PM2 глобально:

```bash
# 1. Створити каталог для модулів
mkdir ~/node22

# 2. Перевизначити стандартний каталог
# Додати в ~/.bash_profile:
export NPM_CONFIG_PREFIX=~/node22
export PATH=~/node22/bin:$PATH

# 3. Застосувати зміни
source ~/.bash_profile
# або просто перепідключитися по SSH

# 4. Встановити PM2 глобально
npm install -g pm2
```

## Крок 2: Альтернатива - локальна установка PM2

**Рекомендовано:** Встановити PM2 локально в проєкті:

```bash
cd /home/tecsa/tecsamarket.com.ua/www/server
npm install pm2 --save-dev

# Запуск через npx
npx pm2 start ecosystem.config.js
npx pm2 save
```

## Крок 3: Налаштування проєкту (БЕЗ глобальної установки)

### Варіант A: Локальні залежності (рекомендовано)

```bash
cd /home/tecsa/tecsamarket.com.ua/www

# Встановити залежності сервера
cd server
npm install --production

# Встановити залежності клієнта (якщо потрібно збілдити)
cd ../client
npm install
CI=false GENERATE_SOURCEMAP=false npm run build
```

### Варіант B: З PM2 локально

```bash
cd /home/tecsa/tecsamarket.com.ua/www/server

# Встановити PM2 локально
npm install pm2 --save-dev

# Запуск
npx pm2 start ecosystem.config.js
npx pm2 save

# Створити скрипт для зручності
echo '#!/bin/bash
cd /home/tecsa/tecsamarket.com.ua/www/server
npx pm2 "$@"' > ~/pm2.sh
chmod +x ~/pm2.sh
```

## Крок 4: Запуск без PM2 (якщо PM2 недоступний)

### Варіант A: Systemd service

Створити `/etc/systemd/system/smartmarket.service`:

```ini
[Unit]
Description=SmartMarket Server
After=network.target

[Service]
Type=simple
User=tecsa
WorkingDirectory=/home/tecsa/tecsamarket.com.ua/www/server
Environment=NODE_ENV=production
Environment=PORT=5000
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=smartmarket

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable smartmarket
sudo systemctl start smartmarket
sudo systemctl status smartmarket
```

### Варіант B: nohup (простий варіант)

```bash
cd /home/tecsa/tecsamarket.com.ua/www/server
nohup node index.js > app.log 2>&1 &
```

### Варіант C: screen/tmux

```bash
# Встановити screen (якщо немає)
# Потім:
screen -S smartmarket
cd /home/tecsa/tecsamarket.com.ua/www/server
node index.js
# Ctrl+A, D для від'єднання
```

## Рекомендації

### ✅ Рекомендовано:
1. **Використовувати локальні залежності** - простіше та надійніше
2. **PM2 локально** або через npx - не потрібна глобальна установка
3. **Systemd** якщо є root доступ - найнадійніший варіант

### ❌ Не рекомендується:
1. Глобальна установка всіх модулів - може викликати конфлікти версій
2. Запуск через nohup без моніторингу - процес може впасти

## Перевірка після налаштування

```bash
# 1. Перевірити чи працює сервер
curl http://localhost:5000/api/health

# 2. Перевірити процеси
ps aux | grep node

# 3. Перевірити логи
# PM2:
pm2 logs smartmarket
# або
npx pm2 logs smartmarket

# Systemd:
sudo journalctl -u smartmarket -f

# nohup:
tail -f /home/tecsa/tecsamarket.com.ua/www/server/app.log
```

## Важливо!

⚠️ **Якщо використовуєте глобальну установку:**
- Після зміни конфігурації Linux файли `~/.bashrc` і `~/.bash_profile` можуть перезаписатися
- Потрібно буде додати змінні знову

✅ **Тому краще використовувати локальні залежності** - вони не залежать від системної конфігурації!


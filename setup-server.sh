#!/bin/bash

# Автоматичний скрипт налаштування сервера
# Використання: ./setup-server.sh

set -e  # Зупинитися при помилці

echo "🚀 Початок налаштування SmartMarket сервера..."
echo ""

# Кольори
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Перевірка що ми в правильній директорії
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Помилка: package.json не знайдено!${NC}"
    echo "Переконайтеся що ви в кореневій директорії проєкту"
    exit 1
fi

PROJECT_DIR=$(pwd)
echo -e "${GREEN}✅ Проєкт знайдено в: $PROJECT_DIR${NC}"
echo ""

# Крок 1: Встановлення залежностей сервера
echo -e "${YELLOW}📦 Крок 1: Встановлення залежностей сервера...${NC}"
cd server
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Помилка: server/package.json не знайдено!${NC}"
    exit 1
fi

npm install --production
echo -e "${GREEN}✅ Залежності сервера встановлено${NC}"
echo ""

# Крок 2: Створення .env файлу
echo -e "${YELLOW}⚙️  Крок 2: Створення .env файлу...${NC}"
if [ ! -f ".env" ]; then
    if [ -f "../env.example" ]; then
        cp ../env.example .env
        echo -e "${GREEN}✅ .env файл створено з env.example${NC}"
        echo -e "${YELLOW}⚠️  ВАЖЛИВО: Відредагуйте .env файл та заповніть правильні значення!${NC}"
        echo "   Особливо: JWT_SECRET, DB_PASSWORD"
    else
        echo -e "${YELLOW}⚠️  env.example не знайдено, створюю базовий .env...${NC}"
        cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://tecsamarket.com.ua
JWT_SECRET=CHANGE-THIS-TO-RANDOM-SECRET-KEY
DB_TYPE=mysql
DB_HOST=tecsa.mysql.ukraine.com.ua
DB_PORT=3306
DB_USER=tecsa_marketdatabase
DB_PASSWORD=YOUR-MYSQL-PASSWORD-HERE
DB_NAME=tecsa_marketdatabase
ENABLE_CLEANUP=true
EOF
        echo -e "${GREEN}✅ Базовий .env файл створено${NC}"
        echo -e "${RED}❌ ВАЖЛИВО: Відредагуйте .env та заповніть DB_PASSWORD та JWT_SECRET!${NC}"
    fi
else
    echo -e "${GREEN}✅ .env файл вже існує${NC}"
fi
echo ""

# Крок 3: Встановлення залежностей клієнта та збірка
echo -e "${YELLOW}📦 Крок 3: Встановлення залежностей клієнта...${NC}"
cd ../client
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Помилка: client/package.json не знайдено!${NC}"
    exit 1
fi

npm install
echo -e "${GREEN}✅ Залежності клієнта встановлено${NC}"
echo ""

# Крок 4: Збірка фронтенду
echo -e "${YELLOW}🔨 Крок 4: Збірка фронтенду...${NC}"
CI=false GENERATE_SOURCEMAP=false npm run build

if [ -d "build" ] && [ -f "build/index.html" ]; then
    echo -e "${GREEN}✅ Фронтенд успішно зібрано${NC}"
else
    echo -e "${RED}❌ Помилка: build директорія не створена!${NC}"
    exit 1
fi
echo ""

# Крок 5: Створення директорій для логів
echo -e "${YELLOW}📁 Крок 5: Створення директорій для логів...${NC}"
cd ../server
mkdir -p logs
mkdir -p uploads/images
echo -e "${GREEN}✅ Директорії створено${NC}"
echo ""

# Крок 6: Перевірка структури
echo -e "${YELLOW}🔍 Крок 6: Перевірка структури проєкту...${NC}"
if [ -f "index.js" ] && [ -d "../client/build" ]; then
    echo -e "${GREEN}✅ Структура проєкту правильна${NC}"
else
    echo -e "${RED}❌ Помилка: Неправильна структура проєкту!${NC}"
    exit 1
fi
echo ""

# Підсумок
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Налаштування завершено!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Наступні кроки:${NC}"
echo ""
echo "1. Відредагуйте .env файл:"
echo "   cd server"
echo "   nano .env"
echo "   (або vi .env)"
echo ""
echo "2. Заповніть обов'язкові значення:"
echo "   - JWT_SECRET (будь-який довгий випадковий рядок)"
echo "   - DB_PASSWORD (пароль від MySQL бази даних)"
echo ""
echo "3. Запустіть сервер:"
echo "   cd server"
echo "   node index.js"
echo ""
echo "4. Для запуску у фоні:"
echo "   nohup node index.js > app.log 2>&1 &"
echo ""
echo "5. Перевірте що працює:"
echo "   curl http://localhost:5000/api/health"
echo ""
echo -e "${GREEN}Готово! 🎉${NC}"


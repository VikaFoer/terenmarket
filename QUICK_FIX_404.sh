#!/bin/bash

# Швидке виправлення помилки 404
# Використання: ./QUICK_FIX_404.sh

echo "🔧 Швидке виправлення помилки 404..."
echo ""

# Кольори
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# SSH команди для виконання на сервері
echo -e "${YELLOW}Виконайте ці команди на сервері:${NC}"
echo ""
echo "ssh tecsa@web41"
echo ""
echo "# 1. Перевірка структури"
echo "cd /home/tecsa/tecsamarket.com.ua/www"
echo "ls -la client/build/"
echo ""
echo "# 2. Якщо немає build - збілдити"
echo "cd client"
echo "npm install"
echo "CI=false GENERATE_SOURCEMAP=false npm run build"
echo "cd .."
echo ""
echo "# 3. Перевірка сервера"
echo "cd server"
echo "pm2 status"
echo ""
echo "# 4. Перезапуск сервера"
echo "pm2 restart smartmarket"
echo "# або якщо не запущений:"
echo "pm2 start ecosystem.config.js"
echo "pm2 save"
echo ""
echo "# 5. Перевірка логів"
echo "pm2 logs smartmarket --lines 50"
echo ""
echo "# 6. Тест API"
echo "curl http://localhost:5000/api/health"
echo ""
echo -e "${GREEN}Якщо все працює локально, перевірте Nginx конфігурацію${NC}"


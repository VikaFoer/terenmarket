#!/bin/bash

# Скрипт для налаштування Node.js PATH на хостингу
# Використання: ./SETUP_NODE_PATH.sh

echo "🔧 Налаштування Node.js PATH..."
echo ""

# Шукати Node.js в стандартних місцях хостингу
NODE_PATHS=(
    "/usr/local/node22/bin"
    "/usr/local/node20/bin"
    "/usr/local/node18/bin"
    "/usr/local/node*/bin"
    "/opt/node*/bin"
)

NODE_FOUND=false
NODE_DIR=""

echo "Шукаю Node.js..."
for path_pattern in "${NODE_PATHS[@]}"; do
    for path in $path_pattern; do
        if [ -d "$path" ] && [ -f "$path/node" ]; then
            echo "✅ Знайдено Node.js в: $path"
            NODE_DIR="$path"
            NODE_FOUND=true
            break 2
        fi
    done
done

if [ "$NODE_FOUND" = false ]; then
    echo "❌ Node.js не знайдено в стандартних місцях"
    echo ""
    echo "Спробуйте знайти вручну:"
    echo "find /usr/local -name 'node' 2>/dev/null"
    exit 1
fi

echo ""
echo "📝 Додаю в PATH..."

# Додати в .bash_profile
BASH_PROFILE="$HOME/.bash_profile"

# Перевірити чи вже додано
if grep -q "$NODE_DIR" "$BASH_PROFILE" 2>/dev/null; then
    echo "✅ PATH вже налаштований в .bash_profile"
else
    echo "" >> "$BASH_PROFILE"
    echo "# Node.js PATH" >> "$BASH_PROFILE"
    echo "export PATH=$NODE_DIR:\$PATH" >> "$BASH_PROFILE"
    echo "✅ Додано в .bash_profile"
fi

# Додати в .bashrc теж (для надійності)
BASH_RC="$HOME/.bashrc"
if [ -f "$BASH_RC" ]; then
    if ! grep -q "$NODE_DIR" "$BASH_RC" 2>/dev/null; then
        echo "" >> "$BASH_RC"
        echo "# Node.js PATH" >> "$BASH_RC"
        echo "export PATH=$NODE_DIR:\$PATH" >> "$BASH_RC"
        echo "✅ Додано в .bashrc"
    fi
fi

# Застосувати зміни зараз
export PATH=$NODE_DIR:$PATH

echo ""
echo "✅ Налаштування завершено!"
echo ""
echo "Перевірка:"
node --version
npm --version

echo ""
echo "⚠️  ВАЖЛИВО:"
echo "Якщо команди все ще не працюють, виконайте:"
echo "source ~/.bash_profile"
echo "або перепідключіться по SSH"


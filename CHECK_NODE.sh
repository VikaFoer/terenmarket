#!/bin/bash

# Скрипт для перевірки та налаштування Node.js

echo "🔍 Перевірка Node.js та npm..."
echo ""

# Перевірка node
if command -v node &> /dev/null; then
    echo "✅ Node.js знайдено:"
    node --version
    which node
else
    echo "❌ Node.js НЕ знайдено"
    echo ""
    echo "Шукаю в стандартних місцях..."
    
    # Перевірка стандартних шляхів
    POSSIBLE_PATHS=(
        "/usr/local/bin/node"
        "/usr/bin/node"
        "/opt/node/bin/node"
        "$HOME/node*/bin/node"
        "/usr/local/node*/bin/node"
    )
    
    FOUND=false
    for path in "${POSSIBLE_PATHS[@]}"; do
        if [ -f "$path" ] || ls $path 2>/dev/null; then
            echo "✅ Знайдено: $path"
            echo "Додайте в PATH:"
            echo "export PATH=$(dirname $path):\$PATH"
            FOUND=true
            break
        fi
    done
    
    if [ "$FOUND" = false ]; then
        echo "❌ Node.js не знайдено в стандартних місцях"
        echo ""
        echo "Рішення:"
        echo "1. Зверніться до підтримки хостингу"
        echo "2. Або встановіть через панель управління"
    fi
fi

echo ""

# Перевірка npm
if command -v npm &> /dev/null; then
    echo "✅ npm знайдено:"
    npm --version
    which npm
else
    echo "❌ npm НЕ знайдено"
    echo ""
    echo "Шукаю в стандартних місцях..."
    
    POSSIBLE_NPM_PATHS=(
        "/usr/local/bin/npm"
        "/usr/bin/npm"
        "/opt/node/bin/npm"
        "$HOME/node*/bin/npm"
        "/usr/local/node*/bin/npm"
    )
    
    FOUND=false
    for path in "${POSSIBLE_NPM_PATHS[@]}"; do
        if [ -f "$path" ] || ls $path 2>/dev/null; then
            echo "✅ Знайдено: $path"
            echo "Додайте в PATH:"
            echo "export PATH=$(dirname $path):\$PATH"
            FOUND=true
            break
        fi
    done
    
    if [ "$FOUND" = false ]; then
        echo "❌ npm не знайдено"
    fi
fi

echo ""
echo "Перевірка змінних оточення:"
echo "PATH=$PATH"
echo ""


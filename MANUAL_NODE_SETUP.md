# Ручне налаштування Node.js PATH

## Проблема
Node.js встановлений на хостингу, але команди `node` та `npm` не працюють через те що не в PATH.

## Рішення

### Крок 1: Знайти де встановлений Node.js

```bash
# Шукати в стандартних місцях хостингу
find /usr/local -name "node" -type f 2>/dev/null
find /opt -name "node" -type f 2>/dev/null
ls -la /usr/local/node*
```

Зазвичай Node.js знаходиться в:
- `/usr/local/node22/bin/node`
- `/usr/local/node20/bin/node`
- `/usr/local/node18/bin/node`

### Крок 2: Додати в PATH

Відредагуйте файл `.bash_profile`:

```bash
nano ~/.bash_profile
```

Додайте в кінець файлу:

```bash
# Node.js PATH
export PATH=/usr/local/node22/bin:$PATH
```

**Замініть `/usr/local/node22/bin` на шлях який знайшли в кроці 1!**

Зберегти: `Ctrl+O`, потім `Enter`  
Вийти: `Ctrl+X`

### Крок 3: Застосувати зміни

```bash
source ~/.bash_profile
```

Або просто перепідключіться по SSH.

### Крок 4: Перевірити

```bash
node --version
npm --version
```

Має показати версії!

## Автоматичне налаштування

Або використайте скрипт:

```bash
chmod +x SETUP_NODE_PATH.sh
./SETUP_NODE_PATH.sh
```

## Якщо не працює

1. Перевірте правильний шлях до Node.js
2. Переконайтеся що файл `.bash_profile` збережено
3. Виконайте `source ~/.bash_profile`
4. Перепідключіться по SSH


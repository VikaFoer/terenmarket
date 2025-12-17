# Виправлення помилки "npm: command not found"

## Проблема
Скрипт не може знайти `npm` команду. Це означає що Node.js не встановлений або не в PATH.

## Рішення

### Варіант 1: Перевірити чи встановлений Node.js

```bash
# Перевірити версію Node.js
node --version

# Перевірити версію npm
npm --version

# Перевірити де знаходиться npm
which npm
```

### Варіант 2: Якщо Node.js встановлений, але не в PATH

На деяких хостингах Node.js встановлений в спеціальній директорії. Спробуйте:

```bash
# Перевірити чи є Node.js в стандартних місцях
ls -la /usr/local/bin/node
ls -la /usr/bin/node
ls -la ~/node*/bin/node

# Якщо знайдено, додати в PATH
export PATH=/шлях/до/node/bin:$PATH
```

### Варіант 3: Встановити Node.js через хостинг панель

1. Зайдіть в панель управління хостингом (ADM.TOOLS)
2. Знайдіть розділ "Node.js" або "Конфігурація Linux"
3. Встановіть Node.js через панель
4. Перезавантажте термінал

### Варіант 4: Використати nvm (Node Version Manager)

```bash
# Завантажити та встановити nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Перезавантажити bash
source ~/.bashrc

# Встановити Node.js через nvm
nvm install 18
nvm use 18
```

### Варіант 5: Звернутися до підтримки хостингу

Якщо нічого не допомагає, зверніться до підтримки хостингу з запитом:
"Допоможіть встановити Node.js та npm на сервері web41"

## Після встановлення Node.js

Перевірте що все працює:

```bash
node --version
npm --version
```

Потім запустіть скрипт знову:

```bash
./setup-server.sh
```


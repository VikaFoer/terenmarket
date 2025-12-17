# Встановлення Node.js на хостингу

## Проблема
Node.js не знайдено в системі. Потрібно встановити.

## Рішення

### Варіант 1: Через панель управління хостингом (РЕКОМЕНДОВАНО)

1. Зайдіть в панель ADM.TOOLS
2. Знайдіть розділ:
   - **"Node.js"** або
   - **"Конфігурація Linux"** → **"Node.js"** або
   - **"Модулі"** → **"Node.js"**
3. Натисніть **"Встановити"** або оберіть версію (рекомендовано Node.js 18 або новіше)
4. Дочекайтеся завершення встановлення
5. Перезавантажте термінал (відключіться та підключіться знову)

### Варіант 2: Звернутися до підтримки хостингу

Напишіть підтримці ADM.TOOLS:

> **Тема:** Встановлення Node.js на сервері web41
> 
> Добрий день!
> 
> Потрібна допомога з встановленням Node.js та npm на сервері web41 для проєкту tecsamarket.com.ua.
> 
> Команди `node` та `npm` не знайдені в системі. Перевірка показала що Node.js не встановлений в стандартних місцях (`/usr/local/node*`, `/usr/bin`, `/opt`).
> 
> Можете встановити Node.js версії 18 або новішої?
> 
> Дякую!

### Варіант 3: Встановити через nvm (якщо дозволено)

```bash
# Завантажити nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Перезавантажити bash
source ~/.bashrc

# Встановити Node.js
nvm install 18
nvm use 18

# Перевірити
node --version
npm --version
```

**Якщо curl не працює**, спробуйте:

```bash
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

### Варіант 4: Встановити вручну (складніше)

```bash
# Створити директорію
mkdir -p ~/nodejs

# Завантажити Node.js (замініть версію на актуальну)
cd ~/nodejs
wget https://nodejs.org/dist/v18.19.0/node-v18.19.0-linux-x64.tar.xz

# Розпакувати
tar -xf node-v18.19.0-linux-x64.tar.xz

# Додати в PATH
echo 'export PATH=~/nodejs/node-v18.19.0-linux-x64/bin:$PATH' >> ~/.bash_profile
source ~/.bash_profile

# Перевірити
node --version
npm --version
```

## Після встановлення Node.js

1. Перевірте що працює:
   ```bash
   node --version
   npm --version
   ```

2. Запустіть налаштування проєкту:
   ```bash
   cd /home/tecsa/tecsamarket.com.ua/www
   ./setup-server.sh
   ```

## Рекомендація

**Найпростіше** - звернутися до підтримки хостингу. Вони встановлять Node.js правильно та налаштують все необхідне.


# Інструкція для завантаження проекту на GitHub

## Крок 1: Відкрийте командний рядок (CMD) або Git Bash

**Важливо:** Використовуйте CMD або Git Bash, а не PowerShell через проблеми з кодуванням українських символів.

## Крок 2: Перейдіть в директорію проекту

```cmd
cd /d "D:\SmartMarket – копія (2)"
```

## Крок 3: Ініціалізуйте git репозиторій

```cmd
git init
```

## Крок 4: Додайте remote репозиторій

```cmd
git remote add origin https://github.com/VikaFoer/terenmarket.git
```

Якщо remote вже існує, оновіть його:
```cmd
git remote set-url origin https://github.com/VikaFoer/terenmarket.git
```

## Крок 5: Додайте всі файли

```cmd
git add .
```

## Крок 6: Створіть commit

```cmd
git commit -m "Initial commit: SmartMarket project"
```

## Крок 7: Перейменуйте гілку на main (якщо потрібно)

```cmd
git branch -M main
```

## Крок 8: Завантажте на GitHub

```cmd
git push -u origin main --force
```

Якщо виникне помилка з гілкою master, спробуйте:
```cmd
git push -u origin master --force
```

## Альтернативний спосіб через Git Bash

Якщо у вас встановлений Git Bash, виконайте всі команди в ньому:

```bash
cd "/d/SmartMarket – копія (2)"
git init
git remote add origin https://github.com/VikaFoer/terenmarket.git
git add .
git commit -m "Initial commit: SmartMarket project"
git branch -M main
git push -u origin main --force
```

## Примітки

- `--force` використовується для перезапису існуючого репозиторію на GitHub
- Переконайтеся, що у вас є права доступу до репозиторію `VikaFoer/terenmarket`
- Якщо потрібна аутентифікація, Git запропонує ввести credentials або використати Personal Access Token


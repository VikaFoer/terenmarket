# Виправлення помилки 502 на Railway

## Проблема
Помилка 502 "Application failed to respond" означає, що Railway не може достукатися до сервера.

## Рішення

### 1. Сервер має слухати на 0.0.0.0

Сервер має слухати на всіх інтерфейсах (`0.0.0.0`), а не тільки на localhost.

**Виправлено в `server/index.js`:**
```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
```

### 2. Перевірте змінні середовища

На Railway Dashboard:
1. Відкрийте **Settings** → **Variables**
2. Переконайтеся що є:
   - `PORT` - Railway встановлює автоматично
   - `DATA_DIR` = `/app/server/data` (якщо використовуєте Volume)

### 3. Перевірте Networking

На Railway Dashboard:
1. Відкрийте **Settings** → **Networking**
2. Переконайтеся що є **Public Domain** або **Custom Domain**
3. Перевірте що порт правильний

### 4. Перезапустіть деплой

Після виправлення коду:
1. Закомітьте зміни:
   ```bash
   git add server/index.js
   git commit -m "Fix: server listen on 0.0.0.0 for Railway"
   git push
   ```
2. Railway автоматично зробить redeploy
3. Або вручну: **Deployments** → **Redeploy**

### 5. Перевірка після виправлення

Після redeploy перевірте:
1. Логи мають показувати: `Server is running on port <PORT>`
2. Спробуйте відкрити: `https://your-app.railway.app/api/health`
3. Має повернути: `{"status":"ok"}`

### Якщо проблема залишається

1. Перевірте логи на Railway - чи сервер запускається?
2. Перевірте чи є помилки в логах
3. Переконайтеся що PORT змінна встановлена Railway автоматично
4. Спробуйте перезапустити сервіс вручну


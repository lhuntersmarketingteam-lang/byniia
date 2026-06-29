// Точка повернення після оплати WayForPay.
// WayForPay перенаправляє браузер сюди методом POST (із даними платежу), а статичну
// сторінку Vercel віддає лише на GET → був білий екран (HTTP 405).
// Тому функція САМА віддає HTML сторінки подяки на будь-який метод (GET/POST),
// читаючи той самий файл thank-you.html (без дублювання). Піксель Purchase у ньому
// спрацьовує при завантаженні. Дані платежу тут не потрібні (сума фіксована).
import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  try {
    const html = readFileSync(join(process.cwd(), 'thank-you.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (e) {
    // фолбек: якщо файл раптом недоступний — редіректимо на статичну сторінку
    res.statusCode = 303;
    res.setHeader('Location', '/thank-you');
    res.end();
  }
}

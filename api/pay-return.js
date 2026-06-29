// Точка повернення після оплати WayForPay.
// WayForPay перенаправляє браузер сюди методом POST (із даними платежу), а статичну
// сторінку Vercel віддає лише на GET → був білий екран (HTTP 405).
// Ця функція приймає будь-який метод і робить 303-редірект на GET /thank-you,
// де вже стоїть піксель Purchase. Дані платежу нам тут не потрібні (сума фіксована).
export default function handler(req, res) {
  res.statusCode = 303;            // See Other → браузер перемикає POST на GET
  res.setHeader('Location', '/thank-you');
  res.end();
}

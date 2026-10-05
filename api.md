# API contract

## Public / user
- GET /api/products?category=&q=&size=&color=&minPrice=&maxPrice= — каталог с фильтрами.
- GET /api/products/:id — карточка товара и доступные варианты.
- POST /api/auth/telegram — проверка Telegram WebApp initData.
- GET /api/orders/me — заказы авторизованного Telegram-пользователя.
- POST /api/orders — создание заказа. Обязательно idempotency key; backend повторный ключ не создаёт второй заказ.

## Admin
- POST /api/admin/products — создать товар.
- PATCH /api/admin/products/:id — изменить товар.
- DELETE /api/admin/products/:id — деактивировать товар.
- POST /api/admin/products/:id/images — добавить изображение.
- PATCH /api/admin/variants/:id — изменить остаток/цену варианта.
- GET /api/admin/orders — список заказов.
- PATCH /api/admin/orders/:id/status — изменить статус.

Admin API должен быть защищён отдельной авторизацией; Telegram initData недостаточно для административного доступа.

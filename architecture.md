# Архитектура MVP

Telegram Bot -> Telegram Mini App (React/TS/Tailwind) -> REST API (Node/Express) -> PostgreSQL + S3-compatible image storage.

Telegram WebApp initData проверяется сервером HMAC-SHA256 до создания пользовательской сессии. Клиент никогда не должен считать telegram_id доверенным без серверной проверки.

Заказ: frontend генерирует idempotency key -> backend валидирует payload -> создаёт order + items в одной DB-транзакции -> отправляет уведомление владельцу через Telegram Bot API -> возвращает order number.

Оплата: на MVP «оплата при получении», без хранения карточных данных. Позже можно добавить Telegram Payments/Stripe через серверный payment flow.

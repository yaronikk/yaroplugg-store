# YAROPLUGG STORE — правила для агента

## Проект
Интернет-магазин перепродажи одежды (вещи в основном б/у, каждая в единственном экземпляре), Таллин,
Эстония. Покупатели: русско-, эстонско- и англоязычные.
Стек: Vite + React + TypeScript + Tailwind, Supabase (таблицы products, categories, store_orders,
store_order_items; Storage bucket product-images; Edge Function supabase/functions/create-order),
хостинг Vercel. Админка на /admin (Supabase Auth, роль admin в app_metadata).

## Один сайт, два режима (главное требование)
Бот открывает как Telegram Mini App ТОТ ЖЕ адрес, что и обычный сайт. Одна кодовая база, один деплой,
одна база данных. Не создавай отдельных версий «для Telegram» и «для браузера» и не дублируй данные.
- Режим определяй в одном месте: src/lib/platform.ts (isTelegram = Boolean(window.Telegram?.WebApp?.initData)).
- Общее: каталог, карточка, сумка, форма заказа, языки, страницы, ссылки.
- Только Telegram: tg.ready()/expand(), themeParams, safe-area и viewportStableHeight (клавиатура не
  перекрывает поля), нативная BackButton, HapticFeedback, openLink/openTelegramLink, язык из
  initDataUnsafe.user.language_code, подстановка @username.
- Только браузер: обычные шапка/футер, Web Share API, аналитика, адаптивная сетка для десктопа.
  Скрипт telegram-web-app.js грузить только внутри Telegram.
- Ссылки на товар: браузер — /p/<slug>; Telegram — https://t.me/<bot>/<app>?startapp=p_<slug>
  (читать tg.initDataUnsafe.start_param). Обе открывают один и тот же товар.

## Бизнес-логика
- Онлайн-оплаты НЕТ и не добавлять. Оплату и доставку согласует менеджер в Telegram после заказа.
  Статус заказа pending_payment — нормальный.
- Все тексты UI на русском, но только через словари i18n (ru/et/en), без хардкода в компонентах.

## Что нельзя ломать (уже сделано хорошо)
- Цены, наличие и варианты проверяются на сервере (edge-функция), клиентской сумме не верить.
- RLS по роли admin, идемпотентность заказа, rate-limit в RPC create_store_order, валидация загрузки фото.
- Секреты: SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, ключи капчи — только в секретах функции.
  На клиенте только VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY. Никогда не печатай, не
  запрашивай и не коммить реальные ключи; .env в .gitignore.

## Как работать
- У тебя нет доступа к моей боевой базе Supabase и Vercel. Не выполняй supabase db push / functions
  deploy / vercel deploy. SQL оформляй НОВЫМИ идемпотентными файлами
  supabase/migrations/2026102000NN_*.sql (if not exists, drop policy if exists). Старые миграции не править.
- Не выдумывай данные (ник менеджера, домен, реквизиты). Бери из src/config.ts; если значения нет,
  оставь TODO-заглушку и перечисли её в итоговом отчёте.
- Один этап = одна ветка/один коммит с понятным сообщением. Перед завершением обязательно прогоняй
  `pnpm typecheck` и `pnpm build`; если падает — чини. Не завершай задачу с красной сборкой.
- Для чистых функций (валидация контактов, парсинг start_param, форматирование цен) добавляй
  unit-тесты (vitest).
- Не добавляй зависимости без необходимости; версии фиксируй (без "latest").
- Итоговый отчёт: изменённые файлы, как проверить вручную (чек-лист), какие миграции и секреты
  применить мне, риски и как откатить, список оставшихся TODO.
- Тест-матрица для ручной проверки: Telegram iPhone/Android/Desktop/Web, Safari iOS, Chrome Android,
  Chrome Desktop; на RU/ET/EN.

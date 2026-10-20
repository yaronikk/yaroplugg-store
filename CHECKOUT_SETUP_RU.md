# Настройка оформления заказов

В корзине покупатель указывает имя, Telegram username, телефон или email, необязательный комментарий и принимает условия. Выбор доставки и её цена не запрашиваются: доставку и оплату согласует менеджер. Цена заказа считается по товарам. Заказ резервирует позиции на 48 часов, после чего неподтверждённый заказ отменяется и остаток возвращается.

## До включения заказов

1. В Vercel задайте `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` и `SHOP_SITE_URL`.
2. Создайте Cloudflare Turnstile widget для сайта. В Vercel задайте `VITE_TURNSTILE_SITE_KEY`, а соответствующий секрет — в Supabase Edge Function secrets как `TURNSTILE_SECRET`.
3. Для уведомлений настройте в Supabase секреты `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`. Чтобы присылать покупателю сообщение из Mini App, пользователь должен предварительно открыть чат бота и нажать Start; если бот не может отправить сообщение, заказ остаётся созданным.
4. Проверьте Supabase Auth: назначьте аккаунту администратора `app_metadata.role=admin`. При включённой CAPTCHA в настройках Auth используйте тот же Turnstile secret.
5. В Storage ограничьте `product-images` размером 5 MB и типами JPEG, PNG и WebP.

## Переменные аналитики и контента

- `VITE_ANALYTICS_SCRIPT_URL` и `VITE_ANALYTICS_WEBSITE_ID` включают Umami; без обеих переменных аналитика отключена.
- `VITE_INSTAGRAM_URL` задаёт ссылку профиля в INFO.
- `SHOP_SITE_URL` должен быть одинаково задан в Vercel и Supabase Edge Function secrets.
- Данные продавца, email, Telegram-менеджера и Vinted задаются после подтверждения владельцем магазина в `src/config.ts`.

Не публикуйте секреты в Git или чате. Перед применением миграций сверьте схему с текущей базой и следуйте только порядку из `RELEASE.md`; миграции здесь не запускались.

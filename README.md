# YAROPLUGG STORE

React and Vite storefront for Telegram Mini App and regular browsers, with Supabase catalog, orders and admin tools.

## Local setup

1. Use Node.js 24 and pnpm 11 (`.nvmrc` and `packageManager` pin the expected versions).
2. Copy `.env.example` to `.env.local` and set the public Supabase URL and publishable key.
3. Run `pnpm install --frozen-lockfile`, then `pnpm dev`.
4. Before review, run `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## Project layout

- `src/`: storefront, admin, language dictionaries, analytics and shared utilities.
- `api/`: Vercel product metadata, sitemap and admin routes.
- `supabase/functions/`: server-side order creation.
- `supabase/migrations/`: ordered database changes for the next release.
- `supabase/rollback/`: rollback reference files; inspect each file before applying.
- `public/`: web assets, robots rules and 404 page.
- `RELEASE.md`: staged deployment checklist and environment variable names.

## Orders

There is no online payment or delivery selection in checkout. The store manager confirms delivery and payment with the buyer. Prices, stock and reservation updates are checked on the server. Browser orders require Cloudflare Turnstile; Telegram Mini App orders use verified Telegram `initData`.

## Environment

See `.env.example` for client and deployment variable names. Keep service-role credentials, Telegram bot tokens and the Turnstile secret in Supabase Edge Function secrets. Do not commit secret values or paste them into chat. `SHOP_SITE_URL` is used for canonical product links, sitemap links, order notifications and the Edge Function origin allowlist.

## Shop details

Verified manager, Telegram bot, Instagram/Vinted, contact and seller details are intentionally left blank until supplied by the store owner. An unset Instagram URL hides the Instagram link. Analytics stays disabled unless both Umami variables are configured.

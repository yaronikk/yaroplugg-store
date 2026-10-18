# YAROPLUGG STORE

Vite + React + TypeScript storefront with Supabase-backed catalog/admin and Telegram Mini App support.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase project. Never put service-role keys or bot tokens in client variables.
3. Install with `pnpm install --frozen-lockfile`.
4. Run `pnpm dev`, `pnpm typecheck`, `pnpm test`, and `pnpm build` as needed.

## Structure

- `src/App.tsx` and `src/components/`: storefront screens and UI.
- `src/admin/`: existing product administration screens.
- `src/lib/`: Supabase client, formatting/storage helpers, platform detection.
- `src/config.ts`: TODO placeholders for verified shop details; not yet wired into screens.
- `supabase/functions/` and `supabase/migrations/`: project-side Supabase code.

The storefront reads its catalog from Supabase; demo products are not bundled or imported. The old `database.sql` was a stale separate schema; do not apply it to the live project. See `CHECKOUT_SETUP_RU.md` for the existing checkout setup notes.

## Delivery configuration

Default delivery is agreed with the shop owner at €0; the manager confirms the final delivery cost directly. Keep this exact method in `SHOP.delivery` in `src/config.ts` and the Supabase Functions → Secrets value for `SHOP_DELIVERY_METHODS_JSON`:

```json
[{"id":"manager","ru":"Согласуется с менеджером","et":"Lepitakse kokku halduriga","en":"Arranged with the manager","priceEur":0}]
```

The remaining manager, bot, Mini App, social, email, legal, and site details are TODO until verified. Do not include secret values in this repository.

# release/v2 handoff

This branch is an implementation candidate only. It has not been deployed, pushed, merged into `main`, or applied to the live Supabase project. The live schema was inspected read-only. The existing working checkout and its local edits remain untouched.

## Existing state and preservation

The plan's assertion that SOLD and Instagram/INFO are already on `origin/main` does not match the current `origin/main` code inspected for this work. The live database does contain `products.is_sold` and a `products_public_select_sold` policy. The new migration preserves that flag, maps it to `resale_status`, and replaces the policy so only active products (including explicitly published SOLD items) are public. The local working checkout also contained uncommitted custom INFO text and Instagram behavior; these were copied into this branch while leaving that checkout untouched.

The candidate's existing home/catalog/product flows, reviews, product image optimization and thumbnails, three-language scaffolding, Mini App behavior, quick admin actions, and order status/payment/note/history UI were retained. The existing logo and hero assets were retained; the candidate's compressed hero asset remains in use without its extra slogan overlay. The SOLD tab, badge, empty state, and translations are present in this branch. The checkout contains no delivery choice or delivery charge; the manager coordinates payment and delivery after receiving the order.

## Selected items from section 0

| No. | What was already present / current result |
| --- | --- |
| 1 | Candidate had a browser checkout path; Turnstile validation and a clear disabled state without configuration are present in this branch. |
| 2 | Candidate had delivery fields and charges; removed from checkout, client payload, Edge Function, and the new order RPC. |
| 3 | Contact choices existed in the candidate; kept Telegram/phone/email and added editable Mini App contact behavior/help text. |
| 5 | Candidate already reserved stock atomically; kept the server-side lock, price/stock checks, and one-time restoration on cancellation. |
| 6 | Candidate lacked the requested 48-hour cleanup; added a five-item cap, hourly `pg_cron` when available, and lazy maintenance on order/admin access. |
| 7 | Candidate had localization scaffolding; checkout labels and server error codes now resolve in RU/ET/EN. |
| 8 | Candidate notified the manager; added a localized Mini App buyer message and silently ignores Telegram send failures. |
| 10 | Live DB had `is_sold` and `products_public_select_sold`; added compatibility mapping/trigger and an active-only public policy. |
| 12 | Candidate already pinned package versions, pnpm, and a lockfile; added Node 24 engine and `.nvmrc`. |
| 15 | Candidate had password login but no optional captcha handling; added Turnstile token support and a rate-limit message. Supabase-side CAPTCHA setup is still manual. |
| 17 | Candidate had most security headers; adjusted HSTS, Umami CSP hosts, and admin `noindex, nofollow`. |
| 18 | Live schema had an admin order delete policy and direct update access; new migration removes direct order mutations and routes status changes through RPC. |
| 19 | API/site links could derive from request host; changed API and manager links to `SHOP_SITE_URL` with fallback behavior. |
| 20 | Not a code change: Storage bucket size/type limits must be set manually to 5 MB and JPEG/PNG/WebP. |
| 24 | Candidate privacy text was a stub and had no anonymization job; added multilingual draft notices and 12-month cleanup for completed/cancelled orders. |
| 27 | Candidate was already cleaned of legacy files and npm lockfiles; main branch protection remains a GitHub setting for the owner. |
| 29 | Candidate already had `resale_status`; kept it and integrated legacy `is_sold`, with statuses visible in catalog/admin. |
| 32 | Candidate already had the product quick actions; retained SOLD/reserve/release/duplicate draft actions. |
| 35 | Candidate had INFO page structure with placeholders; added Russian, Estonian, and English copy, Instagram link, and legal draft marking. |
| 36 | Candidate already had reviews, publication controls, and public published-only policy; retained them. |
| 37 | Candidate already had language detection/persistence and translated category fields; retained these and added checkout/INFO content. A full human language review remains advisable. |
| 40 | Candidate already had sitemap, robots, product SEO routes, and a 404 page; retained them and added localized storefront/INFO metadata. |
| 41 | Candidate used Plausible; switched to opt-in Umami script/ID configuration and corresponding CSP entries. Account/site setup is manual. |
| 42 | Candidate already compressed the WebP hero/logo and product uploads/thumbnails; retained these. The current hero image is about 192 KB. |
| 44 | Candidate already had the responsive catalog grid and Mini App phone layout; retained it and raised the lone sub-11 px storefront label. Contrast was not independently measured. |
| 54 | Added this handoff and staged release sequence; preview, migrations, production approval, and live acceptance checks remain future steps. |

## Work completed by plan stage

| Stage | Status |
| --- | --- |
| A — base and port | Candidate merged into `release/v2`; SOLD and INFO/Instagram carried in; sold flag compatibility migration added; Node 24 and package manager pinned; setup docs updated. Existing synced `sources/` were not changed. |
| B — checkout | Contact-type checkout, editable Mini App contact, browser Turnstile gate, no delivery fields/fee, five-item cap, server-side pricing and stock checks, 48-hour stock reservation, translated error codes, buyer Mini App message, order confirmation retained. |
| C — security | Admin order changes use RPC; direct order update/delete permissions removed; optional login Turnstile token; allowlisted site/Telegram CORS; `SHOP_SITE_URL` used for canonical links; headers and admin noindex; SQL RLS test added. |
| D — content and performance | RU/ET/EN checkout and INFO copy, legal draft pages and retention notice, metadata updates, Umami configuration, candidate image compression/thumbnails and responsive layout retained. |
| E — admin | Existing product quick actions and order status/payment/notes/history retained; maintenance runs when admin opens orders. |

Stage commits are recorded: A `7027be6`, B `ee57f20`, C `2342d5d`, D `ca2765e`, E `8b2c733`. Follow-up commits are `2dc1405` (release/rollback notes), `306180d` (11 px label minimum), `10dfd32` (secret names in docs), and `8a28623` (admin RLS assertion). The candidate merge is `44425c9`. The final working tree is clean. The checks below passed on the combined final tree; they were not separately run at each intermediate commit boundary.

## New database files and execution boundary

The new `202610200002` through `202610200006` migration files are intended for a reviewed preview/staging database only. They have not been run against the live database. The live migration history includes a prior rollback and `20261019114016` SOLD-field change; do not rerun or edit the applied `20261017*` files. `supabase/tests/rls_security_test.sql` is for a disposable or staging database after the release migrations; it creates fixtures in a transaction and rolls back. It has not been run against the live database.

Use `supabase/rollback/20261020_release_v2_rollback.sql` only after taking a backup and reviewing its irreversible-data notes. A site rollback does not require a database rollback. PII anonymized after 12 months cannot be recovered by SQL rollback.

## Required configuration (names only)

Vercel environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_TURNSTILE_SITE_KEY`
- `VITE_INSTAGRAM_URL`
- `VITE_ANALYTICS_SCRIPT_URL`
- `VITE_ANALYTICS_WEBSITE_ID`
- `SHOP_SITE_URL`

Supabase Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_WEBAPP_BOT_TOKEN` (optional; falls back to `TELEGRAM_BOT_TOKEN`)
- `TURNSTILE_SECRET`
- `SHOP_SITE_URL`

Never place secret values in source control or chat. Before a preview, configure Turnstile and enable Supabase Auth CAPTCHA if desired, set the `product-images` bucket limit to 5 MB and allow JPEG/PNG/WebP, create/configure Umami if analytics is wanted, and confirm store/manager/bot/social details in `src/config.ts` and `VITE_INSTAGRAM_URL`. Protect `main` with required pull requests as a repository setting. No store-specific credentials were added.

## Checks

Run after each stage and before review:

```sh
pnpm run typecheck
pnpm run build
pnpm test
```

The RLS SQL test requires a staging database with these migrations applied; it cannot be verified by the static application checks. After checks pass, publish only a Vercel Preview from `release/v2`, review browser and Mini App flows, then apply the migrations to the selected non-production database in filename order and inspect results after each. Production promotion and merging into `main` require the user's later explicit approval.

## Not completed / user-side items

- The actual staging migration run and SQL RLS test remain pending; no staging Supabase credentials were supplied and none were requested.
- Turnstile site/secret setup, Supabase Auth CAPTCHA configuration, Storage upload cap, Umami account/site setup, `SHOP_SITE_URL` environment configuration, store contact values, and GitHub branch protection are dashboard tasks listed above.
- The legal pages are drafts with `[ЗАПОЛНИТЬ]` placeholders; seller identity, contact details, and final legal review are needed before public use.
- Browser and Mini App end-to-end preview checks, per-stage commits, and a user-reviewed production release are still required.

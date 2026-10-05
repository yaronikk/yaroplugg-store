# YAROPLUGG STORE — V4

Telegram-ready streetwear storefront built with React, TypeScript, Vite and Tailwind CSS.

## V4 highlights
- Uses the supplied YAROPLUGG logo as the primary brand mark.
- Restrained bottom navigation with minimal icons and labels.
- Local persistence for bag, favorites and demo orders.
- Telegram WebApp `ready()` / `expand()` hooks when opened inside Telegram.
- Lazy-loaded product images and async decoding for faster catalog rendering.
- Responsive mobile-first layout with safe-area support.
- Existing demo catalog remains ready for replacement with real product photos.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

The current V4 is still a frontend MVP. Production order storage, Telegram `initData` verification, admin authentication, database, image storage and owner notifications should be connected before accepting real orders.

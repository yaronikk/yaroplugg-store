# YAROPLUGG STORE

Telegram fashion storefront + Supabase admin MVP.

## Environment variables

Set these in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Supabase setup

1. Run the original database SQL that creates `categories` and `products`.
2. Run `supabase.sql` from this project to add admin fields, RLS policies and the `product-images` Storage bucket.
3. In Supabase Authentication, create the single admin user that will be used for `/admin`.
4. Open `https://your-domain/admin` and sign in.

## Admin

The admin is protected by Supabase email/password authentication. Authenticated users can manage products in this MVP; keep only your own admin account in Supabase Authentication.

The admin supports:
- product create/edit/delete
- price, category, description, composition
- sizes, colors, stock
- active/new/featured flags
- product image upload to Supabase Storage
- importing the current demo catalog into Supabase

## Store

The public storefront reads active products from Supabase. If the database has no products yet, it temporarily falls back to the bundled demo catalog until the admin imports/adds products.

-- Allow concise descriptions while keeping a reasonable upper bound, and accept 1–20 listing photos.
alter table public.marketplace_listings
  drop constraint if exists marketplace_listing_images_count;

alter table public.marketplace_listings
  add constraint marketplace_listing_images_count
  check (cardinality(images) between 1 and 20);

alter table public.marketplace_listings
  drop constraint if exists marketplace_listings_description_check;

alter table public.marketplace_listings
  add constraint marketplace_listings_description_check
  check (char_length(trim(description)) <= 3000);

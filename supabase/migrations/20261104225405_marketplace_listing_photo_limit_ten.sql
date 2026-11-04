-- Lower marketplace listing photo limit from 20 to 10.
alter table public.marketplace_listings
  drop constraint if exists marketplace_listing_images_count;

alter table public.marketplace_listings
  add constraint marketplace_listing_images_count
  check (cardinality(images) between 1 and 10);

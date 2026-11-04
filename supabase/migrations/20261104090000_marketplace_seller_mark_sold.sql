-- Allow a seller to mark their own published listing as sold through a scoped RPC.
-- Direct writes to published listings remain blocked by RLS.

create or replace function public.protect_marketplace_listing()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() = old.seller_id
     and old.status = 'approved'
     and new.status = 'sold'
     and current_setting('app.marketplace_listing_sold_rpc', true) = 'on' then
    new.updated_at := now();
    return new;
  end if;

  if auth.uid() = old.seller_id
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    if new.seller_id <> old.seller_id then
      raise exception 'Seller ownership cannot be changed';
    end if;
    if old.status in ('approved','sold','deleted') then
      raise exception 'Published listings cannot be edited directly';
    end if;
    if new.status <> old.status
       and not (old.status = 'rejected' and new.status = 'pending') then
      raise exception 'Invalid listing status change';
    end if;
    new.moderation_reason := null;
    new.moderated_at := null;
    new.moderated_by := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.mark_marketplace_listing_sold(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  perform set_config('app.marketplace_listing_sold_rpc', 'on', true);

  update public.marketplace_listings
  set status = 'sold', updated_at = now()
  where id = p_listing_id
    and seller_id = (select auth.uid())
    and status = 'approved';

  if not found then
    raise exception using errcode = '42501', message = 'Listing is unavailable or cannot be marked as sold';
  end if;
end;
$$;

revoke all on function public.mark_marketplace_listing_sold(uuid) from public, anon, authenticated;
grant execute on function public.mark_marketplace_listing_sold(uuid) to authenticated;

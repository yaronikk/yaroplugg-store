-- The RPC omits status so new reservations must use the current processing lifecycle.
alter table public.store_orders alter column status set default 'new';

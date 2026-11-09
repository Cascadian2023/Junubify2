-- Payment ledger scaffold. Provider checkout, webhooks, and payouts remain disabled until a
-- merchant/provider adapter is implemented and verified for South Sudan.
create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  product_id text not null check (char_length(product_id) between 1 and 100),
  provider text not null check (char_length(provider) between 1 and 40),
  provider_reference text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'cancelled', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create index if not exists payment_orders_user_created_idx
  on public.payment_orders (user_id, created_at desc);

alter table public.payment_orders enable row level security;
revoke all on public.payment_orders from anon, authenticated;
grant select on public.payment_orders to authenticated;

create policy "Users can read their own payment orders"
  on public.payment_orders for select to authenticated
  using (user_id = auth.uid());

-- Writes and status changes must be performed by trusted server-side code only.

-- summary: Creates the `subscribers` table used by the Stripe edge functions
-- (check-subscription writes it with the service role key; create-checkout and
-- customer-portal do not touch it). RLS lets a signed-in user read only their own row.
-- Writes are service-role only (the service role bypasses RLS).

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  email text not null unique, -- upsert target: onConflict 'email'
  stripe_customer_id text,
  subscribed boolean not null default false,
  subscription_tier text,
  subscription_end timestamptz,
  trial_used boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists subscribers_user_id_idx on public.subscribers (user_id);

alter table public.subscribers enable row level security;

create policy "subscribers_select_own"
  on public.subscribers
  for select
  to authenticated
  using (user_id = auth.uid());

-- No insert/update/delete policies: only the edge functions (service role) write this table.

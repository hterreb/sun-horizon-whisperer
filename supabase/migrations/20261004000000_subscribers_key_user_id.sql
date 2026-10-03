-- summary: Makes the Supabase user, not the e-mail, the key of `subscribers` (AUDIT S-12).
-- The edge functions look up `stripe_customer_id` by `user_id` and upsert on `user_id`,
-- so a second account with the same (unverified) e-mail cannot reach another user's
-- Stripe customer. The e-mail stays as an informational column.

alter table public.subscribers alter column user_id set not null;
alter table public.subscribers add constraint subscribers_user_id_key unique (user_id);
alter table public.subscribers drop constraint subscribers_email_key;
drop index if exists public.subscribers_user_id_idx; -- the unique constraint has its own index

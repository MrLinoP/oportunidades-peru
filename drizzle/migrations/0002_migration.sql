create extension if not exists pg_cron;
create extension if not exists pg_net;
create table public.internal_settings (key text primary key, value text not null);
grant all on public.internal_settings to service_role;
alter table public.internal_settings enable row level security;
revoke all on public.internal_settings from anon, authenticated;
insert into public.internal_settings(key, value) values ('sync_token', encode(extensions.gen_random_bytes(32),'hex'));
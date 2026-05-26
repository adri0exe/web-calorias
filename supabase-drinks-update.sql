create table if not exists public.drinks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  calories_per_100ml numeric(7,2) not null check (calories_per_100ml >= 0),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists drinks_public_name_idx
on public.drinks (lower(name))
where is_public;

create unique index if not exists drinks_user_name_idx
on public.drinks (user_id, lower(name))
where user_id is not null;

create table if not exists public.drink_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  drink_id uuid not null references public.drinks(id),
  quantity_ml numeric(8,2) not null check (quantity_ml > 0),
  calories integer not null check (calories >= 0),
  created_at timestamptz not null default now()
);

alter table public.drinks enable row level security;
alter table public.drink_entries enable row level security;

drop policy if exists "drinks_read_public_or_own" on public.drinks;
drop policy if exists "drinks_insert_own" on public.drinks;
drop policy if exists "drinks_update_own" on public.drinks;
drop policy if exists "drinks_delete_own" on public.drinks;

create policy "drinks_read_public_or_own" on public.drinks
for select using (is_public = true or auth.uid() = user_id);

create policy "drinks_insert_own" on public.drinks
for insert with check (auth.uid() = user_id and is_public = false);

create policy "drinks_update_own" on public.drinks
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id and is_public = false);

create policy "drinks_delete_own" on public.drinks
for delete using (auth.uid() = user_id);

drop policy if exists "drink_entries_select_own" on public.drink_entries;
drop policy if exists "drink_entries_insert_own" on public.drink_entries;
drop policy if exists "drink_entries_update_own" on public.drink_entries;
drop policy if exists "drink_entries_delete_own" on public.drink_entries;

create policy "drink_entries_select_own" on public.drink_entries
for select using (auth.uid() = user_id);

create policy "drink_entries_insert_own" on public.drink_entries
for insert with check (auth.uid() = user_id);

create policy "drink_entries_update_own" on public.drink_entries
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "drink_entries_delete_own" on public.drink_entries
for delete using (auth.uid() = user_id);

insert into public.drinks (name, calories_per_100ml, is_public) values
('agua', 0, true),
('cafe solo', 2, true),
('cafe con leche', 35, true),
('te', 1, true),
('leche semidesnatada', 47, true),
('zumo de naranja', 45, true),
('refresco cola', 42, true),
('cerveza', 43, true),
('vino tinto', 85, true),
('batido de proteina', 60, true)
on conflict do nothing;

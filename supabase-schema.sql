create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  age integer check (age between 10 and 100),
  sex text not null default 'male' check (sex in ('male', 'female')),
  height_cm numeric(5,2) check (height_cm between 100 and 230),
  current_weight_kg numeric(5,2) check (current_weight_kg between 30 and 250),
  activity_factor numeric(4,3) not null default 1.2,
  goal text not null default 'lose' check (goal in ('lose', 'maintain', 'gain')),
  target_kcal integer not null default 0,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  calories_per_100g numeric(7,2) not null check (calories_per_100g >= 0),
  protein_per_100g numeric(7,2) default 0,
  carbs_per_100g numeric(7,2) default 0,
  fat_per_100g numeric(7,2) default 0,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index foods_public_name_idx on public.foods (lower(name)) where is_public;
create unique index foods_user_name_idx on public.foods (user_id, lower(name)) where user_id is not null;

create table public.drinks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  calories_per_100ml numeric(7,2) not null check (calories_per_100ml >= 0),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index drinks_public_name_idx on public.drinks (lower(name)) where is_public;
create unique index drinks_user_name_idx on public.drinks (user_id, lower(name)) where user_id is not null;

create table public.exercise_catalog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  met numeric(5,2) not null check (met > 0),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index exercise_public_name_idx on public.exercise_catalog (lower(name)) where is_public;
create unique index exercise_user_name_idx on public.exercise_catalog (user_id, lower(name)) where user_id is not null;

create table public.meal_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  meal_type text not null,
  created_at timestamptz not null default now()
);

create table public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  meal_group_id uuid references public.meal_groups(id) on delete cascade,
  meal_type text not null,
  food_id uuid not null references public.foods(id),
  quantity_g numeric(8,2) not null check (quantity_g > 0),
  calories integer not null check (calories >= 0),
  created_at timestamptz not null default now()
);

create table public.exercise_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  exercise_id uuid not null references public.exercise_catalog(id),
  minutes integer not null check (minutes > 0),
  calories integer not null check (calories >= 0),
  created_at timestamptz not null default now()
);

create table public.drink_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  drink_id uuid not null references public.drinks(id),
  quantity_ml numeric(8,2) not null check (quantity_ml > 0),
  calories integer not null check (calories >= 0),
  created_at timestamptz not null default now()
);

create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  weight_kg numeric(5,2) not null check (weight_kg between 30 and 250),
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

create or replace function public.protect_profile_admin_flag()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' and new.is_admin = true then
      raise exception 'is_admin can only be set from the Supabase SQL editor';
    end if;

    if tg_op = 'UPDATE' and new.is_admin is distinct from old.is_admin then
      raise exception 'is_admin can only be changed from the Supabase SQL editor';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_protect_admin_flag
before insert or update on public.profiles
for each row execute function public.protect_profile_admin_flag();

alter table public.profiles enable row level security;
alter table public.foods enable row level security;
alter table public.drinks enable row level security;
alter table public.exercise_catalog enable row level security;
alter table public.meal_groups enable row level security;
alter table public.meal_entries enable row level security;
alter table public.drink_entries enable row level security;
alter table public.exercise_entries enable row level security;
alter table public.weight_entries enable row level security;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id and is_admin = false);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "foods_read_public_or_own" on public.foods
for select using (is_public = true or auth.uid() = user_id);

create policy "foods_insert_own" on public.foods
for insert with check (
  (auth.uid() = user_id and is_public = false)
  or (public.current_user_is_admin() and user_id is null and is_public = true)
);

create policy "foods_update_own" on public.foods
for update using (
  auth.uid() = user_id
  or (is_public = true and public.current_user_is_admin())
) with check (
  (auth.uid() = user_id and is_public = false)
  or (public.current_user_is_admin() and user_id is null and is_public = true)
);

create policy "foods_delete_own" on public.foods
for delete using (
  auth.uid() = user_id
  or (is_public = true and public.current_user_is_admin())
);

create policy "drinks_read_public_or_own" on public.drinks
for select using (is_public = true or auth.uid() = user_id);

create policy "drinks_insert_own" on public.drinks
for insert with check (
  (auth.uid() = user_id and is_public = false)
  or (public.current_user_is_admin() and user_id is null and is_public = true)
);

create policy "drinks_update_own" on public.drinks
for update using (
  auth.uid() = user_id
  or (is_public = true and public.current_user_is_admin())
) with check (
  (auth.uid() = user_id and is_public = false)
  or (public.current_user_is_admin() and user_id is null and is_public = true)
);

create policy "drinks_delete_own" on public.drinks
for delete using (
  auth.uid() = user_id
  or (is_public = true and public.current_user_is_admin())
);

create policy "exercise_catalog_read" on public.exercise_catalog
for select using (is_public = true or auth.uid() = user_id);

create policy "exercise_catalog_insert_own" on public.exercise_catalog
for insert with check (
  (auth.uid() = user_id and is_public = false)
  or (public.current_user_is_admin() and user_id is null and is_public = true)
);

create policy "exercise_catalog_update_own" on public.exercise_catalog
for update using (
  auth.uid() = user_id
  or (is_public = true and public.current_user_is_admin())
) with check (
  (auth.uid() = user_id and is_public = false)
  or (public.current_user_is_admin() and user_id is null and is_public = true)
);

create policy "exercise_catalog_delete_own" on public.exercise_catalog
for delete using (
  auth.uid() = user_id
  or (is_public = true and public.current_user_is_admin())
);

create policy "meal_entries_select_own" on public.meal_entries
for select using (auth.uid() = user_id);

create policy "meal_groups_select_own" on public.meal_groups
for select using (auth.uid() = user_id);

create policy "meal_groups_insert_own" on public.meal_groups
for insert with check (auth.uid() = user_id);

create policy "meal_groups_update_own" on public.meal_groups
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "meal_groups_delete_own" on public.meal_groups
for delete using (auth.uid() = user_id);

create policy "meal_entries_insert_own" on public.meal_entries
for insert with check (auth.uid() = user_id);

create policy "meal_entries_update_own" on public.meal_entries
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "meal_entries_delete_own" on public.meal_entries
for delete using (auth.uid() = user_id);

create policy "drink_entries_select_own" on public.drink_entries
for select using (auth.uid() = user_id);

create policy "drink_entries_insert_own" on public.drink_entries
for insert with check (auth.uid() = user_id);

create policy "drink_entries_update_own" on public.drink_entries
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "drink_entries_delete_own" on public.drink_entries
for delete using (auth.uid() = user_id);

create policy "exercise_entries_select_own" on public.exercise_entries
for select using (auth.uid() = user_id);

create policy "exercise_entries_insert_own" on public.exercise_entries
for insert with check (auth.uid() = user_id);

create policy "exercise_entries_update_own" on public.exercise_entries
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "exercise_entries_delete_own" on public.exercise_entries
for delete using (auth.uid() = user_id);

create policy "weight_entries_select_own" on public.weight_entries
for select using (auth.uid() = user_id);

create policy "weight_entries_insert_own" on public.weight_entries
for insert with check (auth.uid() = user_id);

create policy "weight_entries_update_own" on public.weight_entries
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "weight_entries_delete_own" on public.weight_entries
for delete using (auth.uid() = user_id);

revoke insert (is_admin), update (is_admin) on public.profiles from anon, authenticated;

insert into public.foods (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_public) values
('arroz cocido', 130, 2.7, 28.2, 0.3, true),
('pasta cocida', 158, 5.8, 30.9, 0.9, true),
('pan blanco', 265, 9, 49, 3.2, true),
('pan integral', 247, 13, 41, 4.2, true),
('pollo pechuga cocida', 165, 31, 0, 3.6, true),
('ternera magra', 217, 26, 0, 12, true),
('huevo', 155, 13, 1.1, 11, true),
('atun al natural', 116, 26, 0, 1, true),
('salmon', 208, 20, 0, 13, true),
('leche semidesnatada', 47, 3.3, 4.8, 1.6, true),
('yogur natural', 61, 3.5, 4.7, 3.3, true),
('queso fresco', 174, 12, 3, 13, true),
('manzana', 52, 0.3, 14, 0.2, true),
('platano', 89, 1.1, 23, 0.3, true),
('naranja', 47, 0.9, 12, 0.1, true),
('patata cocida', 87, 1.9, 20, 0.1, true),
('tomate', 18, 0.9, 3.9, 0.2, true),
('lechuga', 15, 1.4, 2.9, 0.2, true),
('aceite de oliva', 884, 0, 0, 100, true),
('avena', 389, 16.9, 66.3, 6.9, true),
('lentejas cocidas', 116, 9, 20, 0.4, true),
('garbanzos cocidos', 164, 8.9, 27.4, 2.6, true)
on conflict do nothing;

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

insert into public.exercise_catalog (name, met, is_public) values
('caminar suave', 2.8, true),
('caminar rapido', 4.3, true),
('correr suave', 7.0, true),
('correr intenso', 11.5, true),
('bicicleta suave', 4.0, true),
('bicicleta moderada', 8.0, true),
('pesas', 3.5, true),
('natacion moderada', 6.0, true),
('futbol', 7.0, true),
('eliptica', 5.0, true),
('subir escaleras', 8.8, true),
('yoga', 2.5, true)
on conflict do nothing;

alter table public.profiles
add column if not exists is_admin boolean not null default false;

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

drop trigger if exists profiles_protect_admin_flag on public.profiles;

create trigger profiles_protect_admin_flag
before insert or update on public.profiles
for each row execute function public.protect_profile_admin_flag();

alter table public.exercise_catalog
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.exercise_catalog
add column if not exists is_public boolean not null default false;

update public.exercise_catalog
set is_public = true
where user_id is null;

alter table public.exercise_catalog
drop constraint if exists exercise_catalog_name_key;

create unique index if not exists exercise_public_name_idx
on public.exercise_catalog (lower(name))
where is_public;

create unique index if not exists exercise_user_name_idx
on public.exercise_catalog (user_id, lower(name))
where user_id is not null;

drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id and is_admin = false);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "foods_insert_own" on public.foods;
drop policy if exists "foods_update_own" on public.foods;
drop policy if exists "foods_delete_own" on public.foods;

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

drop policy if exists "exercise_catalog_read" on public.exercise_catalog;
drop policy if exists "exercise_catalog_insert_own" on public.exercise_catalog;
drop policy if exists "exercise_catalog_update_own" on public.exercise_catalog;
drop policy if exists "exercise_catalog_delete_own" on public.exercise_catalog;

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

revoke insert (is_admin), update (is_admin) on public.profiles from anon, authenticated;

-- Despues de ejecutar este archivo, marca tu usuario como admin cambiando el email:
-- insert into public.profiles (id, is_admin)
-- select id, true from auth.users where email = 'TU_EMAIL'
-- on conflict (id) do update set is_admin = true;

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

drop policy if exists "exercise_catalog_read" on public.exercise_catalog;
drop policy if exists "exercise_catalog_insert_own" on public.exercise_catalog;
drop policy if exists "exercise_catalog_update_own" on public.exercise_catalog;
drop policy if exists "exercise_catalog_delete_own" on public.exercise_catalog;

create policy "exercise_catalog_read" on public.exercise_catalog
for select using (is_public = true or auth.uid() = user_id);

create policy "exercise_catalog_insert_own" on public.exercise_catalog
for insert with check (auth.uid() = user_id and is_public = false);

create policy "exercise_catalog_update_own" on public.exercise_catalog
for update using (auth.uid() = user_id) with check (auth.uid() = user_id and is_public = false);

create policy "exercise_catalog_delete_own" on public.exercise_catalog
for delete using (auth.uid() = user_id);

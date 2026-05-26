create table if not exists public.meal_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  meal_type text not null,
  created_at timestamptz not null default now()
);

alter table public.meal_entries
add column if not exists meal_group_id uuid references public.meal_groups(id) on delete cascade;

alter table public.meal_groups enable row level security;

drop policy if exists "meal_groups_select_own" on public.meal_groups;
drop policy if exists "meal_groups_insert_own" on public.meal_groups;
drop policy if exists "meal_groups_update_own" on public.meal_groups;
drop policy if exists "meal_groups_delete_own" on public.meal_groups;

create policy "meal_groups_select_own" on public.meal_groups
for select using (auth.uid() = user_id);

create policy "meal_groups_insert_own" on public.meal_groups
for insert with check (auth.uid() = user_id);

create policy "meal_groups_update_own" on public.meal_groups
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "meal_groups_delete_own" on public.meal_groups
for delete using (auth.uid() = user_id);

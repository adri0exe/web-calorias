-- Ejecuta este archivo SOLO en la base de datos equivocada.
-- Si ya existian tablas de bebidas antes, NO ejecutes los DROP TABLE del final.

drop policy if exists "drink_entries_delete_own" on public.drink_entries;
drop policy if exists "drink_entries_update_own" on public.drink_entries;
drop policy if exists "drink_entries_insert_own" on public.drink_entries;
drop policy if exists "drink_entries_select_own" on public.drink_entries;

drop policy if exists "drinks_delete_own" on public.drinks;
drop policy if exists "drinks_update_own" on public.drinks;
drop policy if exists "drinks_insert_own" on public.drinks;
drop policy if exists "drinks_read_public_or_own" on public.drinks;

delete from public.drinks
where is_public = true
  and user_id is null
  and name in (
    'agua',
    'cafe solo',
    'cafe con leche',
    'te',
    'leche semidesnatada',
    'zumo de naranja',
    'refresco cola',
    'cerveza',
    'vino tinto',
    'batido de proteina'
  );

-- Ejecuta estas dos lineas SOLO si estas seguro de que el script creo estas tablas
-- y no habia datos validos de bebidas en esa base.
drop table if exists public.drink_entries;
drop table if exists public.drinks;

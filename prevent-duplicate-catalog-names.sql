create unique index if not exists foods_unique_normalized_name
on public.foods (lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')));

create unique index if not exists drinks_unique_normalized_name
on public.drinks (lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')));

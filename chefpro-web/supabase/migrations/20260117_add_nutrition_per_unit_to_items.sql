alter table public.items
  add column if not exists nutrition_per_unit jsonb;


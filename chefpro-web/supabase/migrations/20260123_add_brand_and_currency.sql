alter table public.items
  add column if not exists brand text,
  add column if not exists currency text default 'EUR';

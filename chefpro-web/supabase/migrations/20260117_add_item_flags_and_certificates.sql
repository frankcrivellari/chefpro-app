alter table public.items
  add column if not exists is_bio boolean not null default false,
  add column if not exists is_deklarationsfrei boolean not null default false,
  add column if not exists is_allergenfrei boolean not null default false,
  add column if not exists is_cook_chill boolean not null default false,
  add column if not exists is_freeze_thaw_stable boolean not null default false,
  add column if not exists is_palm_oil_free boolean not null default false,
  add column if not exists is_yeast_free boolean not null default false,
  add column if not exists is_lactose_free boolean not null default false,
  add column if not exists is_gluten_free boolean not null default false;


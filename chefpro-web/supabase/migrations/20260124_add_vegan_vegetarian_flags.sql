-- Add is_vegan and is_vegetarian columns to items table
alter table public.items
  add column if not exists is_vegan boolean not null default false,
  add column if not exists is_vegetarian boolean not null default false;

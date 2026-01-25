-- Add is_fairtrade column to items table
alter table public.items
  add column if not exists is_fairtrade boolean not null default false;

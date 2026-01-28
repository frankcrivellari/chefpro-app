alter table public.recipe_structure
  add column if not exists custom_name text;

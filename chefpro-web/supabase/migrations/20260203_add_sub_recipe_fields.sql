-- Add sub-recipe grouping fields to recipe_structure table
ALTER TABLE recipe_structure ADD COLUMN IF NOT EXISTS sub_recipe_id UUID REFERENCES items(id);
ALTER TABLE recipe_structure ADD COLUMN IF NOT EXISTS sub_recipe_name TEXT;

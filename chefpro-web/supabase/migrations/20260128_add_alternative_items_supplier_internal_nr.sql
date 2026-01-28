
ALTER TABLE items
ADD COLUMN IF NOT EXISTS internal_article_number text,
ADD COLUMN IF NOT EXISTS supplier text,
ADD COLUMN IF NOT EXISTS alternative_items jsonb DEFAULT '[]'::jsonb;

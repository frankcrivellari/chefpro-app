-- Add packshot focus fields to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS packshot_x float8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS packshot_y float8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS packshot_zoom float8 DEFAULT 2.0;

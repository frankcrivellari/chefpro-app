-- Add storage_area column to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS storage_area text;

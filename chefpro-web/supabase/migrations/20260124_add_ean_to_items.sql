-- Add ean column to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS ean text;

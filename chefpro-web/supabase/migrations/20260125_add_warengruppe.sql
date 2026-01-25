-- Add warengruppe column to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS warengruppe text;

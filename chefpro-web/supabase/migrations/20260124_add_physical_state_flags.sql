-- Add physical state boolean flags to items table
ALTER TABLE items
ADD COLUMN is_powder BOOLEAN DEFAULT FALSE,
ADD COLUMN is_granulate BOOLEAN DEFAULT FALSE,
ADD COLUMN is_paste BOOLEAN DEFAULT FALSE,
ADD COLUMN is_liquid BOOLEAN DEFAULT FALSE;

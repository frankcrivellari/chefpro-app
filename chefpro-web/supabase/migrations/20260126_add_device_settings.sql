-- Add device_settings column to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS device_settings jsonb DEFAULT '[]'::jsonb;

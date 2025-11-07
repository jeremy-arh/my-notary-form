-- Migration script to update notary table structure
-- Run this SQL in your Supabase SQL Editor

-- 1. Ensure address-related columns and timezone exist
ALTER TABLE notary ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE notary ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE notary ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);

-- 2. Create junction table for notary services (many-to-many relationship)
CREATE TABLE IF NOT EXISTS notary_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notary_id UUID NOT NULL REFERENCES notary(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(notary_id, service_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_notary_services_notary ON notary_services(notary_id);
CREATE INDEX IF NOT EXISTS idx_notary_services_service ON notary_services(service_id);

-- 3. Enable RLS on notary_services table
ALTER TABLE notary_services ENABLE ROW LEVEL SECURITY;

-- Policy: Allow admins to manage notary services
CREATE POLICY "Admins can manage notary services"
ON notary_services FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_user
    WHERE admin_user.user_id = auth.uid()
  )
);

-- Policy: Notaries can view their own services
CREATE POLICY "Notaries can view their own services"
ON notary_services FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM notary
    WHERE notary.id = notary_services.notary_id
    AND notary.user_id = auth.uid()
  )
);


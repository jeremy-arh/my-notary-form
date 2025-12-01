-- Fix RLS policies for services and options tables
-- This allows public read access to active services and options

-- Enable RLS on services table (if not already enabled)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to active services" ON services;
DROP POLICY IF EXISTS "Allow public read access to services" ON services;

-- Create policy to allow public read access to active services
CREATE POLICY "Allow public read access to active services"
ON services
FOR SELECT
TO public
USING (is_active = true);

-- Enable RLS on options table (if not already enabled)
ALTER TABLE options ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to active options" ON options;
DROP POLICY IF EXISTS "Allow public read access to options" ON options;

-- Create policy to allow public read access to active options
CREATE POLICY "Allow public read access to active options"
ON options
FOR SELECT
TO public
USING (is_active = true);

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('services', 'options')
ORDER BY tablename, policyname;


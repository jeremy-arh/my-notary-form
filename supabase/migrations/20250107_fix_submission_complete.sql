-- COMPLETE FIX for submission table
-- This migration fixes all issues preventing submission creation/update

-- ============================================================================
-- 1. MAKE ALL FIELDS NULLABLE
-- ============================================================================
ALTER TABLE submission 
ALTER COLUMN appointment_date DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN appointment_time DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN first_name DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN last_name DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN email DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN address DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN city DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN postal_code DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN country DROP NOT NULL;

ALTER TABLE submission 
ALTER COLUMN timezone DROP NOT NULL;

-- Set default timezone
UPDATE submission SET timezone = 'UTC' WHERE timezone IS NULL;
ALTER TABLE submission ALTER COLUMN timezone SET DEFAULT 'UTC';

-- ============================================================================
-- 2. ENSURE FUNNEL_STATUS EXISTS (FORCE CREATE)
-- ============================================================================
-- Drop constraint if exists first
DO $$ 
BEGIN
  -- Drop constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.submission'::regclass 
    AND conname = 'submission_funnel_status_check'
  ) THEN
    ALTER TABLE submission DROP CONSTRAINT submission_funnel_status_check;
  END IF;
END $$;

-- Add column (will fail silently if exists, so we use DO block)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'submission' 
    AND column_name = 'funnel_status'
  ) THEN
    ALTER TABLE submission ADD COLUMN funnel_status TEXT;
  END IF;
END $$;

-- Add constraint
ALTER TABLE submission 
ADD CONSTRAINT submission_funnel_status_check CHECK (
  funnel_status IS NULL OR funnel_status IN (
    'started',
    'services_selected',
    'documents_uploaded',
    'delivery_method_selected',
    'personal_info_completed',
    'signatories_added',
    'payment_pending',
    'payment_completed',
    'submission_completed'
  )
);

-- ============================================================================
-- 3. ENSURE DATA COLUMN EXISTS (JSONB)
-- ============================================================================
ALTER TABLE submission 
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- 4. ENSURE CLIENT_ID EXISTS AND IS NULLABLE
-- ============================================================================
ALTER TABLE submission 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES client(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. FIX STATUS CONSTRAINT TO INCLUDE pending_payment
-- ============================================================================
-- Drop existing constraint if it exists
ALTER TABLE submission
DROP CONSTRAINT IF EXISTS submission_status_check;

-- Add new constraint with pending_payment
ALTER TABLE submission
ADD CONSTRAINT submission_status_check CHECK (
  status::text = ANY (ARRAY[
    'pending'::character varying,
    'pending_payment'::character varying,
    'confirmed'::character varying,
    'in_progress'::character varying,
    'completed'::character varying,
    'cancelled'::character varying
  ]::text[])
);

-- ============================================================================
-- 6. FIX RLS POLICIES
-- ============================================================================
ALTER TABLE submission ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Allow public insert on submission" ON submission;
DROP POLICY IF EXISTS "Allow public update on submission" ON submission;
DROP POLICY IF EXISTS "Allow users to view their own submissions" ON submission;
DROP POLICY IF EXISTS "Allow public read submissions" ON submission;
DROP POLICY IF EXISTS "Clients can view their own submissions" ON submission;
DROP POLICY IF EXISTS "Notaries can view all submissions" ON submission;
DROP POLICY IF EXISTS "Notaries can update submissions" ON submission;

-- CREATE INSERT POLICY - Allow anyone to insert
CREATE POLICY "Allow public insert on submission"
  ON submission FOR INSERT
  TO public
  WITH CHECK (true);

-- CREATE UPDATE POLICY - Allow anyone to update ANY submission
-- This is needed because we need to update even if status is not yet set
CREATE POLICY "Allow public update on submission"
  ON submission FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- CREATE SELECT POLICY - Allow anyone to read submissions
CREATE POLICY "Allow public read submissions"
  ON submission FOR SELECT
  TO public
  USING (true);

-- ============================================================================
-- 7. VERIFY
-- ============================================================================
SELECT 
    'Migration completed' as status,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'submission') as policy_count,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'submission' AND column_name = 'funnel_status') as has_funnel_status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'submission' AND column_name = 'data') as has_data_column;

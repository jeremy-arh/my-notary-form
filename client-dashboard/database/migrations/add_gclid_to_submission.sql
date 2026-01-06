-- Add gclid column to submission table for Google Ads tracking
-- GCLID (Google Click ID) is used to track conversions from Google Ads campaigns

ALTER TABLE submission 
ADD COLUMN IF NOT EXISTS gclid TEXT;

-- Add comment to column
COMMENT ON COLUMN submission.gclid IS 'Google Click ID (GCLID) from URL parameter for Google Ads conversion tracking';

-- Create index for faster lookups (optional, but useful for analytics)
CREATE INDEX IF NOT EXISTS idx_submission_gclid ON submission(gclid) WHERE gclid IS NOT NULL;









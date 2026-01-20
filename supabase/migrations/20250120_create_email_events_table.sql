-- Create table to track SendGrid email events (opens, clicks, bounces, etc.)
-- This table stores all events received from SendGrid webhooks

CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Email identification
  email TEXT NOT NULL,
  submission_id UUID REFERENCES submission(id) ON DELETE SET NULL,
  email_type TEXT, -- e.g., 'abandoned_cart_h+1', 'payment_success', etc.
  
  -- Event details
  event_type TEXT NOT NULL, -- 'processed', 'delivered', 'open', 'click', 'bounce', 'dropped', 'spam_report', 'unsubscribe', etc.
  timestamp TIMESTAMPTZ NOT NULL,
  sg_event_id TEXT NOT NULL UNIQUE, -- SendGrid event ID (unique to prevent duplicates)
  sg_message_id TEXT, -- SendGrid message ID
  
  -- Bounce/Drop details
  reason TEXT,
  status TEXT,
  response TEXT,
  attempt TEXT,
  
  -- Click details
  url TEXT,
  url_offset_index INTEGER,
  url_offset_type TEXT,
  
  -- Open details
  useragent TEXT,
  ip TEXT,
  
  -- Unsubscribe details
  asm_group_id INTEGER,
  
  -- Categories and marketing
  category TEXT[],
  newsletter_id TEXT,
  newsletter_user_list_id TEXT,
  marketing_campaign_id TEXT,
  marketing_campaign_name TEXT,
  marketing_campaign_version TEXT,
  marketing_campaign_split_id TEXT,
  
  -- Raw event data (for debugging)
  raw_event JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email);
CREATE INDEX IF NOT EXISTS idx_email_events_submission_id ON email_events(submission_id);
CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_timestamp ON email_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_sg_message_id ON email_events(sg_message_id);
CREATE INDEX IF NOT EXISTS idx_email_events_email_type ON email_events(email_type);

-- Add comments
COMMENT ON TABLE email_events IS 'Stores all SendGrid email events (opens, clicks, bounces, etc.) received via webhooks';
COMMENT ON COLUMN email_events.event_type IS 'Type of event: processed, delivered, open, click, bounce, dropped, spam_report, unsubscribe, etc.';
COMMENT ON COLUMN email_events.submission_id IS 'Reference to submission (if email was sent for a specific submission)';
COMMENT ON COLUMN email_events.email_type IS 'Type of email sent: abandoned_cart_h+1, payment_success, etc.';
COMMENT ON COLUMN email_events.sg_event_id IS 'SendGrid event ID - unique to prevent duplicate events';

-- Enable Row Level Security
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "Service role can manage all email events" ON email_events;
CREATE POLICY "Service role can manage all email events"
  ON email_events
  FOR ALL
  USING (auth.role() = 'service_role');

-- Note: All email tracking is done via email_sent and email_events tables
-- No need for email_sequence_tracking - all emails (including abandoned cart) are tracked in email_sent

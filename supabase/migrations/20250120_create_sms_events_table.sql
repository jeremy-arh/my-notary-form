-- Create table to track detailed SMS events from Twilio webhooks
-- This table stores all events received from Twilio webhooks

CREATE TABLE IF NOT EXISTS sms_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  phone_number TEXT NOT NULL,
  submission_id UUID REFERENCES submission(id) ON DELETE SET NULL,
  sms_type TEXT,
  event_type TEXT NOT NULL, -- 'sent', 'delivered', 'failed', 'undelivered', etc.
  timestamp TIMESTAMPTZ NOT NULL,
  
  -- Twilio tracking
  twilio_message_sid TEXT NOT NULL UNIQUE,
  twilio_account_sid TEXT,
  twilio_status TEXT,
  error_code TEXT,
  error_message TEXT,
  
  -- Event details
  raw_event JSONB, -- Store full event for debugging
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_sms_events_phone_number ON sms_events(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_events_submission_id ON sms_events(submission_id);
CREATE INDEX IF NOT EXISTS idx_sms_events_sms_type ON sms_events(sms_type);
CREATE INDEX IF NOT EXISTS idx_sms_events_event_type ON sms_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sms_events_timestamp ON sms_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sms_events_twilio_message_sid ON sms_events(twilio_message_sid);

-- Add comments
COMMENT ON TABLE sms_events IS 'Tracks all SMS events received from Twilio webhooks';
COMMENT ON COLUMN sms_events.event_type IS 'Type of event: sent, delivered, failed, undelivered, etc.';
COMMENT ON COLUMN sms_events.twilio_message_sid IS 'Twilio message SID for linking with sms_sent table';

-- Enable Row Level Security
ALTER TABLE sms_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "Service role can manage all sms events" ON sms_events;
CREATE POLICY "Service role can manage all sms events"
  ON sms_events
  FOR ALL
  USING (auth.role() = 'service_role');

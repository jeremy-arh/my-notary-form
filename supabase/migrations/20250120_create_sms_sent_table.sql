-- Create table to track ALL SMS sent (not just abandoned cart sequences)
-- This table stores a record for every SMS sent, regardless of type

CREATE TABLE IF NOT EXISTS sms_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- SMS identification
  phone_number TEXT NOT NULL,
  recipient_name TEXT,
  recipient_type TEXT, -- 'client' or 'notary'
  
  -- SMS details
  sms_type TEXT NOT NULL, -- 'abandoned_cart_j+1', 'abandoned_cart_j+3', 'abandoned_cart_j+10', 'notification', etc.
  message TEXT NOT NULL,
  
  -- References
  submission_id UUID REFERENCES submission(id) ON DELETE SET NULL,
  client_id UUID REFERENCES client(id) ON DELETE SET NULL,
  notification_id UUID, -- Reference to notifications table if applicable
  
  -- Twilio tracking
  twilio_message_sid TEXT, -- Twilio message SID (from response)
  
  -- Status tracking (updated by webhooks)
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failed_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_sms_sent_phone_number ON sms_sent(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_sent_submission_id ON sms_sent(submission_id);
CREATE INDEX IF NOT EXISTS idx_sms_sent_client_id ON sms_sent(client_id);
CREATE INDEX IF NOT EXISTS idx_sms_sent_sms_type ON sms_sent(sms_type);
CREATE INDEX IF NOT EXISTS idx_sms_sent_sent_at ON sms_sent(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_sent_twilio_message_sid ON sms_sent(twilio_message_sid);

-- Add comments
COMMENT ON TABLE sms_sent IS 'Tracks ALL SMS sent through the system (transactional, abandoned cart, notifications, etc.)';
COMMENT ON COLUMN sms_sent.sms_type IS 'Type of SMS: abandoned_cart_j+1, abandoned_cart_j+3, abandoned_cart_j+10, notification, etc.';
COMMENT ON COLUMN sms_sent.submission_id IS 'Reference to submission (if SMS is related to a submission)';
COMMENT ON COLUMN sms_sent.client_id IS 'Reference to client (if SMS is sent to a client)';
COMMENT ON COLUMN sms_sent.twilio_message_sid IS 'Twilio message SID for tracking events via webhooks';

-- Enable Row Level Security
ALTER TABLE sms_sent ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "Service role can manage all sms sent" ON sms_sent;
CREATE POLICY "Service role can manage all sms sent"
  ON sms_sent
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sms_sent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_sms_sent_updated_at
  BEFORE UPDATE ON sms_sent
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_sent_updated_at();

-- Create table to track ALL emails sent (not just abandoned cart sequences)
-- This table stores a record for every email sent, regardless of type

CREATE TABLE IF NOT EXISTS email_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Email identification
  email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_type TEXT, -- 'client' or 'notary'
  
  -- Email details
  email_type TEXT NOT NULL, -- 'payment_success', 'payment_failed', 'abandoned_cart_h+1', 'notarized_file_uploaded', etc.
  subject TEXT NOT NULL,
  
  -- References
  submission_id UUID REFERENCES submission(id) ON DELETE SET NULL,
  client_id UUID REFERENCES client(id) ON DELETE SET NULL,
  notification_id UUID, -- Reference to notifications table if applicable
  
  -- SendGrid tracking
  sg_message_id TEXT, -- SendGrid message ID (from response)
  
  -- Status tracking (updated by webhooks)
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  clicked_url TEXT,
  bounced_at TIMESTAMPTZ,
  bounce_reason TEXT,
  dropped_at TIMESTAMPTZ,
  drop_reason TEXT,
  spam_reported_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_sent_email ON email_sent(email);
CREATE INDEX IF NOT EXISTS idx_email_sent_submission_id ON email_sent(submission_id);
CREATE INDEX IF NOT EXISTS idx_email_sent_client_id ON email_sent(client_id);
CREATE INDEX IF NOT EXISTS idx_email_sent_email_type ON email_sent(email_type);
CREATE INDEX IF NOT EXISTS idx_email_sent_sent_at ON email_sent(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sent_sg_message_id ON email_sent(sg_message_id);

-- Add comments
COMMENT ON TABLE email_sent IS 'Tracks ALL emails sent through the system (transactional, abandoned cart, notifications, etc.)';
COMMENT ON COLUMN email_sent.email_type IS 'Type of email: payment_success, payment_failed, abandoned_cart_h+1, notarized_file_uploaded, message_received, etc.';
COMMENT ON COLUMN email_sent.submission_id IS 'Reference to submission (if email is related to a submission)';
COMMENT ON COLUMN email_sent.client_id IS 'Reference to client (if email is sent to a client)';
COMMENT ON COLUMN email_sent.sg_message_id IS 'SendGrid message ID for tracking events via webhooks';

-- Enable Row Level Security
ALTER TABLE email_sent ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "Service role can manage all email sent" ON email_sent;
CREATE POLICY "Service role can manage all email sent"
  ON email_sent
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_sent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_email_sent_updated_at
  BEFORE UPDATE ON email_sent
  FOR EACH ROW
  EXECUTE FUNCTION update_email_sent_updated_at();

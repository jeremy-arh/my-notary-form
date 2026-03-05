-- Add provider_message_id for ClickSend (and other providers)
-- twilio_message_sid kept for backward compatibility with existing Twilio data
ALTER TABLE sms_sent ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sms_sent_provider_message_id ON sms_sent(provider_message_id);
COMMENT ON COLUMN sms_sent.provider_message_id IS 'Message ID from SMS provider (ClickSend, etc.) for tracking';

-- Add clicked_at, clicked_url for SMS link tracking (ClickSend shorten_urls)
ALTER TABLE sms_sent ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
ALTER TABLE sms_sent ADD COLUMN IF NOT EXISTS clicked_url TEXT;
COMMENT ON COLUMN sms_sent.clicked_at IS 'First click on link in SMS (when shorten_urls enabled)';
COMMENT ON COLUMN sms_sent.clicked_url IS 'URL that was clicked';

-- sms_events: add provider_message_id, make twilio_message_sid nullable for ClickSend
ALTER TABLE sms_events ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sms_events_provider_message_id ON sms_events(provider_message_id);
COMMENT ON COLUMN sms_events.provider_message_id IS 'Message ID from provider (ClickSend, etc.)';
-- Allow null twilio_message_sid for ClickSend events (legacy Twilio uses it)
ALTER TABLE sms_events ALTER COLUMN twilio_message_sid DROP NOT NULL;
DROP INDEX IF EXISTS idx_sms_events_twilio_message_sid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_events_twilio_message_sid ON sms_events(twilio_message_sid) WHERE twilio_message_sid IS NOT NULL;

CREATE TABLE IF NOT EXISTS automation_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  trigger_status TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES automation_sequences(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  delay_value INT NOT NULL,
  delay_unit TEXT NOT NULL CHECK (delay_unit IN ('minutes', 'hours', 'days')),
  send_window_start INT,
  send_window_end INT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  template_key TEXT NOT NULL,
  subject TEXT,
  message_body TEXT,
  html_body TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sequence_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_automation_steps_sequence ON automation_steps(sequence_id);

ALTER TABLE automation_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages automation_sequences" ON automation_sequences;
CREATE POLICY "Service role manages automation_sequences"
  ON automation_sequences FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages automation_steps" ON automation_steps;
CREATE POLICY "Service role manages automation_steps"
  ON automation_steps FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_automation_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_automation_sequences_updated_at
  BEFORE UPDATE ON automation_sequences FOR EACH ROW
  EXECUTE FUNCTION update_automation_updated_at();

CREATE TRIGGER update_automation_steps_updated_at
  BEFORE UPDATE ON automation_steps FOR EACH ROW
  EXECUTE FUNCTION update_automation_updated_at();

COMMENT ON TABLE automation_sequences IS 'Email/SMS automation sequences configurable from back-office';
COMMENT ON TABLE automation_steps IS 'Individual steps within an automation sequence';
COMMENT ON COLUMN automation_steps.delay_value IS 'Delay before sending (combined with delay_unit)';
COMMENT ON COLUMN automation_steps.send_window_start IS 'Hour of day (0-23) - only send after this hour';
COMMENT ON COLUMN automation_steps.send_window_end IS 'Hour of day (0-23) - only send before this hour';

INSERT INTO automation_sequences (name, description, trigger_event, trigger_status, channel, is_active) VALUES
  ('Relance panier abandonné - Email', 'Séquence email pour les paiements en attente', 'submission_created', 'pending_payment', 'email', true),
  ('Relance panier abandonné - SMS', 'Séquence SMS pour les paiements en attente', 'submission_created', 'pending_payment', 'sms', true);

INSERT INTO automation_steps (sequence_id, step_order, delay_value, delay_unit, send_window_start, send_window_end, channel, template_key, subject, is_active)
SELECT s.id, v.step_order, v.delay_value, v.delay_unit, v.window_start, v.window_end, 'email', v.template_key, v.subject, true
FROM automation_sequences s
CROSS JOIN (VALUES
  (1, 1, 'hours', NULL::int, NULL::int, 'abandoned_cart_h+1', 'Your certification is waiting'),
  (2, 1, 'days', NULL, NULL, 'abandoned_cart_j+1', 'Your documents are waiting to be certified'),
  (3, 3, 'days', NULL, NULL, 'abandoned_cart_j+3', 'Complete your notarization'),
  (4, 7, 'days', NULL, NULL, 'abandoned_cart_j+7', 'Your notarization process is incomplete'),
  (5, 10, 'days', NULL, NULL, 'abandoned_cart_j+10', 'Don''t miss your certification deadline'),
  (6, 15, 'days', NULL, NULL, 'abandoned_cart_j+15', 'Last chance to complete your certification'),
  (7, 30, 'days', NULL, NULL, 'abandoned_cart_j+30', 'We miss you - complete your certification')
) AS v(step_order, delay_value, delay_unit, window_start, window_end, template_key, subject)
WHERE s.channel = 'email' AND s.trigger_event = 'submission_created';

INSERT INTO automation_steps (sequence_id, step_order, delay_value, delay_unit, send_window_start, send_window_end, channel, template_key, subject, is_active)
SELECT s.id, v.step_order, v.delay_value, v.delay_unit, v.window_start, v.window_end, 'sms', v.template_key, NULL, true
FROM automation_sequences s
CROSS JOIN (VALUES
  (1, 1, 'days', 18, 20, 'abandoned_cart_j+1'),
  (2, 3, 'days', NULL::int, NULL::int, 'abandoned_cart_j+3'),
  (3, 10, 'days', NULL, NULL, 'abandoned_cart_j+10')
) AS v(step_order, delay_value, delay_unit, window_start, window_end, template_key)
WHERE s.channel = 'sms' AND s.trigger_event = 'submission_created';

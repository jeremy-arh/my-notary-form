-- Allow 'mixed' channel for automation_sequences (email + SMS in same sequence)
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  WHERE c.conrelid = 'automation_sequences'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%channel%';
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE automation_sequences DROP CONSTRAINT %I', conname);
  END IF;
END $$;
ALTER TABLE automation_sequences ADD CONSTRAINT automation_sequences_channel_check
  CHECK (channel IN ('email', 'sms', 'mixed'));

COMMENT ON COLUMN automation_sequences.channel IS 'email, sms, or mixed (steps can have different channels)';

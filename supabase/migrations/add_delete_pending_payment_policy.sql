-- Enable clients to delete their own submissions with pending_payment status
-- This policy allows deletion only if:
-- 1. The submission belongs to the client
-- 2. The status is 'pending_payment'

DROP POLICY IF EXISTS "Allow clients to delete pending_payment submissions" ON submission;

CREATE POLICY "Allow clients to delete pending_payment submissions"
ON submission
FOR DELETE
USING (
  client_id IN (
    SELECT id FROM client WHERE user_id = auth.uid()
  )
  AND status = 'pending_payment'
);

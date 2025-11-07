-- Migration: Add payment status to notary_payments table
-- This migration adds a payment_status column to track payout payment statuses

-- Drop existing constraint if it exists
ALTER TABLE public.notary_payments
DROP CONSTRAINT IF EXISTS notary_payments_payment_status_check;

-- Add payment_status column if it doesn't exist
ALTER TABLE public.notary_payments
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'created';

-- Update existing values to new status values
UPDATE public.notary_payments
SET payment_status = CASE
  WHEN payment_status = 'pending' OR payment_status IS NULL THEN 'created'
  WHEN payment_status = 'completed' THEN 'paid'
  WHEN payment_status = 'cancelled' THEN 'canceled'
  ELSE 'created'
END;

-- Add constraint with new status values
ALTER TABLE public.notary_payments
ADD CONSTRAINT notary_payments_payment_status_check CHECK (payment_status IN ('created', 'paid', 'canceled'));

-- Set default to 'created'
ALTER TABLE public.notary_payments
ALTER COLUMN payment_status SET DEFAULT 'created';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_notary_payments_status ON public.notary_payments(payment_status);

-- Add comment
COMMENT ON COLUMN public.notary_payments.payment_status IS 'Status of the payout payment: created, paid, canceled';


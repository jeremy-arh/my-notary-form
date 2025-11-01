-- Add 'pending_payment' status to submission table check constraint
-- This status is used when a submission is created but payment hasn't been completed yet

-- Drop the existing constraint
ALTER TABLE public.submission
DROP CONSTRAINT IF EXISTS submission_status_check;

-- Add the new constraint with 'pending_payment' included
ALTER TABLE public.submission
ADD CONSTRAINT submission_status_check CHECK (
  status::text = ANY (ARRAY[
    'pending'::character varying,
    'pending_payment'::character varying,
    'confirmed'::character varying,
    'in_progress'::character varying,
    'completed'::character varying,
    'cancelled'::character varying
  ]::text[])
);

-- Add comment
COMMENT ON COLUMN public.submission.status IS 'Submission status: pending_payment (awaiting payment), pending (paid, awaiting review), confirmed, in_progress, completed, cancelled';

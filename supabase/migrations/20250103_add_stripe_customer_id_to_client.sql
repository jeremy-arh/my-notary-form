-- Add stripe_customer_id column to client table
-- This allows us to store the Stripe customer ID for each client
-- and use it for future payment updates

ALTER TABLE client 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_stripe_customer_id ON client(stripe_customer_id);

-- Add comment
COMMENT ON COLUMN client.stripe_customer_id IS 'Stripe customer ID for this client. Used for payment updates and recurring charges.';


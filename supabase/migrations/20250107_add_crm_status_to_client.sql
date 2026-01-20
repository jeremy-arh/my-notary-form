-- Add CRM status column to client table
-- This allows tracking client progression through the sales funnel

ALTER TABLE client 
ADD COLUMN IF NOT EXISTS crm_status TEXT DEFAULT 'new' CHECK (crm_status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_client_crm_status ON client(crm_status);

-- Add comment
COMMENT ON COLUMN client.crm_status IS 'CRM status for tracking client progression: new, contacted, qualified, proposal, negotiation, won, lost';

-- Add funnel_status column to track progression through the form funnel
-- This replaces the CRM status and reflects actual form completion steps

-- Add funnel_status to client table
ALTER TABLE client 
ADD COLUMN IF NOT EXISTS funnel_status TEXT DEFAULT 'started' CHECK (funnel_status IN (
  'started',                    -- User started the form
  'services_selected',          -- Step 1: Services selected
  'documents_uploaded',         -- Step 2: Documents uploaded
  'delivery_method_selected',  -- Step 3: Delivery method selected
  'personal_info_completed',    -- Step 4: Personal information completed
  'signatories_added',          -- Step 5: Signatories added
  'payment_pending',            -- Step 6: Payment pending
  'payment_completed',          -- Step 7: Payment completed
  'submission_completed'        -- Step 8: Submission fully completed
));

-- Add funnel_status to submission table
ALTER TABLE submission 
ADD COLUMN IF NOT EXISTS funnel_status TEXT CHECK (funnel_status IN (
  'started',
  'services_selected',
  'documents_uploaded',
  'delivery_method_selected',
  'personal_info_completed',
  'signatories_added',
  'payment_pending',
  'payment_completed',
  'submission_completed'
));

-- Add client_id to form_draft to link drafts to clients
ALTER TABLE form_draft 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES client(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_funnel_status ON client(funnel_status);
CREATE INDEX IF NOT EXISTS idx_submission_funnel_status ON submission(funnel_status);
CREATE INDEX IF NOT EXISTS idx_form_draft_client_id ON form_draft(client_id);

-- Add comments
COMMENT ON COLUMN client.funnel_status IS 'Tracks client progression through the form funnel';
COMMENT ON COLUMN submission.funnel_status IS 'Tracks submission progression through the form funnel';
COMMENT ON COLUMN form_draft.client_id IS 'Links form draft to client if client was created before payment';

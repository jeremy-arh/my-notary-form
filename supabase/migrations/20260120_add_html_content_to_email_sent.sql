-- Add html_content column to email_sent table to store email body
-- This migration ensures the column exists even if previous migrations weren't applied

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_sent' 
        AND column_name = 'html_content'
    ) THEN
        ALTER TABLE email_sent
        ADD COLUMN html_content TEXT;
        
        COMMENT ON COLUMN email_sent.html_content IS 'HTML content of the email body';
    END IF;
END $$;

-- Add html_content column to email_sent table to store email body
ALTER TABLE email_sent
ADD COLUMN IF NOT EXISTS html_content TEXT;

-- Add comment
COMMENT ON COLUMN email_sent.html_content IS 'HTML content of the email body';

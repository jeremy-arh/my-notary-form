# Send Transactional Email Edge Function

This Edge Function sends transactional emails to clients and notaries using SendGrid with dynamic HTML templates.

## Email Types

1. **payment_success** - Sent when a payment is successful (includes invoice attachment)
2. **payment_failed** - Sent when a payment fails
3. **notary_assigned** - Sent when a notary is assigned to a submission
4. **notarized_file_uploaded** - Sent when a notarized file is uploaded
5. **message_received** - Sent when a message is received

## Setup

### 1. Environment Variables

Add these secrets to Supabase Vault (Settings > Vault):

- `SENDGRID_API_KEY` - Your SendGrid API key
- `SENDGRID_FROM_EMAIL` - From email address (default: support@mynotary.io)
- `SENDGRID_FROM_NAME` - From name (default: MY NOTARY)
- `CLIENT_DASHBOARD_URL` - Client dashboard URL (default: https://client.mynotary.io)
- `NOTARY_DASHBOARD_URL` - Notary dashboard URL (default: https://notary.mynotary.io)

### 2. Deploy Function

```bash
supabase functions deploy send-transactional-email
```

### 3. Usage

```javascript
const { sendTransactionalEmail } = await import('./utils/sendTransactionalEmail');

await sendTransactionalEmail(supabase, {
  email_type: 'payment_success',
  recipient_email: 'client@example.com',
  recipient_name: 'John Doe',
  recipient_type: 'client',
  data: {
    submission_id: '...',
    submission_number: 'abc12345',
    payment_amount: 100.00,
    payment_date: '2024-01-01',
    invoice_url: 'https://...',
    invoice_pdf: 'base64...' // Optional
  }
});
```

## Email Templates

Templates are generated dynamically in the Edge Function using HTML. Each email type has a specific template with:
- Professional design
- Responsive layout
- Action buttons
- Footer with dashboard link

## Invoice Attachment

For `payment_success` emails, if `invoice_pdf` (base64) is provided, it will be attached to the email.

## Testing

Test the function:

```bash
supabase functions invoke send-transactional-email \
  --data '{
    "email_type": "payment_success",
    "recipient_email": "test@example.com",
    "recipient_name": "Test User",
    "recipient_type": "client",
    "data": {
      "submission_id": "test-id",
      "submission_number": "test1234",
      "payment_amount": 100.00,
      "payment_date": "2024-01-01",
      "invoice_url": "https://example.com/invoice.pdf"
    }
  }'
```

## Error Handling

The function handles errors gracefully:
- Missing required fields
- SendGrid API errors
- Missing environment variables
- Invalid email addresses

Check logs:
```bash
supabase functions logs send-transactional-email
```


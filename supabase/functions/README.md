# Supabase Edge Functions - Stripe Payment Integration

This directory contains Supabase Edge Functions for handling Stripe payments in the notary form application.

## Functions

### 1. create-checkout-session
Creates a Stripe Checkout session when user clicks "Confirm & Pay" button.

**Endpoint**: `/create-checkout-session`

**Request Body**:
```json
{
  "formData": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "selectedOptions": ["array"],
    "documents": ["array"],
    // ... other form fields
  },
  "amount": "number (in cents)"
}
```

**Response**:
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### 2. verify-payment
Verifies payment status after user returns from Stripe Checkout and creates the submission in database.

**Endpoint**: `/verify-payment`

**Request Body**:
```json
{
  "sessionId": "stripe_session_id"
}
```

**Response**:
```json
{
  "verified": true,
  "submissionId": "uuid",
  "accountCreated": false
}
```

## Environment Variables

The following environment variables must be configured in your Supabase project:

### Required for both functions:
- `STRIPE_SECRET_KEY` - Your Stripe secret API key
- `SUPABASE_URL` - Your Supabase project URL (auto-provided)
- `SUPABASE_ANON_KEY` - Your Supabase anon key (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

## Setup Instructions

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Link your project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Set environment variables

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```

### 4. Deploy functions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy verify-payment
```

## Testing Locally

### 1. Start Supabase locally

```bash
supabase start
```

### 2. Serve functions locally

```bash
supabase functions serve create-checkout-session --env-file .env.local
```

### 3. Test with curl

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/create-checkout-session' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "formData": {...},
    "amount": 7500
  }'
```

## Stripe Configuration

### Test Mode
Use Stripe test API keys during development:
- Test cards: https://stripe.com/docs/testing

### Production Mode
1. Replace test API keys with live keys
2. Configure Stripe webhook endpoint in Stripe Dashboard
3. Update success/cancel URLs to production domain

## Payment Flow

1. User fills out notary form
2. User clicks "Confirm & Pay"
3. `create-checkout-session` function is called
4. User is redirected to Stripe Checkout
5. User completes payment
6. User is redirected back to:
   - `/payment/success?session_id=...` on success
   - `/payment/failed` on cancel
7. Success page calls `verify-payment` function
8. `verify-payment` creates submission and user account (if guest)
9. User is shown success message and redirected to dashboard

## Error Handling

### Payment Failed
If payment fails or is cancelled:
- User is redirected to `/payment/failed`
- Form data remains in localStorage
- User can retry payment from failed page

### Verification Failed
If payment verification fails:
- Error message is displayed on success page
- User can return to form to try again

## Security Notes

- Never expose your Stripe secret key in client-side code
- All Stripe operations happen server-side in Edge Functions
- User authentication is verified before processing
- Form data is validated before creating checkout session
- Payment status is verified from Stripe before creating submission

## Support

For issues or questions:
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Stripe Checkout: https://stripe.com/docs/payments/checkout

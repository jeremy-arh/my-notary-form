# 🔧 Quick Fix: Add Missing Database Column

## ❌ Error You're Seeing

```
Could not find the 'data' column of 'submission' in the schema cache
```

## ✅ Solution (2 minutes)

The `submission` table is missing the `data` column needed to store form and payment information.

### Step 1: Open Supabase SQL Editor

1. Go to https://app.supabase.com
2. Open your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run This SQL

Copy and paste this entire SQL query:

```sql
-- Add data column to submission table
ALTER TABLE public.submission
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN public.submission.data IS 'Stores form data, selected options, documents info, payment details, and other metadata as JSON';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_submission_data ON public.submission USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_submission_payment_status ON public.submission USING BTREE ((data->'payment'->>'payment_status'));
```

### Step 3: Click "Run" (or press Ctrl/Cmd + Enter)

You should see:
```
Success. No rows returned
```

### Step 4: Verify It Worked

Run this query to verify:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'submission' AND column_name = 'data';
```

You should see:
```
column_name | data_type
------------|----------
data        | jsonb
```

### Step 5: Test Your App

1. Go back to your application
2. Fill out the notary form
3. Click "Confirm & Pay"
4. You should now be redirected to Stripe Checkout ✅

## 🎉 Done!

The payment flow should now work correctly. The `data` column will store:
- Selected notary options
- Document information
- Appointment details
- Payment information from Stripe
- Any other form metadata

## 🔍 What This Fixed

The Edge Functions were trying to insert data into a column that didn't exist. This migration:
- ✅ Adds the `data` column as JSONB (flexible JSON storage)
- ✅ Sets a default empty object `{}`
- ✅ Adds indexes for better query performance
- ✅ Allows the payment flow to complete successfully

## 📊 Table Structure After Migration

Your `submission` table now has:
- `id` - UUID primary key
- `user_id` - UUID reference to user
- `status` - Text (pending_payment, pending, approved, etc.)
- `type` - Text (notary_request)
- `email` - Text
- `first_name` - Text
- `last_name` - Text
- `phone` - Text
- `appointment_date` - Date
- `appointment_time` - Time
- `data` - **JSONB** ← NEW! Stores all additional information
- `created_at` - Timestamp
- `updated_at` - Timestamp

## ❓ Still Having Issues?

Check the Supabase logs:
```bash
supabase functions logs create-checkout-session --follow
```

Or contact support with the error message from the logs.

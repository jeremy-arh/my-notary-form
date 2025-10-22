# Messaging System & Client Dashboard Setup Guide

Complete guide to set up the messaging system, client dashboard with magic link authentication, and SendGrid email notifications.

## Table of Contents
1. [Database Migration](#1-database-migration)
2. [Supabase Auth Configuration](#2-supabase-auth-configuration)
3. [SendGrid Configuration](#3-sendgrid-configuration)
4. [Supabase Edge Function](#4-supabase-edge-function)
5. [Testing](#5-testing)

---

## 1. Database Migration

### Step 1: Run the SQL Migration

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor**
4. Copy the content of `supabase-messaging-migration.sql`
5. Paste it and click **Run**

This will create:
- ✅ `client` table - Client accounts with magic link auth
- ✅ `admin_user` table - Admin/super admin accounts
- ✅ `message` table - Internal messaging system
- ✅ Updates to `submission` table (adds `client_id` and `notary_id`)
- ✅ RLS policies for all tables
- ✅ Helper functions for unread messages

### Step 2: Verify Tables

Run this query to verify all tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('client', 'admin_user', 'message', 'submission');
```

You should see 4 rows returned.

### Step 3: Create First Admin User

1. Go to **Authentication** > **Users** in Supabase Dashboard
2. Click **Add User** > **Create new user**
3. Enter your admin email and password
4. Copy the User ID from the users list
5. Go to **SQL Editor** and run:

```sql
INSERT INTO admin_user (user_id, first_name, last_name, email, role)
VALUES (
  'YOUR_USER_ID_HERE', -- Replace with actual user ID
  'Admin',
  'User',
  'admin@example.com', -- Your email
  'super_admin'
);
```

---

## 2. Supabase Auth Configuration

### Step 1: Enable Email Auth

1. Go to **Authentication** > **Providers** in Supabase Dashboard
2. Make sure **Email** is enabled
3. Toggle **Enable Email Confirmations** to **OFF** (for magic links, we don't need confirmations)

### Step 2: Configure Magic Links

1. Still in **Authentication** > **Providers**
2. Scroll to **Email Auth** settings
3. Set **Mailer** to **Supabase** (or your custom SMTP if you have one)
4. Magic links are enabled by default for `signInWithOtp`

### Step 3: Set Redirect URLs

1. Go to **Authentication** > **URL Configuration**
2. Add these Site URLs:
   ```
   http://localhost:5173
   http://localhost:5175
   ```
3. Add these Redirect URLs:
   ```
   http://localhost:5175/auth/callback
   http://localhost:5175/dashboard
   ```

### Step 4: Customize Email Template (Optional)

1. Go to **Authentication** > **Email Templates**
2. Select **Magic Link**
3. Customize the template with your branding:

```html
<h2>Your Magic Link</h2>
<p>Click the link below to sign in to your notary dashboard:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>This link expires in 1 hour.</p>
```

---

## 3. SendGrid Configuration

### Step 1: Create SendGrid Account

1. Go to https://sendgrid.com/
2. Sign up for a free account (100 emails/day free)
3. Verify your email address

### Step 2: Create API Key

1. Go to **Settings** > **API Keys**
2. Click **Create API Key**
3. Name: `Notary Platform Messaging`
4. Permissions: **Full Access** (or **Mail Send** only)
5. Click **Create & View**
6. **Copy the API key** (you won't see it again!)

### Step 3: Verify Sender Identity

1. Go to **Settings** > **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in your details:
   - From Name: `Notary Platform`
   - From Email: `noreply@yourdomain.com` (or your email)
   - Reply To: Your support email
4. Check your email and verify

### Step 4: Add API Key to Supabase

1. Go to Supabase Dashboard > **Project Settings** > **Vault**
2. Click **New Secret**
3. Name: `SENDGRID_API_KEY`
4. Secret: Paste your SendGrid API key
5. Click **Save**

---

## 4. Supabase Edge Function

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Initialize Supabase in Project

```bash
cd /path/to/my-notary-form
supabase init
```

### Step 4: Link to Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Find your project ref in: Supabase Dashboard > **Project Settings** > **General**

### Step 5: Create Edge Function

```bash
supabase functions new send-message-notification
```

### Step 6: Install Dependencies

Create `supabase/functions/send-message-notification/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')!
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'

serve(async (req) => {
  try {
    const { message_id } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get message details
    const { data: message, error: messageError } = await supabaseClient
      .from('message')
      .select(`
        *,
        submission:submission_id (
          id,
          client:client_id (first_name, last_name, email),
          notary:notary_id (first_name, last_name, email)
        )
      `)
      .eq('message_id', message_id)
      .single()

    if (messageError) throw messageError

    // Determine recipient
    let recipientEmail = ''
    let recipientName = ''
    let senderName = ''

    if (message.sender_type === 'client') {
      // Client sent message → notify notary
      recipientEmail = message.submission.notary.email
      recipientName = `${message.submission.notary.first_name} ${message.submission.notary.last_name}`
      senderName = `${message.submission.client.first_name} ${message.submission.client.last_name}`
    } else if (message.sender_type === 'notary') {
      // Notary sent message → notify client
      recipientEmail = message.submission.client.email
      recipientName = `${message.submission.client.first_name} ${message.submission.client.last_name}`
      senderName = `${message.submission.notary.first_name} ${message.submission.notary.last_name}`
    } else {
      // Admin sent message → notify both client and notary
      // For simplicity, we'll skip admin messages in this version
      return new Response(JSON.stringify({ message: 'Admin message - no notification sent' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Dashboard URL based on recipient type
    const dashboardUrl = message.sender_type === 'client'
      ? `http://localhost:5174/submissions` // Notary dashboard
      : `http://localhost:5175/dashboard` // Client dashboard

    // Send email via SendGrid
    const emailData = {
      personalizations: [
        {
          to: [{ email: recipientEmail, name: recipientName }],
          subject: 'New message regarding your notary request',
        },
      ],
      from: {
        email: 'noreply@yourdomain.com', // Replace with your verified sender
        name: 'Notary Platform',
      },
      content: [
        {
          type: 'text/html',
          value: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">New Message</h2>
              <p>Hello ${recipientName},</p>
              <p>You have received a new message from <strong>${senderName}</strong>:</p>
              <blockquote style="background: #f3f4f6; padding: 20px; border-left: 4px solid #000; margin: 20px 0; border-radius: 4px;">
                ${message.content}
              </blockquote>
              <a href="${dashboardUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">
                View Message
              </a>
              <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          `,
        },
      ],
    }

    const sendGridResponse = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    })

    if (!sendGridResponse.ok) {
      throw new Error(`SendGrid error: ${sendGridResponse.status}`)
    }

    // Mark email as sent
    await supabaseClient
      .from('message')
      .update({
        email_sent: true,
        email_sent_at: new Date().toISOString(),
      })
      .eq('message_id', message_id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```

### Step 7: Deploy Edge Function

```bash
supabase functions deploy send-message-notification --no-verify-jwt
```

### Step 8: Create Database Trigger

Go to Supabase Dashboard > **SQL Editor** and run:

```sql
-- Create function to call Edge Function
CREATE OR REPLACE FUNCTION notify_message_recipient()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
BEGIN
  -- Get Edge Function URL (replace with your actual project URL)
  function_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-message-notification';

  -- Call Edge Function asynchronously
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'role'
    ),
    body := jsonb_build_object('message_id', NEW.message_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS on_message_insert_notify ON message;
CREATE TRIGGER on_message_insert_notify
  AFTER INSERT ON message
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_recipient();
```

---

## 5. Testing

### Test 1: Database Tables

```sql
-- Check if tables exist
SELECT COUNT(*) FROM client;
SELECT COUNT(*) FROM admin_user;
SELECT COUNT(*) FROM message;
```

### Test 2: Magic Link Authentication

1. Go to your form at http://localhost:5173
2. Fill in personal information
3. Submit the form
4. Check your email for the magic link
5. Click the link - should redirect to http://localhost:5175/dashboard

### Test 3: Messaging & Email Notifications

1. Create a test submission with a client
2. Assign a notary to the submission (admin panel)
3. Send a message from client dashboard
4. Check notary email - should receive notification
5. Check `message` table - `email_sent` should be `true`

### Test 4: RLS Policies

```sql
-- Test as client: should only see own messages
SET request.jwt.claims = '{"sub": "CLIENT_USER_ID"}';
SELECT * FROM message;

-- Test as notary: should only see messages for their submissions
SET request.jwt.claims = '{"sub": "NOTARY_USER_ID"}';
SELECT * FROM message;

-- Test as admin: should see all messages
SET request.jwt.claims = '{"sub": "ADMIN_USER_ID"}';
SELECT * FROM message;
```

---

## Troubleshooting

### Magic Link Not Sent
- Check Supabase Auth logs: **Authentication** > **Logs**
- Verify email provider is configured
- Check spam folder

### SendGrid Email Not Received
- Verify SendGrid API key is correct
- Check SendGrid Activity: **Email API** > **Activity**
- Verify sender email is authenticated
- Check recipient is not in suppression list

### Edge Function Errors
- Check function logs: `supabase functions logs send-message-notification`
- Verify SENDGRID_API_KEY is set in Supabase Vault
- Test function manually: `supabase functions invoke send-message-notification --data '{"message_id": "test-id"}'`

### RLS Policy Issues
- Verify user is authenticated
- Check user ID matches in respective table (client/notary/admin_user)
- Test queries in SQL Editor with proper JWT claims

---

## Next Steps

After completing this setup:

1. ✅ Database is ready with client, admin, and messaging tables
2. ✅ Magic link authentication is configured
3. ✅ SendGrid email notifications are set up
4. ✅ Edge function triggers on new messages

You can now proceed to:
- Modify the form to create client accounts
- Build the Client Dashboard (port 5175)
- Add messaging UI to Notary Dashboard
- Build the Admin Dashboard (port 5176)

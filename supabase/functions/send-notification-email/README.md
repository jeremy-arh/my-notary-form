# Send Notification Email Edge Function

This Edge Function sends email notifications to clients and notaries using SendGrid.

## Setup

### 1. Environment Variables

Add these secrets to Supabase Vault (Settings > Vault):

- `SENDGRID_API_KEY` - Your SendGrid API key
- `SENDGRID_TEMPLATE_ID` - (Optional) Your SendGrid dynamic template ID
- `SENDGRID_FROM_EMAIL` - (Optional) From email address (default: support@mynotary.io)
- `SENDGRID_FROM_NAME` - (Optional) From name (default: MY NOTARY)
- `CLIENT_DASHBOARD_URL` - (Optional) Client dashboard URL (default: https://client.mynotary.io)
- `NOTARY_DASHBOARD_URL` - (Optional) Notary dashboard URL (default: https://notary.mynotary.io)
- `ADMIN_DASHBOARD_URL` - (Optional) Admin dashboard URL (default: https://admin.mynotary.io)

### 2. Deploy Function

```bash
supabase functions deploy send-notification-email
```

### 3. Create Database Function

Run this SQL in Supabase SQL Editor:

```sql
-- Function to send notification email via Edge Function
CREATE OR REPLACE FUNCTION public.send_notification_email(notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  function_url TEXT;
  response_status INT;
  response_body TEXT;
BEGIN
  -- Get Edge Function URL
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification-email';
  
  -- If supabase_url is not set, construct from project ref
  IF function_url IS NULL OR function_url = '/functions/v1/send-notification-email' THEN
    -- You need to set this to your actual Supabase project URL
    function_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-notification-email';
  END IF;

  -- Call Edge Function using http extension
  SELECT status, content INTO response_status, response_body
  FROM http((
    'POST',
    function_url,
    ARRAY[
      http_header('Content-Type', 'application/json'),
      http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true))
    ],
    'application/json',
    json_build_object('notification_id', notification_id)::text
  )::http_request);

  -- Log response (optional)
  RAISE NOTICE 'Email send response: % - %', response_status, response_body;
END;
$$;
```

### 4. Modify create_notification Function

Update the `create_notification` function to automatically send emails:

```sql
-- Modify create_notification to send email
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_user_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT,
  p_type VARCHAR(50) DEFAULT 'info',
  p_action_type VARCHAR(100) DEFAULT NULL,
  p_action_data JSONB DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_created_by_type VARCHAR(50) DEFAULT NULL,
  p_send_email BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    user_type,
    title,
    message,
    type,
    action_type,
    action_data,
    created_by,
    created_by_type
  )
  VALUES (
    p_user_id,
    p_user_type,
    p_title,
    p_message,
    p_type,
    p_action_type,
    p_action_data,
    p_created_by,
    p_created_by_type
  )
  RETURNING id INTO notification_id;
  
  -- Send email if requested (skip for admin users)
  IF p_send_email AND p_user_type != 'admin' THEN
    -- Use pg_net extension or http extension to call Edge Function asynchronously
    -- For now, we'll use a trigger-based approach
    PERFORM public.send_notification_email(notification_id);
  END IF;
  
  RETURN notification_id;
END;
$$;
```

### 5. Alternative: Use Database Trigger

Instead of modifying the function, you can use a trigger:

```sql
-- Function to trigger email sending after notification is created
CREATE OR REPLACE FUNCTION public.trigger_send_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Skip email for admin users
  IF NEW.user_type != 'admin' THEN
    -- Call Edge Function asynchronously
    PERFORM public.send_notification_email(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_notification_created_send_email ON public.notifications;
CREATE TRIGGER on_notification_created_send_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.user_type != 'admin')
  EXECUTE FUNCTION public.trigger_send_notification_email();
```

## SendGrid Template Setup

### Option 1: Use Dynamic Template (Recommended)

1. Go to SendGrid Dashboard > **Email API** > **Dynamic Templates**
2. Click **Create a Dynamic Template**
3. Add a version and design your template
4. Use these dynamic data variables:
   - `{{notification_title}}`
   - `{{notification_message}}`
   - `{{notification_type}}`
   - `{{user_name}}`
   - `{{action_url}}`
   - `{{dashboard_url}}`
   - `{{submission_id}}`
   - `{{file_name}}`

5. Copy the Template ID and add it to Supabase Vault as `SENDGRID_TEMPLATE_ID`

### Option 2: Use Plain HTML (Fallback)

If no template ID is provided, the function will use a plain HTML email template.

## Testing

Test the function:

```bash
supabase functions invoke send-notification-email \
  --data '{"notification_id": "your-notification-id"}'
```

## Error Handling

The function handles these errors:
- Missing notification_id
- Notification not found
- User email not found
- SendGrid API errors
- Missing environment variables

Check logs:
```bash
supabase functions logs send-notification-email
```


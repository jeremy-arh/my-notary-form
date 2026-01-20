-- Note: This function uses http extension for synchronous HTTP calls
-- If http extension is not available, you may need to enable it:
-- CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Function to manually trigger an abandoned cart email sequence for a specific submission
-- Usage: SELECT trigger_abandoned_cart_sequence('SUBMISSION_ID', 'h+1');
--        SELECT trigger_abandoned_cart_sequence('SUBMISSION_ID', 'j+1');
--        etc.
-- Note: This function sends emails IMMEDIATELY (synchronously)

CREATE OR REPLACE FUNCTION public.trigger_abandoned_cart_sequence(
  p_submission_id UUID,
  p_sequence_step TEXT DEFAULT 'h+1'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission RECORD;
  v_email_type TEXT;
  v_subject TEXT;
  v_recipient_name TEXT;
  v_first_name TEXT;
  v_project_ref TEXT;
  v_service_role_key TEXT;
  v_api_url TEXT;
  v_existing_email UUID;
  v_response http_response;
  v_response_body JSONB;
BEGIN
  -- Validate sequence step
  IF p_sequence_step NOT IN ('h+1', 'j+1', 'j+3', 'j+7', 'j+10', 'j+15', 'j+30') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Invalid sequence step: %s. Must be one of: h+1, j+1, j+3, j+7, j+10, j+15, j+30', p_sequence_step)
    );
  END IF;

  -- Get submission details
  SELECT 
    id,
    email,
    first_name,
    last_name,
    status,
    created_at
  INTO v_submission
  FROM submission
  WHERE id = p_submission_id;

  -- Check if submission exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Submission %s not found', p_submission_id)
    );
  END IF;

  -- Check if submission has email
  IF v_submission.email IS NULL OR v_submission.email = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Submission %s has no email address', p_submission_id)
    );
  END IF;

  -- Check if submission has correct status (optional check, can be forced)
  IF v_submission.status != 'pending_payment' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Submission %s status is %s, not pending_payment. Use force_trigger_abandoned_cart_sequence() to force.', p_submission_id, v_submission.status),
      'current_status', v_submission.status
    );
  END IF;

  -- Check if email was already sent
  SELECT id INTO v_existing_email
  FROM email_sent
  WHERE submission_id = p_submission_id
    AND email_type = format('abandoned_cart_%s', p_sequence_step)
  LIMIT 1;

  IF v_existing_email IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Email %s already sent for submission %s', p_sequence_step, p_submission_id),
      'email_sent_id', v_existing_email
    );
  END IF;

  -- Set email type and subject based on sequence step
  v_email_type := format('abandoned_cart_%s', p_sequence_step);
  
  -- Map sequence steps to subjects
  v_subject := CASE p_sequence_step
    WHEN 'h+1' THEN 'Vous avez oublié quelque chose...'
    WHEN 'j+1' THEN 'Votre demande de notarisation vous attend'
    WHEN 'j+3' THEN 'Ne manquez pas votre demande de notarisation'
    WHEN 'j+7' THEN 'Dernière chance pour compléter votre demande'
    WHEN 'j+10' THEN 'Votre demande de notarisation expire bientôt'
    WHEN 'j+15' THEN 'Rappel : Votre demande de notarisation'
    WHEN 'j+30' THEN 'Dernier rappel pour votre demande'
    ELSE 'Rappel de votre demande'
  END;

  -- Get recipient name
  v_first_name := COALESCE(v_submission.first_name, 'there');
  v_recipient_name := COALESCE(v_submission.first_name, 'Client');

  -- Get environment variables (from Supabase secrets or current_setting)
  -- Note: Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with actual values
  v_project_ref := current_setting('app.settings.project_ref', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- Build API URL
  IF v_project_ref IS NULL OR v_project_ref = '' THEN
    -- Default fallback - user should replace this
    v_api_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-transactional-email';
  ELSE
    v_api_url := 'https://' || v_project_ref || '.supabase.co/functions/v1/send-transactional-email';
  END IF;

  -- If service_role_key is not set, use placeholder (user should replace)
  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    v_service_role_key := 'YOUR_SERVICE_ROLE_KEY';
  END IF;

  -- Call Edge Function via http extension (SYNCHRONOUS HTTP request)
  -- This waits for the response before continuing
  SELECT * INTO v_response
  FROM http((
    'POST',
    v_api_url,
    ARRAY[
      http_header('Content-Type', 'application/json'),
      http_header('Authorization', 'Bearer ' || v_service_role_key),
      http_header('apikey', v_service_role_key)
    ],
    'application/json',
    jsonb_build_object(
      'email_type', v_email_type,
      'recipient_email', v_submission.email,
      'recipient_name', v_recipient_name,
      'recipient_type', 'client',
      'data', jsonb_build_object(
        'submission_id', p_submission_id,
        'contact', jsonb_build_object(
          'PRENOM', v_first_name
        )
      )
    )::text
  )::http_request);

  -- Parse response body
  BEGIN
    v_response_body := v_response.content::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_response_body := jsonb_build_object('raw_response', v_response.content);
  END;

  -- Check if call was successful
  IF v_response.status = 200 AND (v_response_body->>'success')::boolean = true THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', format('Email %s sent successfully', p_sequence_step),
      'submission_id', p_submission_id,
      'email', v_submission.email,
      'sequence_step', p_sequence_step,
      'subject', v_subject,
      'http_status', v_response.status,
      'response', v_response_body
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_response_body->>'error', format('HTTP %s: %s', v_response.status, v_response.content)),
      'submission_id', p_submission_id,
      'http_status', v_response.status,
      'response', v_response_body
    );
  END IF;
END;
$$;

-- Function to force trigger a sequence (ignores status check)
-- Note: This function sends emails IMMEDIATELY (synchronously)
CREATE OR REPLACE FUNCTION public.force_trigger_abandoned_cart_sequence(
  p_submission_id UUID,
  p_sequence_step TEXT DEFAULT 'h+1'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission RECORD;
  v_email_type TEXT;
  v_subject TEXT;
  v_recipient_name TEXT;
  v_first_name TEXT;
  v_project_ref TEXT;
  v_service_role_key TEXT;
  v_api_url TEXT;
  v_response http_response;
  v_response_body JSONB;
BEGIN
  -- Validate sequence step
  IF p_sequence_step NOT IN ('h+1', 'j+1', 'j+3', 'j+7', 'j+10', 'j+15', 'j+30') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Invalid sequence step: %s. Must be one of: h+1, j+1, j+3, j+7, j+10, j+15, j+30', p_sequence_step)
    );
  END IF;

  -- Get submission details
  SELECT 
    id,
    email,
    first_name,
    last_name,
    status,
    created_at
  INTO v_submission
  FROM submission
  WHERE id = p_submission_id;

  -- Check if submission exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Submission %s not found', p_submission_id)
    );
  END IF;

  -- Check if submission has email
  IF v_submission.email IS NULL OR v_submission.email = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Submission %s has no email address', p_submission_id)
    );
  END IF;

  -- Set email type and subject
  v_email_type := format('abandoned_cart_%s', p_sequence_step);
  
  v_subject := CASE p_sequence_step
    WHEN 'h+1' THEN 'Vous avez oublié quelque chose...'
    WHEN 'j+1' THEN 'Votre demande de notarisation vous attend'
    WHEN 'j+3' THEN 'Ne manquez pas votre demande de notarisation'
    WHEN 'j+7' THEN 'Dernière chance pour compléter votre demande'
    WHEN 'j+10' THEN 'Votre demande de notarisation expire bientôt'
    WHEN 'j+15' THEN 'Rappel : Votre demande de notarisation'
    WHEN 'j+30' THEN 'Dernier rappel pour votre demande'
    ELSE 'Rappel de votre demande'
  END;

  v_first_name := COALESCE(v_submission.first_name, 'there');
  v_recipient_name := COALESCE(v_submission.first_name, 'Client');

  -- Get environment variables
  v_project_ref := current_setting('app.settings.project_ref', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  IF v_project_ref IS NULL OR v_project_ref = '' THEN
    v_api_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-transactional-email';
  ELSE
    v_api_url := 'https://' || v_project_ref || '.supabase.co/functions/v1/send-transactional-email';
  END IF;

  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    v_service_role_key := 'YOUR_SERVICE_ROLE_KEY';
  END IF;

  -- Call Edge Function via http extension (SYNCHRONOUS HTTP request)
  SELECT * INTO v_response
  FROM http((
    'POST',
    v_api_url,
    ARRAY[
      http_header('Content-Type', 'application/json'),
      http_header('Authorization', 'Bearer ' || v_service_role_key),
      http_header('apikey', v_service_role_key)
    ],
    'application/json',
    jsonb_build_object(
      'email_type', v_email_type,
      'recipient_email', v_submission.email,
      'recipient_name', v_recipient_name,
      'recipient_type', 'client',
      'data', jsonb_build_object(
        'submission_id', p_submission_id,
        'contact', jsonb_build_object(
          'PRENOM', v_first_name
        )
      )
    )::text
  )::http_request);

  -- Parse response body
  BEGIN
    v_response_body := v_response.content::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_response_body := jsonb_build_object('raw_response', v_response.content);
  END;

  -- Check if call was successful
  IF v_response.status = 200 AND (v_response_body->>'success')::boolean = true THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', format('Email %s sent successfully (FORCED)', p_sequence_step),
      'submission_id', p_submission_id,
      'email', v_submission.email,
      'sequence_step', p_sequence_step,
      'subject', v_subject,
      'current_status', v_submission.status,
      'http_status', v_response.status,
      'response', v_response_body
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_response_body->>'error', format('HTTP %s: %s', v_response.status, v_response.content)),
      'submission_id', p_submission_id,
      'http_status', v_response.status,
      'response', v_response_body
    );
  END IF;
END;
$$;

-- Add comments
COMMENT ON FUNCTION public.trigger_abandoned_cart_sequence(UUID, TEXT) IS 
'Triggers an abandoned cart email sequence for a specific submission. Validates submission status and checks if email was already sent. Sends email IMMEDIATELY (synchronously).';

COMMENT ON FUNCTION public.force_trigger_abandoned_cart_sequence(UUID, TEXT) IS 
'Forces an abandoned cart email sequence for a specific submission. Ignores status check and existing email check. Sends email IMMEDIATELY (synchronously). Use for testing.';

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendGridEvent {
  email: string
  timestamp: number
  event: string // 'processed', 'delivered', 'open', 'click', 'bounce', 'dropped', 'spam_report', 'unsubscribe', 'group_unsubscribe', 'group_resubscribe'
  sg_event_id: string
  sg_message_id: string
  reason?: string
  status?: string
  response?: string
  attempt?: string
  url?: string
  useragent?: string
  ip?: string
  url_offset?: {
    index: number
    type: string
  }
  asm_group_id?: number
  category?: string[]
  newsletter?: {
    newsletter_id: string
    newsletter_user_list_id: string
  }
  unique_arg?: {
    submission_id?: string
    email_type?: string
    [key: string]: any
  }
  marketing_campaign_id?: string
  marketing_campaign_name?: string
  marketing_campaign_version?: string
  marketing_campaign_split_id?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Note: This function accepts requests WITHOUT Supabase authentication
    // SendGrid webhooks don't include Supabase auth headers
    // For security, we can optionally verify a secret token in the URL
    // Example webhook URL: https://.../sendgrid-webhook?token=YOUR_SECRET_TOKEN
    const url = new URL(req.url)
    const webhookToken = url.searchParams.get('token')
    const expectedToken = Deno.env.get('SENDGRID_WEBHOOK_TOKEN')
    
    // Optional: If token is configured, verify it (for extra security)
    // If SENDGRID_WEBHOOK_TOKEN is not set, the function will accept all requests
    if (expectedToken) {
      if (webhookToken !== expectedToken) {
        console.error('❌ [SendGrid Webhook] Invalid or missing webhook token')
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('✅ [SendGrid Webhook] Token verified')
    } else {
      console.log('⚠️ [SendGrid Webhook] No token configured - accepting all requests')
    }
    
    console.log('📧 [SendGrid Webhook] Request received')
    console.log('📧 [SendGrid Webhook] Request method:', req.method)
    console.log('📧 [SendGrid Webhook] Request URL:', req.url)
    
    // Log request headers
    console.log('📧 [SendGrid Webhook] Request headers:', Object.fromEntries(req.headers.entries()))
    
    // Get the raw body to log it
    const rawBody = await req.text()
    console.log('📧 [SendGrid Webhook] Request body (raw):', rawBody)
    
    // Parse the body as JSON
    let events: SendGridEvent[]
    try {
      events = JSON.parse(rawBody)
      console.log('📧 [SendGrid Webhook] Request body (parsed):', JSON.stringify(events, null, 2))
    } catch (parseError) {
      console.error('❌ [SendGrid Webhook] Error parsing JSON body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [SendGrid Webhook] Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (!Array.isArray(events)) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload. Expected an array of events.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📧 [SendGrid Webhook] Received ${events.length} event(s)`)

    const results = {
      processed: 0,
      errors: [] as string[],
    }

    // Process each event
    for (const event of events) {
      try {
        const {
          email,
          timestamp,
          event: eventType,
          sg_event_id,
          sg_message_id,
          reason,
          status,
          response,
          attempt,
          url,
          useragent,
          ip,
          url_offset,
          asm_group_id,
          category,
          newsletter,
          unique_arg,
          marketing_campaign_id,
          marketing_campaign_name,
          marketing_campaign_version,
          marketing_campaign_split_id,
        } = event

        // Extract submission_id and email_type from unique_arg (set when sending email)
        // unique_arg contains custom_args passed when sending the email
        const submissionId = unique_arg?.submission_id || null
        const emailType = unique_arg?.email_type || null
        const notificationId = unique_arg?.notification_id || null

        // Insert event into database
        const { error: insertError } = await supabase
          .from('email_events')
          .insert({
            email: email,
            event_type: eventType,
            timestamp: new Date(timestamp * 1000).toISOString(),
            sg_event_id: sg_event_id,
            sg_message_id: sg_message_id,
            submission_id: submissionId,
            email_type: emailType,
            reason: reason || null,
            status: status || null,
            response: response || null,
            attempt: attempt || null,
            url: url || null,
            useragent: useragent || null,
            ip: ip || null,
            url_offset_index: url_offset?.index || null,
            url_offset_type: url_offset?.type || null,
            asm_group_id: asm_group_id || null,
            category: category || null,
            newsletter_id: newsletter?.newsletter_id || null,
            newsletter_user_list_id: newsletter?.newsletter_user_list_id || null,
            marketing_campaign_id: marketing_campaign_id || null,
            marketing_campaign_name: marketing_campaign_name || null,
            marketing_campaign_version: marketing_campaign_version || null,
            marketing_campaign_split_id: marketing_campaign_split_id || null,
            raw_event: event, // Store full event for debugging
          })

        if (insertError) {
          console.error(`❌ [SendGrid Webhook] Error inserting event ${sg_event_id}:`, insertError)
          results.errors.push(`Error inserting event ${sg_event_id}: ${insertError.message}`)
          continue
        }

        results.processed++
        console.log(`✅ [SendGrid Webhook] Processed event: ${eventType} for ${email} (submission: ${submissionId || 'N/A'})`)

        // Update email_sent table with event status
        if (sg_message_id) {
          console.log(`📧 [SendGrid Webhook] Attempting to update email_sent with sg_message_id: ${sg_message_id}`)
          
          const updateData: any = {}
          
          if (eventType === 'delivered') {
            updateData.delivered_at = new Date(timestamp * 1000).toISOString()
          } else if (eventType === 'open') {
            updateData.opened_at = new Date(timestamp * 1000).toISOString()
          } else if (eventType === 'click') {
            updateData.clicked_at = new Date(timestamp * 1000).toISOString()
            updateData.clicked_url = url || null
          } else if (eventType === 'bounce') {
            updateData.bounced_at = new Date(timestamp * 1000).toISOString()
            updateData.bounce_reason = reason || null
          } else if (eventType === 'dropped') {
            updateData.dropped_at = new Date(timestamp * 1000).toISOString()
            updateData.drop_reason = reason || null
          } else if (eventType === 'spamreport') {
            updateData.spam_reported_at = new Date(timestamp * 1000).toISOString()
          } else if (eventType === 'unsubscribe' || eventType === 'group_unsubscribe') {
            updateData.unsubscribed_at = new Date(timestamp * 1000).toISOString()
          }

          if (Object.keys(updateData).length > 0) {
            console.log(`📧 [SendGrid Webhook] Update data:`, JSON.stringify(updateData, null, 2))
            
            // Extract base sg_message_id (before any suffix like .recvd-canary-...)
            const baseSgMessageId = sg_message_id.split('.')[0]
            console.log(`📧 [SendGrid Webhook] Base sg_message_id (without suffix): ${baseSgMessageId}`)
            
            // First, try exact match
            let { data: existingEmail, error: checkError } = await supabase
              .from('email_sent')
              .select('id, email, sg_message_id, clicked_at, opened_at, delivered_at')
              .eq('sg_message_id', sg_message_id)
              .maybeSingle()
            
            // If not found, try with base sg_message_id (without suffix)
            if (!existingEmail && baseSgMessageId !== sg_message_id) {
              console.log(`📧 [SendGrid Webhook] Trying with base sg_message_id: ${baseSgMessageId}`)
              const { data: emailByBaseId, error: baseCheckError } = await supabase
                .from('email_sent')
                .select('id, email, sg_message_id, clicked_at, opened_at, delivered_at')
                .eq('sg_message_id', baseSgMessageId)
                .maybeSingle()
              
              if (baseCheckError) {
                console.error(`❌ [SendGrid Webhook] Error checking with base sg_message_id:`, baseCheckError)
              } else if (emailByBaseId) {
                existingEmail = emailByBaseId
                console.log(`✅ [SendGrid Webhook] Found email with base sg_message_id`)
              }
            }
            
            // If still not found, try LIKE search (in case of partial matches)
            if (!existingEmail) {
              console.log(`📧 [SendGrid Webhook] Trying LIKE search with base sg_message_id`)
              const { data: emailByLike, error: likeError } = await supabase
                .from('email_sent')
                .select('id, email, sg_message_id, clicked_at, opened_at, delivered_at')
                .like('sg_message_id', `${baseSgMessageId}%`)
                .limit(1)
                .maybeSingle()
              
              if (likeError) {
                console.error(`❌ [SendGrid Webhook] Error with LIKE search:`, likeError)
              } else if (emailByLike) {
                existingEmail = emailByLike
                console.log(`✅ [SendGrid Webhook] Found email with LIKE search`)
              }
            }
            
            if (checkError) {
              console.error(`❌ [SendGrid Webhook] Error checking existing email:`, checkError)
            } else if (!existingEmail) {
              console.warn(`⚠️ [SendGrid Webhook] No email found with sg_message_id: ${sg_message_id} or ${baseSgMessageId}`)
              console.log(`📧 [SendGrid Webhook] Searching for email by submission_id: ${submissionId}`)
              
              // Try to find by submission_id if available
              if (submissionId) {
                const { data: emailBySubmission, error: subError } = await supabase
                  .from('email_sent')
                  .select('id, email, sg_message_id')
                  .eq('submission_id', submissionId)
                  .eq('email_type', emailType || 'abandoned_cart_h+1')
                  .order('sent_at', { ascending: false })
                  .limit(1)
                  .maybeSingle()
                
                if (subError) {
                  console.error(`❌ [SendGrid Webhook] Error searching by submission_id:`, subError)
                } else if (emailBySubmission) {
                  console.log(`📧 [SendGrid Webhook] Found email by submission_id:`, emailBySubmission)
                  // Update using the found email's sg_message_id or id
                  if (emailBySubmission.sg_message_id) {
                    const { error: updateError } = await supabase
                      .from('email_sent')
                      .update(updateData)
                      .eq('sg_message_id', emailBySubmission.sg_message_id)
                    
                    if (updateError) {
                      console.error(`❌ [SendGrid Webhook] Error updating email by sg_message_id:`, updateError)
                    } else {
                      console.log(`✅ [SendGrid Webhook] Successfully updated email by sg_message_id`)
                    }
                  } else {
                    const { error: updateError } = await supabase
                      .from('email_sent')
                      .update(updateData)
                      .eq('id', emailBySubmission.id)
                    
                    if (updateError) {
                      console.error(`❌ [SendGrid Webhook] Error updating email by id:`, updateError)
                    } else {
                      console.log(`✅ [SendGrid Webhook] Successfully updated email by id`)
                    }
                  }
                } else {
                  console.warn(`⚠️ [SendGrid Webhook] No email found with submission_id: ${submissionId}`)
                }
              }
            } else {
              console.log(`📧 [SendGrid Webhook] Found existing email:`, existingEmail)
              
              // Use the found email's id for update (more reliable than sg_message_id)
              const { data: updatedEmail, error: updateError } = await supabase
                .from('email_sent')
                .update(updateData)
                .eq('id', existingEmail.id)
                .select()
              
              if (updateError) {
                console.error(`❌ [SendGrid Webhook] Error updating email_sent:`, updateError)
                console.error(`❌ [SendGrid Webhook] Update error details:`, JSON.stringify(updateError, null, 2))
              } else {
                console.log(`✅ [SendGrid Webhook] Successfully updated email_sent:`, JSON.stringify(updatedEmail, null, 2))
              }
            }
          } else {
            console.log(`📧 [SendGrid Webhook] No update data for event type: ${eventType}`)
          }
        } else {
          console.warn(`⚠️ [SendGrid Webhook] No sg_message_id provided, skipping email_sent update`)
        }

        // Note: All email tracking (including abandoned cart) is done via email_sent table
        // The email_sent table is updated above with all event statuses
      } catch (eventError: any) {
        console.error(`❌ [SendGrid Webhook] Error processing event:`, eventError)
        results.errors.push(`Error processing event: ${eventError.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.processed,
        errors: results.errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [SendGrid Webhook] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

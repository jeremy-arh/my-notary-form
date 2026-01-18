import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Email sequence configuration
const EMAIL_SEQUENCES = [
  { step: 'h+1', delayHours: 1, subject: 'Your certification is waiting' },
  { step: 'j+1', delayHours: 24, subject: 'A question about your certification?' },
  { step: 'j+3', delayHours: 72, subject: 'Last chance for your certification' },
  { step: 'j+7', delayHours: 168, subject: 'Still need your document certified?' },
  { step: 'j+10', delayHours: 240, subject: 'Why thousands trust My Notary' },
  { step: 'j+15', delayHours: 360, subject: 'Can I help you with anything?' },
  { step: 'j+30', delayHours: 720, subject: "We're here when you need us" },
]

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const results = {
      processed: 0,
      sent: 0,
      errors: [] as string[],
    }

    // Process each email sequence step
    for (const sequence of EMAIL_SEQUENCES) {
      try {
        // Calculate the time threshold for this sequence
        const thresholdTime = new Date(now.getTime() - sequence.delayHours * 60 * 60 * 1000)

        // Find form_draft entries that:
        // 1. Were created before the threshold time
        // 2. Have an email address
        // 3. Haven't received this specific email yet
        // 4. Haven't been paid (no submission with status != 'pending_payment' for this email)
        // 5. Don't have a client account (client not created yet)
        // Note: form_draft entries are never deleted, but emails are not sent if client has paid

        const { data: drafts, error: draftsError } = await supabase
          .from('form_draft')
          .select('id, email, first_name, last_name, created_at')
          .not('email', 'is', null)
          .lt('created_at', thresholdTime.toISOString())
          .order('created_at', { ascending: true })

        if (draftsError) {
          console.error(`❌ Error fetching drafts for ${sequence.step}:`, draftsError)
          results.errors.push(`Error fetching drafts for ${sequence.step}: ${draftsError.message}`)
          continue
        }

        if (!drafts || drafts.length === 0) {
          console.log(`ℹ️ No drafts found for ${sequence.step}`)
          continue
        }

        console.log(`📧 Found ${drafts.length} drafts for ${sequence.step}`)

        // Filter drafts that haven't received this email yet
        for (const draft of drafts) {
          try {
            // Check if this draft has already received this email
            const { data: existingEmail } = await supabase
              .from('email_sequence_tracking')
              .select('id')
              .eq('form_draft_id', draft.id)
              .eq('sequence_step', sequence.step)
              .maybeSingle()

            if (existingEmail) {
              console.log(`⏭️ Draft ${draft.id} already received ${sequence.step}, skipping`)
              continue
            }

            // Check if this email has been used to create a paid submission or if a client account exists
            // If there's a submission with this email and status != 'pending_payment', skip
            // Also check if a client account exists for this email (client created and paid)
            const { data: paidSubmission } = await supabase
              .from('submission')
              .select('id, status, client_id')
              .eq('email', draft.email)
              .neq('status', 'pending_payment')
              .maybeSingle()

            // Also check if a client account exists (client created)
            const { data: existingClient } = await supabase
              .from('client')
              .select('id')
              .eq('email', draft.email)
              .maybeSingle()

            // Skip if there's a paid submission OR if a client account exists (client created and likely paid)
            if (paidSubmission || existingClient) {
              const reasons = []
              if (paidSubmission) reasons.push('paid submission')
              if (existingClient) reasons.push('client account')
              console.log(`⏭️ Draft ${draft.id} - Email ${draft.email} has ${reasons.join(' and ')}, skipping (no email sent, draft kept in database)`)
              // Skip sending email but keep the draft in the database
              continue
            }

            results.processed++

            // Get the first name for personalization
            const firstName = draft.first_name || 'there'
            const recipientName = draft.first_name || 'Client'

            // Send the email via send-transactional-email function
            const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
              body: {
                email_type: `abandoned_cart_${sequence.step}`,
                recipient_email: draft.email,
                recipient_name: recipientName,
                recipient_type: 'client',
                data: {
                  contact: {
                    PRENOM: firstName,
                  },
                },
              },
            })

            if (emailError) {
              console.error(`❌ Error sending email for draft ${draft.id}:`, emailError)
              results.errors.push(`Error sending email for draft ${draft.id}: ${emailError.message}`)
              continue
            }

            // Record that this email was sent
            const { error: trackingError } = await supabase
              .from('email_sequence_tracking')
              .insert({
                form_draft_id: draft.id,
                email: draft.email,
                first_name: draft.first_name,
                last_name: draft.last_name,
                sequence_step: sequence.step,
                email_subject: sequence.subject,
              })

            if (trackingError) {
              console.error(`❌ Error tracking email for draft ${draft.id}:`, trackingError)
              results.errors.push(`Error tracking email for draft ${draft.id}: ${trackingError.message}`)
            } else {
              results.sent++
              console.log(`✅ Sent ${sequence.step} email to ${draft.email}`)
            }
          } catch (draftError: any) {
            console.error(`❌ Error processing draft ${draft.id}:`, draftError)
            results.errors.push(`Error processing draft ${draft.id}: ${draftError.message}`)
          }
        }
      } catch (sequenceError: any) {
        console.error(`❌ Error processing sequence ${sequence.step}:`, sequenceError)
        results.errors.push(`Error processing sequence ${sequence.step}: ${sequenceError.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ Error in send-abandoned-cart-emails:', error)
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

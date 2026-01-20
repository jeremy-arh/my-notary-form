import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Email sequences for abandoned cart
// Sequence is triggered when a submission has status 'pending_payment'
// Sequence stops automatically if status changes (submission no longer matches query)
const EMAIL_SEQUENCES = [
  { step: 'h+1', delayHours: 1, subject: 'Vous avez oublié quelque chose...' },
  { step: 'j+1', delayHours: 24, subject: 'Votre demande de notarisation vous attend' },
  { step: 'j+3', delayHours: 72, subject: 'Ne manquez pas votre demande de notarisation' },
  { step: 'j+7', delayHours: 168, subject: 'Dernière chance pour compléter votre demande' },
  { step: 'j+10', delayHours: 240, subject: 'Votre demande de notarisation expire bientôt' },
  { step: 'j+15', delayHours: 360, subject: 'Rappel : Votre demande de notarisation' },
  { step: 'j+30', delayHours: 720, subject: 'Dernier rappel pour votre demande' },
]

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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

        // Find submissions that:
        // 1. Have status 'pending_payment' (sequence is triggered when status is pending_payment)
        // 2. Were created before the threshold time (timing based on created_at)
        // 3. Have an email address
        // 4. Haven't received this specific email yet
        // Note: If status changes from 'pending_payment', the submission will no longer match
        // this query, effectively stopping the sequence

        const { data: submissions, error: submissionsError } = await supabase
          .from('submission')
          .select('id, email, first_name, last_name, created_at, data, status')
          .eq('status', 'pending_payment')
          .not('email', 'is', null)
          .lt('created_at', thresholdTime.toISOString())
          .order('created_at', { ascending: true })

        if (submissionsError) {
          console.error(`❌ Error fetching submissions for ${sequence.step}:`, submissionsError)
          results.errors.push(`Error fetching submissions for ${sequence.step}: ${submissionsError.message}`)
          continue
        }

        if (!submissions || submissions.length === 0) {
          console.log(`ℹ️ No submissions found for ${sequence.step}`)
          continue
        }

        console.log(`📧 Found ${submissions.length} submissions for ${sequence.step}`)

        // Filter submissions that haven't received this email yet
        for (const submission of submissions) {
          try {
            // Get session_id from submission data
            const sessionId = submission.data?.session_id || null
            const submissionId = submission.id

            // Check if this submission has already received this email
            // Use email_sent table to check if this email type was already sent
            const { data: existingEmail } = await supabase
              .from('email_sent')
              .select('id')
              .eq('submission_id', submissionId)
              .eq('email_type', `abandoned_cart_${sequence.step}`)
              .maybeSingle()

            if (existingEmail) {
              console.log(`⏭️ Submission ${submissionId} already received ${sequence.step}, skipping`)
              continue
            }

            // Double-check that the submission still has status 'pending_payment'
            // If status changed, the sequence should stop (this is a safety check)
            if (submission.status !== 'pending_payment') {
              console.log(`⏭️ Submission ${submissionId} status changed from 'pending_payment' to '${submission.status}', stopping sequence`)
              continue
            }

            results.processed++

            // Get the first name for personalization
            const firstName = submission.first_name || 'there'
            const recipientName = submission.first_name || 'Client'

            // Send the email via send-transactional-email function
            const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
              body: {
                email_type: `abandoned_cart_${sequence.step}`,
                recipient_email: submission.email,
                recipient_name: recipientName,
                recipient_type: 'client',
                data: {
                  submission_id: submissionId, // Pass submission_id for webhook tracking
                  contact: {
                    PRENOM: firstName,
                  },
                },
              },
            })

            if (emailError) {
              console.error(`❌ Error sending email for submission ${submissionId}:`, emailError)
              results.errors.push(`Error sending email for submission ${submissionId}: ${emailError.message}`)
              continue
            }

            // Email is already logged in email_sent by send-transactional-email function
            // No need to log again here - just increment sent counter
            results.sent++
            console.log(`✅ Sent ${sequence.step} email to ${submission.email}`)
          } catch (submissionError: any) {
            console.error(`❌ Error processing submission ${submission.id}:`, submissionError)
            results.errors.push(`Error processing submission ${submission.id}: ${submissionError.message}`)
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

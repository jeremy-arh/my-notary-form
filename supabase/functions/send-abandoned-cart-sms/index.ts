import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SMS sequences for abandoned cart
// Sequence is triggered when a submission has status 'pending_payment'
// Sequence stops automatically if status changes (submission no longer matches query)
const SMS_SEQUENCES = [
  { step: 'j+1', delayHours: 24, sendHourStart: 18, sendHourEnd: 20 }, // J+1 between 18h-20h
  { step: 'j+3', delayHours: 72 }, // J+3 anytime
  { step: 'j+10', delayHours: 240 }, // J+10 anytime
]

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📱 [send-abandoned-cart-sms] Request received')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [send-abandoned-cart-sms] Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const currentHour = now.getHours()
    console.log('📱 [send-abandoned-cart-sms] Current time:', now.toISOString(), 'Current hour:', currentHour)
    
    const results = {
      processed: 0,
      sent: 0,
      errors: [] as string[],
    }

    // Process each SMS sequence step
    for (const sequence of SMS_SEQUENCES) {
      try {
        console.log(`📱 [send-abandoned-cart-sms] Processing sequence: ${sequence.step}`)
        
        // Check if we're in the right time window for this sequence
        if (sequence.sendHourStart !== undefined && sequence.sendHourEnd !== undefined) {
          console.log(`📱 [send-abandoned-cart-sms] Checking time window for ${sequence.step}: ${sequence.sendHourStart}h-${sequence.sendHourEnd}h (current: ${currentHour}h)`)
          if (currentHour < sequence.sendHourStart || currentHour >= sequence.sendHourEnd) {
            console.log(`⏭️ [send-abandoned-cart-sms] Skipping ${sequence.step} - current hour ${currentHour} is not in window ${sequence.sendHourStart}-${sequence.sendHourEnd}`)
            continue
          }
          console.log(`✅ [send-abandoned-cart-sms] Time window OK for ${sequence.step}`)
        }

        // Calculate the time threshold for this sequence
        const thresholdTime = new Date(now.getTime() - sequence.delayHours * 60 * 60 * 1000)
        console.log(`📱 [send-abandoned-cart-sms] Threshold time for ${sequence.step}: ${thresholdTime.toISOString()} (${sequence.delayHours} hours ago)`)

        // Find submissions that:
        // 1. Have status 'pending_payment'
        // 2. Were created before the threshold time
        // 3. Have a phone number
        // 4. Haven't received this specific SMS yet
        // Note: If status changes from 'pending_payment', the submission will no longer match

        const { data: submissions, error: submissionsError } = await supabase
          .from('submission')
          .select('id, phone, first_name, last_name, created_at, data, status')
          .eq('status', 'pending_payment')
          .not('phone', 'is', null)
          .neq('phone', '')
          .lt('created_at', thresholdTime.toISOString())
          .order('created_at', { ascending: true })

        if (submissionsError) {
          console.error(`❌ [send-abandoned-cart-sms] Error fetching submissions for ${sequence.step}:`, submissionsError)
          console.error(`❌ [send-abandoned-cart-sms] Error details:`, JSON.stringify(submissionsError, null, 2))
          results.errors.push(`Error fetching submissions for ${sequence.step}: ${submissionsError.message}`)
          continue
        }

        if (!submissions || submissions.length === 0) {
          console.log(`ℹ️ [send-abandoned-cart-sms] No submissions found for ${sequence.step}`)
          continue
        }

        console.log(`📱 [send-abandoned-cart-sms] Found ${submissions.length} submissions for ${sequence.step}`)

        // Filter submissions that haven't received this SMS yet
        for (const submission of submissions) {
          try {
            const submissionId = submission.id
            const phoneNumber = submission.phone

            console.log(`📱 [send-abandoned-cart-sms] Processing submission ${submissionId} for ${sequence.step}`)
            console.log(`📱 [send-abandoned-cart-sms] Submission details:`, {
              id: submissionId,
              phone: phoneNumber,
              first_name: submission.first_name,
              created_at: submission.created_at,
              status: submission.status,
            })

            if (!phoneNumber || phoneNumber.trim() === '') {
              console.log(`⏭️ [send-abandoned-cart-sms] Submission ${submissionId} has no phone number, skipping`)
              continue
            }

            // Check if this submission has already received this SMS
            console.log(`📱 [send-abandoned-cart-sms] Checking if SMS ${sequence.step} already sent for submission ${submissionId}`)
            const { data: existingSMS, error: checkError } = await supabase
              .from('sms_sent')
              .select('id, sent_at')
              .eq('submission_id', submissionId)
              .eq('sms_type', `abandoned_cart_${sequence.step}`)
              .maybeSingle()

            if (checkError) {
              console.error(`❌ [send-abandoned-cart-sms] Error checking existing SMS:`, checkError)
            }

            if (existingSMS) {
              console.log(`⏭️ [send-abandoned-cart-sms] Submission ${submissionId} already received ${sequence.step} SMS at ${existingSMS.sent_at}, skipping`)
              continue
            }

            // Double-check that the submission still has status 'pending_payment'
            if (submission.status !== 'pending_payment') {
              console.log(`⏭️ [send-abandoned-cart-sms] Submission ${submissionId} status changed from 'pending_payment' to '${submission.status}', stopping sequence`)
              continue
            }

            results.processed++
            console.log(`📱 [send-abandoned-cart-sms] Submission ${submissionId} is eligible for ${sequence.step} SMS`)

            // Get the first name for personalization
            const firstName = submission.first_name || 'there'
            const recipientName = submission.first_name || 'Client'

            console.log(`📱 [send-abandoned-cart-sms] Sending SMS ${sequence.step} to ${phoneNumber} for submission ${submissionId}`)
            console.log(`📱 [send-abandoned-cart-sms] Recipient name: ${recipientName}, First name: ${firstName}`)

            // Send the SMS via send-sms function
            const { data: smsResponse, error: smsError } = await supabase.functions.invoke('send-sms', {
              body: {
                sms_type: `abandoned_cart_${sequence.step}`,
                phone_number: phoneNumber,
                recipient_name: recipientName,
                recipient_type: 'client',
                data: {
                  submission_id: submissionId,
                  contact: {
                    PRENOM: firstName,
                  },
                },
              },
            })

            if (smsError) {
              console.error(`❌ [send-abandoned-cart-sms] Error sending SMS for submission ${submissionId}:`, smsError)
              console.error(`❌ [send-abandoned-cart-sms] Error details:`, JSON.stringify(smsError, null, 2))
              results.errors.push(`Error sending SMS for submission ${submissionId}: ${smsError.message}`)
              continue
            }

            console.log(`✅ [send-abandoned-cart-sms] SMS ${sequence.step} sent successfully for submission ${submissionId}`)
            if (smsResponse) {
              console.log(`📱 [send-abandoned-cart-sms] SMS response:`, JSON.stringify(smsResponse, null, 2))
            }

            // SMS is already logged in sms_sent by send-sms function
            results.sent++
            console.log(`✅ [send-abandoned-cart-sms] Sent ${sequence.step} SMS to ${phoneNumber} (submission: ${submissionId})`)
          } catch (submissionError: any) {
            console.error(`❌ [send-abandoned-cart-sms] Error processing submission ${submission.id}:`, submissionError)
            console.error(`❌ [send-abandoned-cart-sms] Error type:`, submissionError?.constructor?.name)
            console.error(`❌ [send-abandoned-cart-sms] Error message:`, submissionError?.message)
            console.error(`❌ [send-abandoned-cart-sms] Error stack:`, submissionError?.stack)
            results.errors.push(`Error processing submission ${submission.id}: ${submissionError.message}`)
          }
        }
      } catch (sequenceError: any) {
        console.error(`❌ [send-abandoned-cart-sms] Error processing sequence ${sequence.step}:`, sequenceError)
        console.error(`❌ [send-abandoned-cart-sms] Error type:`, sequenceError?.constructor?.name)
        console.error(`❌ [send-abandoned-cart-sms] Error message:`, sequenceError?.message)
        console.error(`❌ [send-abandoned-cart-sms] Error stack:`, sequenceError?.stack)
        results.errors.push(`Error processing sequence ${sequence.step}: ${sequenceError.message}`)
      }
    }

    console.log('📱 [send-abandoned-cart-sms] Final results:', JSON.stringify(results, null, 2))
    console.log(`✅ [send-abandoned-cart-sms] Function completed: ${results.processed} processed, ${results.sent} sent, ${results.errors.length} errors`)

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
    console.error('❌ [send-abandoned-cart-sms] Exception caught!')
    console.error('❌ [send-abandoned-cart-sms] Error type:', error?.constructor?.name)
    console.error('❌ [send-abandoned-cart-sms] Error message:', error?.message)
    console.error('❌ [send-abandoned-cart-sms] Error stack:', error?.stack)
    console.error('❌ [send-abandoned-cart-sms] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

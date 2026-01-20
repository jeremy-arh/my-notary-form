import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSRequest {
  sms_type: 'abandoned_cart_j+1' | 'abandoned_cart_j+3' | 'abandoned_cart_j+10' | 'notification'
  phone_number: string
  recipient_name: string
  recipient_type: 'client' | 'notary'
  message?: string // Optional, will be generated from template if not provided
  data: {
    submission_id?: string
    contact?: {
      PRENOM?: string
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📱 [send-sms] Request received')
    const smsRequest: SMSRequest = await req.json()
    console.log('📱 [send-sms] SMS request parsed:', {
      sms_type: smsRequest.sms_type,
      phone_number: smsRequest.phone_number,
      recipient_name: smsRequest.recipient_name,
      recipient_type: smsRequest.recipient_type,
      has_submission_id: !!smsRequest.data?.submission_id,
      submission_id: smsRequest.data?.submission_id,
    })

    if (!smsRequest.sms_type || !smsRequest.phone_number || !smsRequest.recipient_name) {
      console.error('❌ [send-sms] Missing required fields')
      return new Response(
        JSON.stringify({ error: 'sms_type, phone_number, and recipient_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get environment variables
    console.log('📱 [send-sms] Loading environment variables...')
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('❌ [send-sms] Twilio credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Twilio credentials are not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('✅ [send-sms] Environment variables loaded')

    // Generate SMS message from template if not provided
    let message = smsRequest.message
    if (!message) {
      console.log('📱 [send-sms] Generating SMS message from template...')
      const firstName = smsRequest.data?.contact?.PRENOM || smsRequest.recipient_name || 'there'
      
      switch (smsRequest.sms_type) {
        case 'abandoned_cart_j+1':
          message = `Hi ${firstName}, it's Jeremy from My Notary. I saw you didn't finish your certification. If you need any help, reach out at support@mynotary.io or continue here: app.mynotary.io/form`
          break
        case 'abandoned_cart_j+3':
          message = `${firstName}, just checking in. Your certification only takes a couple minutes to complete. If you're stuck, let me know at support@mynotary.io. Continue here: app.mynotary.io/form`
          break
        case 'abandoned_cart_j+10':
          message = `Hi ${firstName}, still need your document certified? No rush. If you have any questions, I'm here to help at support@mynotary.io. Jeremy from My Notary`
          break
        default:
          message = smsRequest.message || 'Hello from My Notary'
      }
    }
    
    console.log('✅ [send-sms] SMS message generated:', message)

    // Send SMS via Twilio
    console.log('📱 [send-sms] Sending SMS via Twilio...')
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
    
    const formData = new URLSearchParams()
    formData.append('From', TWILIO_PHONE_NUMBER)
    formData.append('To', smsRequest.phone_number)
    formData.append('Body', message)

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    console.log('📱 [send-sms] Twilio response status:', twilioResponse.status)
    console.log('📱 [send-sms] Twilio response headers:', Object.fromEntries(twilioResponse.headers.entries()))

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text()
      console.error('❌ [send-sms] Twilio error:', twilioResponse.status, errorText)
      console.error('❌ [send-sms] Twilio error details:', JSON.stringify(errorText, null, 2))
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send SMS', 
          details: errorText,
          status: twilioResponse.status 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const twilioData = await twilioResponse.json()
    const twilioMessageSid = twilioData.sid || null
    console.log('✅ [send-sms] SMS sent successfully via Twilio')
    console.log('📱 [send-sms] Twilio response data:', JSON.stringify(twilioData, null, 2))
    console.log('📱 [send-sms] Twilio Message SID:', twilioMessageSid)

    // Log SMS in sms_sent table
    try {
      console.log('📱 [send-sms] Starting SMS logging process...')
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ [send-sms] Missing Supabase environment variables')
        throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set')
      }
      
      console.log('📱 [send-sms] Creating Supabase client...')
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Get client_id from submission if submission_id is provided
      let clientId = null
      if (smsRequest.data?.submission_id) {
        console.log('📱 [send-sms] Fetching client_id for submission:', smsRequest.data.submission_id)
        const { data: submission, error: submissionError } = await supabase
          .from('submission')
          .select('client_id')
          .eq('id', smsRequest.data.submission_id)
          .single()
        
        if (submissionError) {
          console.error('❌ [send-sms] Error fetching submission:', submissionError)
        } else {
          console.log('📱 [send-sms] Submission data:', submission)
          if (submission?.client_id) {
            clientId = submission.client_id
            console.log('📱 [send-sms] Found client_id:', clientId)
          } else {
            console.log('📱 [send-sms] No client_id found for submission')
          }
        }
      } else {
        console.log('📱 [send-sms] No submission_id provided, skipping client_id lookup')
      }

      // Prepare insert data
      const insertData = {
        phone_number: smsRequest.phone_number,
        recipient_name: smsRequest.recipient_name,
        recipient_type: smsRequest.recipient_type,
        sms_type: smsRequest.sms_type,
        message: message,
        submission_id: smsRequest.data?.submission_id || null,
        client_id: clientId,
        twilio_message_sid: twilioMessageSid,
      }
      
      console.log('📱 [send-sms] Insert data prepared:', JSON.stringify(insertData, null, 2))
      console.log('📱 [send-sms] Attempting to insert into sms_sent table...')

      // Insert SMS record
      const { data: insertData_result, error: insertError } = await supabase
        .from('sms_sent')
        .insert(insertData)
        .select()

      if (insertError) {
        console.error('❌ [send-sms] Error inserting into sms_sent table!')
        console.error('❌ [send-sms] Error details:', JSON.stringify(insertError, null, 2))
        console.error('❌ [send-sms] Error code:', insertError.code)
        console.error('❌ [send-sms] Error message:', insertError.message)
        console.error('❌ [send-sms] Error hint:', insertError.hint)
        console.error('❌ [send-sms] Insert data that failed:', JSON.stringify(insertData, null, 2))
        // Don't fail the SMS send if logging fails
      } else {
        console.log('✅ [send-sms] Successfully inserted SMS into sms_sent table!')
        console.log('✅ [send-sms] Insert result:', JSON.stringify(insertData_result, null, 2))
      }
    } catch (logError: any) {
      console.error('❌ [send-sms] Exception during SMS logging!')
      console.error('❌ [send-sms] Error type:', logError?.constructor?.name)
      console.error('❌ [send-sms] Error message:', logError?.message)
      console.error('❌ [send-sms] Error stack:', logError?.stack)
      console.error('❌ [send-sms] Full error object:', JSON.stringify(logError, Object.getOwnPropertyNames(logError), 2))
      // Don't fail the SMS send if logging fails
    }

    console.log('✅ [send-sms] SMS sent successfully to:', smsRequest.phone_number, 'Type:', smsRequest.sms_type, 'Message SID:', twilioMessageSid)
    console.log('✅ [send-sms] Function completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS sent successfully',
        recipient: smsRequest.phone_number,
        sms_type: smsRequest.sms_type,
        twilio_message_sid: twilioMessageSid
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ [send-sms] Exception caught!')
    console.error('❌ [send-sms] Error type:', error?.constructor?.name)
    console.error('❌ [send-sms] Error message:', error?.message)
    console.error('❌ [send-sms] Error stack:', error?.stack)
    console.error('❌ [send-sms] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

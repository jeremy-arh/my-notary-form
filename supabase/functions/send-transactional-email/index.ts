import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}


interface EmailRequest {
  email_type: 'payment_success' | 'payment_failed' | 'notarized_file_uploaded' | 'message_received' | 'submission_updated' | 'abandoned_cart_h+1' | 'abandoned_cart_j+1' | 'abandoned_cart_j+3' | 'abandoned_cart_j+7' | 'abandoned_cart_j+10' | 'abandoned_cart_j+15' | 'abandoned_cart_j+30'
  recipient_email: string
  recipient_name: string
  recipient_type: 'client' | 'notary'
  data: {
    submission_id?: string
    submission_number?: string
    file_name?: string
    file_url?: string
    message_preview?: string
    invoice_url?: string
    invoice_pdf?: string // Base64 encoded PDF
    payment_amount?: number
    payment_date?: string
    error_message?: string
    updated_fields?: string
    notification_id?: string
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
    console.log('📧 [send-transactional-email] Request received')
    const emailRequest: EmailRequest = await req.json()
    console.log('📧 [send-transactional-email] Email request parsed:', {
      email_type: emailRequest.email_type,
      recipient_email: emailRequest.recipient_email,
      recipient_name: emailRequest.recipient_name,
      recipient_type: emailRequest.recipient_type,
      has_submission_id: !!emailRequest.data?.submission_id,
      submission_id: emailRequest.data?.submission_id,
    })

    if (!emailRequest.email_type || !emailRequest.recipient_email || !emailRequest.recipient_name) {
      console.error('❌ [send-transactional-email] Missing required fields')
      return new Response(
        JSON.stringify({ error: 'email_type, recipient_email, and recipient_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get environment variables
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
    const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') || 'support@mynotary.io'
    const SENDGRID_FROM_NAME = Deno.env.get('SENDGRID_FROM_NAME') || 'MY NOTARY'
    const CLIENT_DASHBOARD_URL = Deno.env.get('CLIENT_DASHBOARD_URL') || 'https://client.mynotary.io'
    const NOTARY_DASHBOARD_URL = Deno.env.get('NOTARY_DASHBOARD_URL') || 'https://notary.mynotary.io'

    if (!SENDGRID_API_KEY) {
      console.error('❌ [send-transactional-email] SENDGRID_API_KEY is not set')
      return new Response(
        JSON.stringify({ error: 'SendGrid API key is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('✅ [send-transactional-email] Environment variables loaded')

    // Determine dashboard URL
    const dashboardUrl = emailRequest.recipient_type === 'notary' ? NOTARY_DASHBOARD_URL : CLIENT_DASHBOARD_URL

    // Generate email HTML based on type
    console.log('📧 [send-transactional-email] Generating email template...')
    const { subject, html, attachments } = generateEmailTemplate(emailRequest, dashboardUrl)
    console.log('✅ [send-transactional-email] Email template generated, subject:', subject)

    // Prepare SendGrid payload
    console.log('📧 [send-transactional-email] Preparing SendGrid payload...')
    const sendGridPayload: any = {
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: SENDGRID_FROM_NAME,
      },
      personalizations: [
        {
          to: [{ email: emailRequest.recipient_email, name: emailRequest.recipient_name }],
          subject: subject,
          // Add custom_args to track submission_id and email_type in webhooks
          custom_args: {
            submission_id: emailRequest.data?.submission_id || '',
            email_type: emailRequest.email_type || '',
          },
        },
      ],
      content: [
        {
          type: 'text/html',
          value: html,
        },
      ],
      // Enable click tracking and open tracking
      tracking_settings: {
        click_tracking: {
          enable: true,
          enable_text: true,
        },
        open_tracking: {
          enable: true,
        },
      },
    }

    // Add attachments if invoice PDF is provided
    if (attachments && attachments.length > 0) {
      sendGridPayload.attachments = attachments
    }

    // Send email via SendGrid
    console.log('📧 [send-transactional-email] Sending email via SendGrid...')
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendGridPayload),
    })

    console.log('📧 [send-transactional-email] SendGrid response status:', sendGridResponse.status)

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text()
      console.error('❌ [send-transactional-email] SendGrid error:', sendGridResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email', 
          details: errorText,
          status: sendGridResponse.status 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract SendGrid message ID from response headers
    const sgMessageId = sendGridResponse.headers.get('x-message-id') || null
    console.log('📧 [Email Logging] SendGrid message ID:', sgMessageId)

    // Log email in email_sent table
    try {
      console.log('📧 [Email Logging] Starting email logging process...')
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      
      if (!supabaseUrl) {
        console.error('❌ [Email Logging] SUPABASE_URL is not set!')
        throw new Error('SUPABASE_URL environment variable is not set')
      }
      
      if (!supabaseServiceKey) {
        console.error('❌ [Email Logging] SUPABASE_SERVICE_ROLE_KEY is not set!')
        throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
      }
      
      console.log('📧 [Email Logging] Creating Supabase client...')
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Get client_id from submission if submission_id is provided
      let clientId = null
      if (emailRequest.data?.submission_id) {
        console.log('📧 [Email Logging] Fetching client_id for submission:', emailRequest.data.submission_id)
        const { data: submission, error: submissionError } = await supabase
          .from('submission')
          .select('client_id')
          .eq('id', emailRequest.data.submission_id)
          .single()
        
        if (submissionError) {
          console.error('❌ [Email Logging] Error fetching submission:', submissionError)
        } else {
          console.log('📧 [Email Logging] Submission data:', submission)
          if (submission?.client_id) {
            clientId = submission.client_id
            console.log('📧 [Email Logging] Found client_id:', clientId)
          } else {
            console.log('📧 [Email Logging] No client_id found for submission')
          }
        }
      } else {
        console.log('📧 [Email Logging] No submission_id provided, skipping client_id lookup')
      }

      // Prepare insert data
      const insertData = {
        email: emailRequest.recipient_email,
        recipient_name: emailRequest.recipient_name,
        recipient_type: emailRequest.recipient_type,
        email_type: emailRequest.email_type,
        subject: subject,
        html_content: html, // Store HTML content
        submission_id: emailRequest.data?.submission_id || null,
        client_id: clientId,
        notification_id: emailRequest.data?.notification_id || null,
        sg_message_id: sgMessageId,
      }
      
      console.log('📧 [Email Logging] Insert data prepared:', JSON.stringify(insertData, null, 2))
      console.log('📧 [Email Logging] Attempting to insert into email_sent table...')

      // Insert email record
      const { data: insertData_result, error: insertError } = await supabase
        .from('email_sent')
        .insert(insertData)
        .select()

      if (insertError) {
        console.error('❌ [Email Logging] Error inserting into email_sent table!')
        console.error('❌ [Email Logging] Error details:', JSON.stringify(insertError, null, 2))
        console.error('❌ [Email Logging] Error code:', insertError.code)
        console.error('❌ [Email Logging] Error message:', insertError.message)
        console.error('❌ [Email Logging] Error hint:', insertError.hint)
        console.error('❌ [Email Logging] Insert data that failed:', JSON.stringify(insertData, null, 2))
        // Don't fail the email send if logging fails
      } else {
        console.log('✅ [Email Logging] Successfully inserted email into email_sent table!')
        console.log('✅ [Email Logging] Insert result:', JSON.stringify(insertData_result, null, 2))
      }
    } catch (logError: any) {
      console.error('❌ [Email Logging] Exception during email logging!')
      console.error('❌ [Email Logging] Error type:', logError?.constructor?.name)
      console.error('❌ [Email Logging] Error message:', logError?.message)
      console.error('❌ [Email Logging] Error stack:', logError?.stack)
      console.error('❌ [Email Logging] Full error object:', JSON.stringify(logError, Object.getOwnPropertyNames(logError), 2))
      // Don't fail the email send if logging fails
    }

    console.log('✅ [send-transactional-email] Email sent successfully to:', emailRequest.recipient_email, 'Type:', emailRequest.email_type, 'Message ID:', sgMessageId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        recipient: emailRequest.recipient_email,
        email_type: emailRequest.email_type
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ [send-transactional-email] Exception caught!')
    console.error('❌ [send-transactional-email] Error type:', error?.constructor?.name)
    console.error('❌ [send-transactional-email] Error message:', error?.message)
    console.error('❌ [send-transactional-email] Error stack:', error?.stack)
    console.error('❌ [send-transactional-email] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateEmailTemplate(request: EmailRequest, dashboardUrl: string): { subject: string; html: string; attachments?: any[] } {
  const { email_type, recipient_name, data } = request
  let subject = ''
  let html = ''
  const attachments: any[] = []

  // Helper function to format amount
  const formatAmount = (amount: number | undefined): string => {
    if (!amount) return ''
    return `$${parseFloat(amount.toString()).toFixed(2)}`
  }

  // Generate template based on email type
  switch (email_type) {
    case 'payment_success':
      subject = 'Payment confirmed for your certification'
      const submissionNumber = data.submission_number || data.submission_id?.substring(0, 8) || ''
      const amount = formatAmount(data.payment_amount)
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Payment confirmed for your certification</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap');
    
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    table {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    @media only screen and (max-width: 620px) {
      .outer-wrapper {
        padding: 10px 8px !important;
      }
      .email-container {
        width: 100% !important;
        border-radius: 12px !important;
      }
      .header-cell {
        padding: 30px 20px 0 20px !important;
      }
      .content-cell {
        padding: 40px 20px 30px 20px !important;
      }
      .footer-cell {
        padding: 0 20px 25px 20px !important;
      }
      .cta-button {
        width: 100% !important;
      }
      .cta-link {
        padding: 14px 24px !important;
        font-size: 14px !important;
      }
      .body-text {
        font-size: 16px !important;
      }
      .logo-img {
        width: 110px !important;
      }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {
      font-family: Arial, sans-serif !important;
    }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F8F7F5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8F7F5; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <tr>
      <td align="center" class="outer-wrapper" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <tr>
            <td class="header-cell" style="padding: 50px 50px 0 50px; background-color: #ffffff;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" class="logo-img" style="width: 130px; max-width: 130px; height: auto; display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
            </td>
          </tr>
          
          <tr>
            <td class="content-cell" style="padding: 60px 50px 50px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hi ${recipient_name},
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Your payment for submission <strong style="color: #222222; font-weight: 600;">#${submissionNumber}</strong> has been confirmed.
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Amount paid: <strong style="color: #222222; font-weight: 600;">${amount}</strong>
              </p>
              <p class="body-text" style="margin: 0 0 50px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Your certification request is now being processed. You'll receive a notification once your certified document is ready.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button" style="width: 280px;">
                      <tr>
                        <td align="center" style="border-radius: 25px; background-color: #000000;">
                          <a href="${dashboardUrl}/submission/${data.submission_id}" class="cta-link" style="display: block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: 400; font-size: 15px; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                            View my submission →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p class="body-text" style="margin: 0; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                If you have any questions, simply reply to this email.
              </p>
            </td>
          </tr>
          
          <tr>
            <td class="footer-cell" style="padding: 0 50px 40px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="border-top: 1px solid #E5E5E5; padding: 0;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; font-size: 14px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                Best regards,<br>
                The My Notary Team
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <a href="https://mynotary.io" style="color: #000000; text-decoration: underline; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">mynotary.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      break

    case 'payment_failed':
      subject = `Payment failed for submission #${data.submission_number || data.submission_id?.substring(0, 8) || ''}`
      const submissionNumberFailed = data.submission_number || data.submission_id?.substring(0, 8) || ''
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Payment failed for your certification</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap');
    
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    table {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    @media only screen and (max-width: 620px) {
      .outer-wrapper {
        padding: 10px 8px !important;
      }
      .email-container {
        width: 100% !important;
        border-radius: 12px !important;
      }
      .header-cell {
        padding: 30px 20px 0 20px !important;
      }
      .content-cell {
        padding: 40px 20px 30px 20px !important;
      }
      .footer-cell {
        padding: 0 20px 25px 20px !important;
      }
      .cta-button {
        width: 100% !important;
      }
      .cta-link {
        padding: 14px 24px !important;
        font-size: 14px !important;
      }
      .body-text {
        font-size: 16px !important;
      }
      .logo-img {
        width: 110px !important;
      }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {
      font-family: Arial, sans-serif !important;
    }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F8F7F5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8F7F5; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <tr>
      <td align="center" class="outer-wrapper" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <tr>
            <td class="header-cell" style="padding: 50px 50px 0 50px; background-color: #ffffff;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" class="logo-img" style="width: 130px; max-width: 130px; height: auto; display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
            </td>
          </tr>
          
          <tr>
            <td class="content-cell" style="padding: 60px 50px 50px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hi ${recipient_name},
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Unfortunately, the payment for your submission <strong style="color: #222222; font-weight: 600;">#${submissionNumberFailed}</strong> could not be processed.
              </p>
              <p class="body-text" style="margin: 0 0 50px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Please try again using a different payment method or check with your bank. Your certification request will remain on hold until the payment is completed.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button" style="width: 280px;">
                      <tr>
                        <td align="center" style="border-radius: 25px; background-color: #000000;">
                          <a href="${dashboardUrl}/submission/${data.submission_id}" class="cta-link" style="display: block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: 400; font-size: 15px; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                            Retry payment →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p class="body-text" style="margin: 0; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                If you need assistance, simply reply to this email.
              </p>
            </td>
          </tr>
          
          <tr>
            <td class="footer-cell" style="padding: 0 50px 40px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="border-top: 1px solid #E5E5E5; padding: 0;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; font-size: 14px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                Best regards,<br>
                The My Notary Team
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <a href="https://mynotary.io" style="color: #000000; text-decoration: underline; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">mynotary.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      break

    case 'notarized_file_uploaded':
      subject = 'Your certified document is ready'
      const submissionNumberNotarized = data.submission_number || data.submission_id?.substring(0, 8) || ''
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your certified document is ready</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap');
    
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    table {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    @media only screen and (max-width: 620px) {
      .outer-wrapper {
        padding: 10px 8px !important;
      }
      .email-container {
        width: 100% !important;
        border-radius: 12px !important;
      }
      .header-cell {
        padding: 30px 20px 0 20px !important;
      }
      .content-cell {
        padding: 40px 20px 30px 20px !important;
      }
      .footer-cell {
        padding: 0 20px 25px 20px !important;
      }
      .cta-button {
        width: 100% !important;
      }
      .cta-link {
        padding: 14px 24px !important;
        font-size: 14px !important;
      }
      .body-text {
        font-size: 16px !important;
      }
      .logo-img {
        width: 110px !important;
      }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {
      font-family: Arial, sans-serif !important;
    }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F8F7F5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8F7F5; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <tr>
      <td align="center" class="outer-wrapper" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <tr>
            <td class="header-cell" style="padding: 50px 50px 0 50px; background-color: #ffffff;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" class="logo-img" style="width: 130px; max-width: 130px; height: auto; display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
            </td>
          </tr>
          
          <tr>
            <td class="content-cell" style="padding: 60px 50px 50px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hi ${recipient_name},
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Great news! Your certified document for submission <strong style="color: #222222; font-weight: 600;">#${submissionNumberNotarized}</strong> is now ready.
              </p>
              <p class="body-text" style="margin: 0 0 50px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                You can download your certified document directly from your dashboard. This document is officially recognised for administrative, banking, and legal purposes.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button" style="width: 280px;">
                      <tr>
                        <td align="center" style="border-radius: 25px; background-color: #000000;">
                          <a href="${dashboardUrl}/submission/${data.submission_id}?tab=notarized" class="cta-link" style="display: block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: 400; font-size: 15px; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                            Download my document →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p class="body-text" style="margin: 0; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Thank you for using My Notary. If you have any questions, simply reply to this email.
              </p>
            </td>
          </tr>
          
          <tr>
            <td class="footer-cell" style="padding: 0 50px 40px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="border-top: 1px solid #E5E5E5; padding: 0;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; font-size: 14px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                Best regards,<br>
                The My Notary Team
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <a href="https://mynotary.io" style="color: #000000; text-decoration: underline; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">mynotary.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      break

    case 'message_received':
      subject = 'New message regarding your certification'
      const submissionNumberMessage = data.submission_number || data.submission_id?.substring(0, 8) || ''
      const messagePreview = data.message_preview || ''
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>New message regarding your certification</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap');
    
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    table {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    @media only screen and (max-width: 620px) {
      .outer-wrapper {
        padding: 10px 8px !important;
      }
      .email-container {
        width: 100% !important;
        border-radius: 12px !important;
      }
      .header-cell {
        padding: 30px 20px 0 20px !important;
      }
      .content-cell {
        padding: 40px 20px 30px 20px !important;
      }
      .footer-cell {
        padding: 0 20px 25px 20px !important;
      }
      .cta-button {
        width: 100% !important;
      }
      .cta-link {
        padding: 14px 24px !important;
        font-size: 14px !important;
      }
      .body-text {
        font-size: 16px !important;
      }
      .logo-img {
        width: 110px !important;
      }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {
      font-family: Arial, sans-serif !important;
    }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F8F7F5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8F7F5; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <tr>
      <td align="center" class="outer-wrapper" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <tr>
            <td class="header-cell" style="padding: 50px 50px 0 50px; background-color: #ffffff;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" class="logo-img" style="width: 130px; max-width: 130px; height: auto; display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
            </td>
          </tr>
          
          <tr>
            <td class="content-cell" style="padding: 60px 50px 50px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hi ${recipient_name},
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                You have received a new message regarding submission <strong style="color: #222222; font-weight: 600;">#${submissionNumberMessage}</strong>.
              </p>
              <p class="body-text" style="margin: 0 0 30px; font-size: 17px; line-height: 1.7; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-style: italic; padding-left: 16px; border-left: 2px solid #E5E5E5;">
                "${messagePreview}"
              </p>
              <p class="body-text" style="margin: 0 0 50px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Please respond at your earliest convenience.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button" style="width: 280px;">
                      <tr>
                        <td align="center" style="border-radius: 25px; background-color: #000000;">
                          <a href="${dashboardUrl}/submission/${data.submission_id}" class="cta-link" style="display: block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: 400; font-size: 15px; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                            View conversation →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p class="body-text" style="margin: 0; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                If you have any questions, simply reply to this email.
              </p>
            </td>
          </tr>
          
          <tr>
            <td class="footer-cell" style="padding: 0 50px 40px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="border-top: 1px solid #E5E5E5; padding: 0;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; font-size: 14px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                Best regards,<br>
                The My Notary Team
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <a href="https://mynotary.io" style="color: #000000; text-decoration: underline; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">mynotary.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      break

    case 'submission_updated':
      subject = 'Your submission has been updated'
      const submissionNumberUpdated = data.submission_number || data.submission_id?.substring(0, 8) || ''
      const updatedFields = data.updated_fields || 'Various details'
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your submission has been updated</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap');
    
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    table {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    @media only screen and (max-width: 620px) {
      .outer-wrapper {
        padding: 10px 8px !important;
      }
      .email-container {
        width: 100% !important;
        border-radius: 12px !important;
      }
      .header-cell {
        padding: 30px 20px 0 20px !important;
      }
      .content-cell {
        padding: 40px 20px 30px 20px !important;
      }
      .footer-cell {
        padding: 0 20px 25px 20px !important;
      }
      .cta-button {
        width: 100% !important;
      }
      .cta-link {
        padding: 14px 24px !important;
        font-size: 14px !important;
      }
      .body-text {
        font-size: 16px !important;
      }
      .logo-img {
        width: 110px !important;
      }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {
      font-family: Arial, sans-serif !important;
    }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F8F7F5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8F7F5; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <tr>
      <td align="center" class="outer-wrapper" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <tr>
            <td class="header-cell" style="padding: 50px 50px 0 50px; background-color: #ffffff;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" class="logo-img" style="width: 130px; max-width: 130px; height: auto; display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
            </td>
          </tr>
          
          <tr>
            <td class="content-cell" style="padding: 60px 50px 50px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hi ${recipient_name},
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Your submission <strong style="color: #222222; font-weight: 600;">#${submissionNumberUpdated}</strong> has been updated.
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <strong style="color: #222222; font-weight: 600;">Updated fields:</strong> ${updatedFields}
              </p>
              <p class="body-text" style="margin: 0 0 50px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Please review the updated details in your dashboard.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button" style="width: 280px;">
                      <tr>
                        <td align="center" style="border-radius: 25px; background-color: #000000;">
                          <a href="${dashboardUrl}/submission/${data.submission_id}" class="cta-link" style="display: block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: 400; font-size: 15px; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                            View submission →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p class="body-text" style="margin: 0; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                If you have any questions, simply reply to this email.
              </p>
            </td>
          </tr>
          
          <tr>
            <td class="footer-cell" style="padding: 0 50px 40px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="border-top: 1px solid #E5E5E5; padding: 0;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; font-size: 14px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                Best regards,<br>
                The My Notary Team
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <a href="https://mynotary.io" style="color: #000000; text-decoration: underline; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">mynotary.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      break

    case 'abandoned_cart_h+1':
      subject = 'Your certification is waiting'
      const prenomH1 = data.contact?.PRENOM || recipient_name
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your certification is waiting</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap');
    
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    table {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    /* Mobile Styles */
    @media only screen and (max-width: 620px) {
      .outer-wrapper {
        padding: 10px 8px !important;
      }
      .email-container {
        width: 100% !important;
        border-radius: 12px !important;
      }
      .header-cell {
        padding: 30px 20px 0 20px !important;
      }
      .content-cell {
        padding: 40px 20px 30px 20px !important;
      }
      .footer-cell {
        padding: 0 20px 25px 20px !important;
      }
      .cta-button {
        width: 100% !important;
      }
      .cta-link {
        padding: 14px 24px !important;
        font-size: 14px !important;
      }
      .body-text {
        font-size: 16px !important;
      }
      .logo-img {
        width: 110px !important;
      }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {
      font-family: Arial, sans-serif !important;
    }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F8F7F5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8F7F5; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <tr>
      <td align="center" class="outer-wrapper" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <tr>
            <td class="header-cell" style="padding: 50px 50px 0 50px; background-color: #ffffff;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" class="logo-img" style="width: 130px; max-width: 130px; height: auto; display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
            </td>
          </tr>
          
          <tr>
            <td class="content-cell" style="padding: 60px 50px 50px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hi ${prenomH1},
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                You started a certification request on <strong style="color: #222222; font-weight: 600; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">mynotary.io</strong> but didn't complete it.
              </p>
              <p class="body-text" style="margin: 0 0 50px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Your documents are ready to be processed — just one step left to receive your certified document.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button" style="width: 280px;">
                      <tr>
                        <td align="center" style="border-radius: 25px; background-color: #000000;">
                          <a href="https://app.mynotary.io/form" class="cta-link" style="display: block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: 400; font-size: 15px; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                            Complete my request →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p class="body-text" style="margin: 0; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                If you have any questions, simply reply to this email.
              </p>
            </td>
          </tr>
          
          <tr>
            <td class="footer-cell" style="padding: 0 50px 40px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="border-top: 1px solid #E5E5E5; padding: 0;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; font-size: 14px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                Best regards,<br>
                The My Notary Team
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <a href="https://mynotary.io" style="color: #000000; text-decoration: underline; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">mynotary.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      break

    case 'abandoned_cart_j+1':
      subject = 'A question about your certification?'
      const prenomJ1 = data.contact?.PRENOM || recipient_name
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>A question about your certification?</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap');
    
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    table {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    /* Mobile Styles */
    @media only screen and (max-width: 620px) {
      .outer-wrapper {
        padding: 10px 8px !important;
      }
      .email-container {
        width: 100% !important;
        border-radius: 12px !important;
      }
      .header-cell {
        padding: 30px 20px 0 20px !important;
      }
      .content-cell {
        padding: 40px 20px 30px 20px !important;
      }
      .footer-cell {
        padding: 0 20px 25px 20px !important;
      }
      .cta-button {
        width: 100% !important;
      }
      .cta-link {
        padding: 14px 24px !important;
        font-size: 14px !important;
      }
      .body-text {
        font-size: 16px !important;
      }
      .logo-img {
        width: 110px !important;
      }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {
      font-family: Arial, sans-serif !important;
    }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F8F7F5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8F7F5; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <tr>
      <td align="center" class="outer-wrapper" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <tr>
            <td class="header-cell" style="padding: 50px 50px 0 50px; background-color: #ffffff;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" class="logo-img" style="width: 130px; max-width: 130px; height: auto; display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
            </td>
          </tr>
          
          <tr>
            <td class="content-cell" style="padding: 60px 50px 50px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hi ${prenomJ1},
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                I'm following up as your certification request hasn't been completed yet.
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Perhaps you have a question? Here are the most common ones:
              </p>
              
              <p class="body-text" style="margin: 0 0 10px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <strong style="color: #222222; font-weight: 600;">How long does it take?</strong><br>
                Your certified document is usually ready within 1 hour.
              </p>
              <p class="body-text" style="margin: 0 0 10px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <strong style="color: #222222; font-weight: 600;">Is it officially recognised?</strong><br>
                Yes, our certifications are valid for administrative, banking, and legal purposes.
              </p>
              <p class="body-text" style="margin: 0 0 50px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <strong style="color: #222222; font-weight: 600;">Is it 100% online?</strong><br>
                Absolutely, the entire process is done remotely.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button" style="width: 280px;">
                      <tr>
                        <td align="center" style="border-radius: 25px; background-color: #000000;">
                          <a href="https://app.mynotary.io/form" class="cta-link" style="display: block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: 400; font-size: 15px; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                            Complete my request →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p class="body-text" style="margin: 0; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Another question? Reply to this email, I'll get back to you personally.
              </p>
            </td>
          </tr>
          
          <tr>
            <td class="footer-cell" style="padding: 0 50px 40px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="border-top: 1px solid #E5E5E5; padding: 0;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; font-size: 14px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                Best regards,<br>
                Jeremy<br>
                Founder, My Notary
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <a href="https://mynotary.io" style="color: #000000; text-decoration: underline; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">mynotary.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      break

    case 'abandoned_cart_j+3':
      subject = 'Last chance for your certification'
      const prenomJ3 = data.contact?.PRENOM || recipient_name
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Last chance for your certification</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap');
    
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    table {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    /* Mobile Styles */
    @media only screen and (max-width: 620px) {
      .outer-wrapper {
        padding: 10px 8px !important;
      }
      .email-container {
        width: 100% !important;
        border-radius: 12px !important;
      }
      .header-cell {
        padding: 30px 20px 0 20px !important;
      }
      .content-cell {
        padding: 40px 20px 30px 20px !important;
      }
      .footer-cell {
        padding: 0 20px 25px 20px !important;
      }
      .cta-button {
        width: 100% !important;
      }
      .cta-link {
        padding: 14px 24px !important;
        font-size: 14px !important;
      }
      .body-text {
        font-size: 16px !important;
      }
      .logo-img {
        width: 110px !important;
      }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {
      font-family: Arial, sans-serif !important;
    }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F8F7F5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8F7F5; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <tr>
      <td align="center" class="outer-wrapper" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <tr>
            <td class="header-cell" style="padding: 50px 50px 0 50px; background-color: #ffffff;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" class="logo-img" style="width: 130px; max-width: 130px; height: auto; display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
            </td>
          </tr>
          
          <tr>
            <td class="content-cell" style="padding: 60px 50px 50px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hi ${prenomJ3},
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Your session on My Notary is about to expire.
              </p>
              <p class="body-text" style="margin: 0 0 50px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                If you still need to get your documents certified, now is the time to complete your request. After this, you'll need to start the process again from the beginning.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button" style="width: 280px;">
                      <tr>
                        <td align="center" style="border-radius: 25px; background-color: #000000;">
                          <a href="https://app.mynotary.io/form" class="cta-link" style="display: block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: 400; font-size: 15px; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                            Complete my certification →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p class="body-text" style="margin: 0; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                We remain at your disposal if you have any questions.
              </p>
            </td>
          </tr>
          
          <tr>
            <td class="footer-cell" style="padding: 0 50px 40px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="border-top: 1px solid #E5E5E5; padding: 0;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; font-size: 14px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                Best regards,<br>
                Jeremy
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <a href="https://mynotary.io" style="color: #000000; text-decoration: underline; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">mynotary.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      break

    case 'abandoned_cart_j+7':
      subject = 'Still need your document certified?'
      const prenomJ7 = data.contact?.PRENOM || recipient_name
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Still need your document certified?</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap');
    
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    table {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    /* Mobile Styles */
    @media only screen and (max-width: 620px) {
      .outer-wrapper {
        padding: 10px 8px !important;
      }
      .email-container {
        width: 100% !important;
        border-radius: 12px !important;
      }
      .header-cell {
        padding: 30px 20px 0 20px !important;
      }
      .content-cell {
        padding: 40px 20px 30px 20px !important;
      }
      .footer-cell {
        padding: 0 20px 25px 20px !important;
      }
      .cta-button {
        width: 100% !important;
      }
      .cta-link {
        padding: 14px 24px !important;
        font-size: 14px !important;
      }
      .body-text {
        font-size: 16px !important;
      }
      .logo-img {
        width: 110px !important;
      }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {
      font-family: Arial, sans-serif !important;
    }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F8F7F5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8F7F5; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <tr>
      <td align="center" class="outer-wrapper" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <tr>
            <td class="header-cell" style="padding: 50px 50px 0 50px; background-color: #ffffff;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" class="logo-img" style="width: 130px; max-width: 130px; height: auto; display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
            </td>
          </tr>
          
          <tr>
            <td class="content-cell" style="padding: 60px 50px 50px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hi ${prenomJ7},
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                A week ago, you started a certification request on My Notary. I wanted to check in — do you still need your document certified?
              </p>
              <p class="body-text" style="margin: 0 0 50px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                The process takes just a few minutes, and your certified document is typically ready within 1 hour — all done 100% online.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button" style="width: 280px;">
                      <tr>
                        <td align="center" style="border-radius: 25px; background-color: #000000;">
                          <a href="https://app.mynotary.io/form" class="cta-link" style="display: block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: 400; font-size: 15px; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                            Get my document certified →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p class="body-text" style="margin: 0; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                If you ran into any issues or have questions, just reply to this email.
              </p>
            </td>
          </tr>
          
          <tr>
            <td class="footer-cell" style="padding: 0 50px 40px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="border-top: 1px solid #E5E5E5; padding: 0;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; font-size: 14px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                Best regards,<br>
                Jeremy<br>
                Founder, My Notary
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <a href="https://mynotary.io" style="color: #000000; text-decoration: underline; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">mynotary.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      break

    case 'abandoned_cart_j+10':
      subject = 'Why thousands trust My Notary'
      const prenomJ10 = data.contact?.PRENOM || recipient_name
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Trusted by thousands across Europe</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap');
    
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    table {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    /* Mobile Styles */
    @media only screen and (max-width: 620px) {
      .outer-wrapper {
        padding: 10px 8px !important;
      }
      .email-container {
        width: 100% !important;
        border-radius: 12px !important;
      }
      .header-cell {
        padding: 30px 20px 0 20px !important;
      }
      .content-cell {
        padding: 40px 20px 30px 20px !important;
      }
      .footer-cell {
        padding: 0 20px 25px 20px !important;
      }
      .cta-button {
        width: 100% !important;
      }
      .cta-link {
        padding: 14px 24px !important;
        font-size: 14px !important;
      }
      .body-text {
        font-size: 16px !important;
      }
      .logo-img {
        width: 110px !important;
      }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {
      font-family: Arial, sans-serif !important;
    }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F8F7F5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8F7F5; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <tr>
      <td align="center" class="outer-wrapper" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <tr>
            <td class="header-cell" style="padding: 50px 50px 0 50px; background-color: #ffffff;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" class="logo-img" style="width: 130px; max-width: 130px; height: auto; display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
            </td>
          </tr>
          
          <tr>
            <td class="content-cell" style="padding: 60px 50px 50px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hi ${prenomJ10},
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                I noticed you haven't completed your certification yet. I understand — trusting an online service with important documents can feel uncertain.
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Here's what you should know about My Notary:
              </p>
              
              <p class="body-text" style="margin: 0 0 10px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <strong style="color: #222222; font-weight: 600;">✓ Certified notaries</strong><br>
                We work exclusively with licensed, certified notaries.
              </p>
              <p class="body-text" style="margin: 0 0 10px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <strong style="color: #222222; font-weight: 600;">✓ Legally recognised</strong><br>
                Our certifications are accepted for administrative, banking, and legal purposes.
              </p>
              <p class="body-text" style="margin: 0 0 50px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <strong style="color: #222222; font-weight: 600;">✓ Secure & confidential</strong><br>
                Your documents are encrypted and handled with the highest security standards.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button" style="width: 280px;">
                      <tr>
                        <td align="center" style="border-radius: 25px; background-color: #000000;">
                          <a href="https://app.mynotary.io/form" class="cta-link" style="display: block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: 400; font-size: 15px; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                            Complete my certification →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p class="body-text" style="margin: 0; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Still have doubts? I'm happy to answer any questions personally — just reply to this email.
              </p>
            </td>
          </tr>
          
          <tr>
            <td class="footer-cell" style="padding: 0 50px 40px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="border-top: 1px solid #E5E5E5; padding: 0;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; font-size: 14px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                Best regards,<br>
                Jeremy<br>
                Founder, My Notary
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <a href="https://mynotary.io" style="color: #000000; text-decoration: underline; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">mynotary.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      break

    case 'abandoned_cart_j+15':
      subject = 'Can I help you with anything?'
      const prenomJ15 = data.contact?.PRENOM || recipient_name
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Can I help you with anything?</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap');
    
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    table {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    /* Mobile Styles */
    @media only screen and (max-width: 620px) {
      .outer-wrapper {
        padding: 10px 8px !important;
      }
      .email-container {
        width: 100% !important;
        border-radius: 12px !important;
      }
      .header-cell {
        padding: 30px 20px 0 20px !important;
      }
      .content-cell {
        padding: 40px 20px 30px 20px !important;
      }
      .footer-cell {
        padding: 0 20px 25px 20px !important;
      }
      .cta-button {
        width: 100% !important;
      }
      .cta-link {
        padding: 14px 24px !important;
        font-size: 14px !important;
      }
      .body-text {
        font-size: 16px !important;
      }
      .logo-img {
        width: 110px !important;
      }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {
      font-family: Arial, sans-serif !important;
    }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F8F7F5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8F7F5; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <tr>
      <td align="center" class="outer-wrapper" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <tr>
            <td class="header-cell" style="padding: 50px 50px 0 50px; background-color: #ffffff;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" class="logo-img" style="width: 130px; max-width: 130px; height: auto; display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
            </td>
          </tr>
          
          <tr>
            <td class="content-cell" style="padding: 60px 50px 50px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hi ${prenomJ15},
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                It's been a couple of weeks since you started your certification request. I wanted to reach out personally to see if there's anything I can help with.
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                If you encountered any issues during the process, or if our service doesn't quite fit what you need, I'd genuinely appreciate your feedback. It helps us improve.
              </p>
              <p class="body-text" style="margin: 0 0 50px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                And if you still need your document certified, I'm here to make sure everything goes smoothly.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button" style="width: 280px;">
                      <tr>
                        <td align="center" style="border-radius: 25px; background-color: #000000;">
                          <a href="https://app.mynotary.io/form" class="cta-link" style="display: block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: 400; font-size: 15px; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                            Complete my certification →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p class="body-text" style="margin: 0; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Just hit reply — I read every email personally.
              </p>
            </td>
          </tr>
          
          <tr>
            <td class="footer-cell" style="padding: 0 50px 40px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="border-top: 1px solid #E5E5E5; padding: 0;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; font-size: 14px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                Best regards,<br>
                Jeremy<br>
                Founder, My Notary
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <a href="https://mynotary.io" style="color: #000000; text-decoration: underline; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">mynotary.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      break

    case 'abandoned_cart_j+30':
      subject = "We're here when you need us"
      const prenomJ30 = data.contact?.PRENOM || recipient_name
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>We're here when you need us</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap');
    
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    table {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    /* Mobile Styles */
    @media only screen and (max-width: 620px) {
      .outer-wrapper {
        padding: 10px 8px !important;
      }
      .email-container {
        width: 100% !important;
        border-radius: 12px !important;
      }
      .header-cell {
        padding: 30px 20px 0 20px !important;
      }
      .content-cell {
        padding: 40px 20px 30px 20px !important;
      }
      .footer-cell {
        padding: 0 20px 25px 20px !important;
      }
      .cta-button {
        width: 100% !important;
      }
      .cta-link {
        padding: 14px 24px !important;
        font-size: 14px !important;
      }
      .body-text {
        font-size: 16px !important;
      }
      .logo-img {
        width: 110px !important;
      }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {
      font-family: Arial, sans-serif !important;
    }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F8F7F5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8F7F5; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <tr>
      <td align="center" class="outer-wrapper" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <tr>
            <td class="header-cell" style="padding: 50px 50px 0 50px; background-color: #ffffff;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" class="logo-img" style="width: 130px; max-width: 130px; height: auto; display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
            </td>
          </tr>
          
          <tr>
            <td class="content-cell" style="padding: 60px 50px 50px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hi ${prenomJ30},
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                This will be my last email about your certification request.
              </p>
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                I understand timing isn't always right, or perhaps you found another solution. Either way, no hard feelings.
              </p>
              <p class="body-text" style="margin: 0 0 50px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                If you ever need a document certified in the future — whether it's a passport copy, diploma, ID, or any other document — <strong style="color: #222222; font-weight: 600;">My Notary</strong> will be here. Fast, online, and officially recognised.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button" style="width: 280px;">
                      <tr>
                        <td align="center" style="border-radius: 25px; background-color: #000000;">
                          <a href="https://mynotary.io" class="cta-link" style="display: block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: 400; font-size: 15px; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                            Visit mynotary.io →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p class="body-text" style="margin: 0; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Wishing you all the best.
              </p>
            </td>
          </tr>
          
          <tr>
            <td class="footer-cell" style="padding: 0 50px 40px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="border-top: 1px solid #E5E5E5; padding: 0;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; font-size: 14px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                Best regards,<br>
                Jeremy<br>
                Founder, My Notary
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <a href="https://mynotary.io" style="color: #000000; text-decoration: underline; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">mynotary.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      break

    default:
      subject = 'Notification from My Notary'
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Notification from My Notary</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap');
    
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
    }
    
    table {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    @media only screen and (max-width: 620px) {
      .outer-wrapper {
        padding: 10px 8px !important;
      }
      .email-container {
        width: 100% !important;
        border-radius: 12px !important;
      }
      .header-cell {
        padding: 30px 20px 0 20px !important;
      }
      .content-cell {
        padding: 40px 20px 30px 20px !important;
      }
      .footer-cell {
        padding: 0 20px 25px 20px !important;
      }
      .cta-button {
        width: 100% !important;
      }
      .cta-link {
        padding: 14px 24px !important;
        font-size: 14px !important;
      }
      .body-text {
        font-size: 16px !important;
      }
      .logo-img {
        width: 110px !important;
      }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {
      font-family: Arial, sans-serif !important;
    }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F8F7F5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8F7F5; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <tr>
      <td align="center" class="outer-wrapper" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden;">
          <tr>
            <td class="header-cell" style="padding: 50px 50px 0 50px; background-color: #ffffff;">
              <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/mynotary-logo-noir.png" alt="mynotary.io" width="130" class="logo-img" style="width: 130px; max-width: 130px; height: auto; display: block; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
            </td>
          </tr>
          
          <tr>
            <td class="content-cell" style="padding: 60px 50px 50px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p class="body-text" style="margin: 0 0 20px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hi ${recipient_name},
              </p>
              <p class="body-text" style="margin: 0 0 50px; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                You have a new notification from My Notary. Please visit your dashboard for more details.
              </p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 50px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-button" style="width: 280px;">
                      <tr>
                        <td align="center" style="border-radius: 25px; background-color: #000000;">
                          <a href="${dashboardUrl}" class="cta-link" style="display: block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: 400; font-size: 15px; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                            Go to dashboard →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p class="body-text" style="margin: 0; font-size: 17px; line-height: 1.7; color: #444444; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                If you have any questions, simply reply to this email.
              </p>
            </td>
          </tr>
          
          <tr>
            <td class="footer-cell" style="padding: 0 50px 40px 50px; background-color: #ffffff; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="border-top: 1px solid #E5E5E5; padding: 0;"></td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; font-size: 14px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                Best regards,<br>
                The My Notary Team
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <a href="https://mynotary.io" style="color: #000000; text-decoration: underline; font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">mynotary.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }

  return { subject, html, attachments: attachments.length > 0 ? attachments : undefined }
}


import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  email_type: 'payment_success' | 'payment_failed' | 'notary_assigned' | 'notarized_file_uploaded' | 'message_received'
  recipient_email: string
  recipient_name: string
  recipient_type: 'client' | 'notary'
  data: {
    submission_id?: string
    submission_number?: string
    notary_name?: string
    file_name?: string
    file_url?: string
    message_preview?: string
    invoice_url?: string
    invoice_pdf?: string // Base64 encoded PDF
    payment_amount?: number
    payment_date?: string
    error_message?: string
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const emailRequest: EmailRequest = await req.json()

    if (!emailRequest.email_type || !emailRequest.recipient_email || !emailRequest.recipient_name) {
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
      console.error('SENDGRID_API_KEY is not set')
      return new Response(
        JSON.stringify({ error: 'SendGrid API key is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine dashboard URL
    const dashboardUrl = emailRequest.recipient_type === 'notary' ? NOTARY_DASHBOARD_URL : CLIENT_DASHBOARD_URL

    // Generate email HTML based on type
    const { subject, html, attachments } = generateEmailTemplate(emailRequest, dashboardUrl)

    // Prepare SendGrid payload
    const sendGridPayload: any = {
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: SENDGRID_FROM_NAME,
      },
      personalizations: [
        {
          to: [{ email: emailRequest.recipient_email, name: emailRequest.recipient_name }],
          subject: subject,
        },
      ],
      content: [
        {
          type: 'text/html',
          value: html,
        },
      ],
    }

    // Add attachments if invoice PDF is provided
    if (attachments && attachments.length > 0) {
      sendGridPayload.attachments = attachments
    }

    // Send email via SendGrid
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendGridPayload),
    })

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text()
      console.error('SendGrid error:', sendGridResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email', 
          details: errorText,
          status: sendGridResponse.status 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Email sent successfully to:', emailRequest.recipient_email, 'Type:', emailRequest.email_type)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        recipient: emailRequest.recipient_email,
        email_type: emailRequest.email_type
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateEmailTemplate(request: EmailRequest, dashboardUrl: string): { subject: string; html: string; attachments?: any[] } {
  const { email_type, recipient_name, data } = request
  let subject = ''
  let html = ''
  const attachments: any[] = []

  // Base HTML structure - styled like Papers email but in black and white
  // Note: SVG logos may not display in all email clients. Consider using PNG version.
  const baseHTML = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f0;">
  <!-- Main Container -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f0; padding: 40px 20px;">
    <tr>
      <td align="center" style="padding: 0;">
        <!-- Email Content Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header with black banner and logo -->
          <tr>
            <td style="padding: 30px 40px; background-color: #000000; text-align: center;">
              <!-- Logo - Try to use SVG, fallback to text if image doesn't load -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0;">
                    <!-- Logo image with proper attributes for email clients -->
                    <img src="https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/logo-blanc.svg" alt="MY NOTARY" width="200" height="auto" style="width: 200px; max-width: 200px; height: auto; display: block; margin: 0 auto; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.2;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px; background-color: #ffffff;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #ffffff; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                MY NOTARY
              </p>
              <p style="margin: 0 0 20px; font-size: 12px; color: #666666; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6;">
                This is an automated email from <strong style="color: #000000;">MY NOTARY</strong>.<br>
                Please do not reply to this email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <a href="${dashboardUrl}" style="color: #000000; text-decoration: underline;">Visit Dashboard</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  // Generate template based on email type
  switch (email_type) {
    case 'payment_success':
      subject = `Payment Confirmed - Submission #${data.submission_number || data.submission_id?.substring(0, 8) || ''}`
      html = baseHTML(`
        <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #000000; line-height: 1.3;">
          Payment Confirmed
        </h2>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000;">
          Hello ${recipient_name},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000;">
          Your payment for submission <strong>#${data.submission_number || data.submission_id?.substring(0, 8) || ''}</strong> has been confirmed successfully.
        </p>
        ${data.payment_amount ? `
        <div style="border: 1px solid #000000; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #000000; font-weight: 600; margin-bottom: 8px;">Amount Paid</p>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #000000;">$${parseFloat(data.payment_amount.toString()).toFixed(2)}</p>
          ${data.payment_date ? `<p style="margin: 8px 0 0; font-size: 14px; color: #000000;">Date: ${new Date(data.payment_date).toLocaleDateString('en-US')}</p>` : ''}
        </div>
        ` : ''}
        ${data.invoice_url || data.invoice_pdf ? `
        <table role="presentation" style="width: 100%; margin: 30px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${data.invoice_url || '#'}" style="display: inline-block; padding: 14px 28px; background-color: #000000; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                Download Invoice
              </a>
            </td>
          </tr>
        </table>
        ` : ''}
        <table role="presentation" style="width: 100%; margin: 20px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${dashboardUrl}/submission/${data.submission_id}" style="display: inline-block; padding: 12px 24px; background-color: #000000; color: #ffffff; text-decoration: none; font-weight: 500; font-size: 14px;">
                View Submission Details
              </a>
            </td>
          </tr>
        </table>
      `)
      
      // Add invoice as attachment if provided as base64
      if (data.invoice_pdf) {
        attachments.push({
          content: data.invoice_pdf,
          filename: `invoice-${data.submission_id || 'invoice'}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        })
      }
      break

    case 'payment_failed':
      subject = `Payment Failed - Submission #${data.submission_number || data.submission_id?.substring(0, 8) || ''}`
      html = baseHTML(`
        <!-- Main Heading - Centered, Large, Serif -->
        <h1 style="margin: 0 0 24px; font-size: 32px; font-weight: 700; color: #000000; line-height: 1.2; text-align: center; font-family: Georgia, 'Times New Roman', Times, serif; letter-spacing: -0.5px;">
          Payment Failed
        </h1>
        
        <!-- Body Content - Left Aligned -->
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          Hi ${recipient_name},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          The payment for your submission <strong style="color: #000000; font-weight: 600;">#${data.submission_number || data.submission_id?.substring(0, 8) || ''}</strong> has failed.
        </p>
        ${data.error_message ? `
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          Reason: ${data.error_message}
        </p>
        ` : ''}
        <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          Please try the payment again using the link below. If you have any questions, our team is here to help.
        </p>
        
        <!-- Call to Action Button - Centered, Rounded -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0;">
          <tr>
            <td align="center" style="padding: 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #000000;">
                    <a href="${dashboardUrl}/submission/${data.submission_id}" style="display: inline-block; padding: 16px 32px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                      Retry Payment
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `)
      break

    case 'notary_assigned':
      subject = `Notary Assigned - Submission #${data.submission_number || data.submission_id?.substring(0, 8) || ''}`
      html = baseHTML(`
        <!-- Main Heading - Centered, Large, Serif -->
        <h1 style="margin: 0 0 24px; font-size: 32px; font-weight: 700; color: #000000; line-height: 1.2; text-align: center; font-family: Georgia, 'Times New Roman', Times, serif; letter-spacing: -0.5px;">
          Notary Assigned to Your Submission
        </h1>
        
        <!-- Body Content - Left Aligned -->
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          Hi ${recipient_name},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          A notary has been assigned to your submission <strong style="color: #000000; font-weight: 600;">#${data.submission_number || data.submission_id?.substring(0, 8) || ''}</strong>.
        </p>
        ${data.notary_name ? `
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          Assigned notary: <strong style="color: #000000; font-weight: 600;">${data.notary_name}</strong>.
        </p>
        ` : ''}
        <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          You can now communicate with the notary and track the progress of your submission. If you have any questions, our team is here to help.
        </p>
        
        <!-- Call to Action Button - Centered, Rounded -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0;">
          <tr>
            <td align="center" style="padding: 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #000000;">
                    <a href="${dashboardUrl}/submission/${data.submission_id}" style="display: inline-block; padding: 16px 32px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                      View Submission
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `)
      break

    case 'notarized_file_uploaded':
      subject = `Notarized Document Available - Submission #${data.submission_number || data.submission_id?.substring(0, 8) || ''}`
      html = baseHTML(`
        <!-- Main Heading - Centered, Large, Serif -->
        <h1 style="margin: 0 0 24px; font-size: 32px; font-weight: 700; color: #000000; line-height: 1.2; text-align: center; font-family: Georgia, 'Times New Roman', Times, serif; letter-spacing: -0.5px;">
          Notarized Document Available
        </h1>
        
        <!-- Body Content - Left Aligned -->
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          Hi ${recipient_name},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          A new notarized document has been added to your submission <strong style="color: #000000; font-weight: 600;">#${data.submission_number || data.submission_id?.substring(0, 8) || ''}</strong>.
        </p>
        ${data.file_name ? `
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          Document: <strong style="color: #000000; font-weight: 600;">${data.file_name}</strong>
        </p>
        ` : ''}
        <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          You can view and download your notarized documents using the link below. If you have any questions, our team is here to help.
        </p>
        
        <!-- Call to Action Button - Centered, Rounded -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0;">
          <tr>
            <td align="center" style="padding: 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #000000;">
                    <a href="${dashboardUrl}/submission/${data.submission_id}?tab=notarized" style="display: inline-block; padding: 16px 32px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                      View Notarized Documents
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `)
      break

    case 'message_received':
      subject = `New Message - Submission #${data.submission_number || data.submission_id?.substring(0, 8) || ''}`
      html = baseHTML(`
        <!-- Main Heading - Centered, Large, Serif -->
        <h1 style="margin: 0 0 24px; font-size: 32px; font-weight: 700; color: #000000; line-height: 1.2; text-align: center; font-family: Georgia, 'Times New Roman', Times, serif; letter-spacing: -0.5px;">
          New Message
        </h1>
        
        <!-- Body Content - Left Aligned -->
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          Hi ${recipient_name},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          You have received a new message regarding your submission <strong style="color: #000000; font-weight: 600;">#${data.submission_number || data.submission_id?.substring(0, 8) || ''}</strong>.
        </p>
        ${data.message_preview ? `
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-style: italic; padding-left: 16px; border-left: 2px solid #000000;">
          "${data.message_preview}"
        </p>
        ` : ''}
        <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          You can view and respond to the message using the link below. If you have any questions, our team is here to help.
        </p>
        
        <!-- Call to Action Button - Centered, Rounded -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0;">
          <tr>
            <td align="center" style="padding: 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #000000;">
                    <a href="${dashboardUrl}/submission/${data.submission_id}" style="display: inline-block; padding: 16px 32px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                      View Conversation
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `)
      break

    default:
      subject = 'MY NOTARY Notification'
      html = baseHTML(`
        <!-- Main Heading - Centered, Large, Serif -->
        <h1 style="margin: 0 0 24px; font-size: 32px; font-weight: 700; color: #000000; line-height: 1.2; text-align: center; font-family: Georgia, 'Times New Roman', Times, serif; letter-spacing: -0.5px;">
          Notification
        </h1>
        
        <!-- Body Content - Left Aligned -->
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          Hi ${recipient_name},
        </p>
        <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          You have a new notification. If you have any questions, our team is here to help.
        </p>
        
        <!-- Call to Action Button - Centered, Rounded -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0;">
          <tr>
            <td align="center" style="padding: 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #000000;">
                    <a href="${dashboardUrl}" style="display: inline-block; padding: 16px 32px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.2;">
                      View Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `)
  }

  return { subject, html, attachments: attachments.length > 0 ? attachments : undefined }
}


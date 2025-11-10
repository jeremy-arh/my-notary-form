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

  // Base HTML structure
  const baseHTML = (content: string) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 2px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #111827; letter-spacing: -0.5px;">
                MY NOTARY
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.5;">
                Ceci est un email automatique de <strong>MY NOTARY</strong>.<br>
                Veuillez ne pas répondre à cet email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                <a href="${dashboardUrl}" style="color: #6b7280; text-decoration: none;">Visiter le tableau de bord</a>
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
      subject = `Paiement confirmé - Soumission #${data.submission_number || data.submission_id?.substring(0, 8) || ''}`
      html = baseHTML(`
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 64px; line-height: 1;">✅</div>
        </div>
        <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.3;">
          Paiement confirmé
        </h2>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
          Bonjour ${recipient_name},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
          Votre paiement pour la soumission <strong>#${data.submission_number || data.submission_id?.substring(0, 8) || ''}</strong> a été confirmé avec succès.
        </p>
        ${data.payment_amount ? `
        <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Montant payé</p>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #111827;">$${parseFloat(data.payment_amount.toString()).toFixed(2)}</p>
          ${data.payment_date ? `<p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">Date: ${new Date(data.payment_date).toLocaleDateString('fr-FR')}</p>` : ''}
        </div>
        ` : ''}
        ${data.invoice_url || data.invoice_pdf ? `
        <table role="presentation" style="width: 100%; margin: 30px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${data.invoice_url || '#'}" style="display: inline-block; padding: 14px 28px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                📄 Télécharger la facture
              </a>
            </td>
          </tr>
        </table>
        ` : ''}
        <table role="presentation" style="width: 100%; margin: 20px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${dashboardUrl}/submission/${data.submission_id}" style="display: inline-block; padding: 12px 24px; background-color: #f3f4f6; color: #111827; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
                Voir les détails de la soumission
              </a>
            </td>
          </tr>
        </table>
      `)
      
      // Add invoice as attachment if provided as base64
      if (data.invoice_pdf) {
        attachments.push({
          content: data.invoice_pdf,
          filename: `facture-${data.submission_id || 'invoice'}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        })
      }
      break

    case 'payment_failed':
      subject = `Échec du paiement - Soumission #${data.submission_number || data.submission_id?.substring(0, 8) || ''}`
      html = baseHTML(`
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 64px; line-height: 1;">❌</div>
        </div>
        <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.3;">
          Échec du paiement
        </h2>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
          Bonjour ${recipient_name},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
          Le paiement pour votre soumission <strong>#${data.submission_number || data.submission_id?.substring(0, 8) || ''}</strong> a échoué.
        </p>
        ${data.error_message ? `
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600; margin-bottom: 4px;">Raison</p>
          <p style="margin: 0; font-size: 14px; color: #7f1d1d;">${data.error_message}</p>
        </div>
        ` : ''}
        <p style="margin: 20px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
          Veuillez réessayer le paiement ou contacter le support si le problème persiste.
        </p>
        <table role="presentation" style="width: 100%; margin: 30px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${dashboardUrl}/submission/${data.submission_id}" style="display: inline-block; padding: 14px 28px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Réessayer le paiement
              </a>
            </td>
          </tr>
        </table>
      `)
      break

    case 'notary_assigned':
      subject = `Notaire assigné - Soumission #${data.submission_number || data.submission_id?.substring(0, 8) || ''}`
      html = baseHTML(`
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 64px; line-height: 1;">👤</div>
        </div>
        <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.3;">
          Notaire assigné à votre soumission
        </h2>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
          Bonjour ${recipient_name},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
          Un notaire a été assigné à votre soumission <strong>#${data.submission_number || data.submission_id?.substring(0, 8) || ''}</strong>.
        </p>
        ${data.notary_name ? `
        <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Notaire assigné</p>
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">${data.notary_name}</p>
        </div>
        ` : ''}
        <p style="margin: 20px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
          Vous pouvez maintenant communiquer avec le notaire et suivre l'avancement de votre soumission.
        </p>
        <table role="presentation" style="width: 100%; margin: 30px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${dashboardUrl}/submission/${data.submission_id}" style="display: inline-block; padding: 14px 28px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Voir la soumission
              </a>
            </td>
          </tr>
        </table>
      `)
      break

    case 'notarized_file_uploaded':
      subject = `Document notarisé disponible - Soumission #${data.submission_number || data.submission_id?.substring(0, 8) || ''}`
      html = baseHTML(`
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 64px; line-height: 1;">📄</div>
        </div>
        <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.3;">
          Document notarisé disponible
        </h2>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
          Bonjour ${recipient_name},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
          Un nouveau document notarisé a été ajouté à votre soumission <strong>#${data.submission_number || data.submission_id?.substring(0, 8) || ''}</strong>.
        </p>
        ${data.file_name ? `
        <div style="background-color: #f9fafb; border-left: 4px solid #000000; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Document</p>
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">📄 ${data.file_name}</p>
        </div>
        ` : ''}
        <table role="presentation" style="width: 100%; margin: 30px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${dashboardUrl}/submission/${data.submission_id}?tab=notarized" style="display: inline-block; padding: 14px 28px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Voir les documents notarisés
              </a>
            </td>
          </tr>
        </table>
      `)
      break

    case 'message_received':
      subject = `Nouveau message - Soumission #${data.submission_number || data.submission_id?.substring(0, 8) || ''}`
      html = baseHTML(`
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 64px; line-height: 1;">💬</div>
        </div>
        <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.3;">
          Nouveau message
        </h2>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
          Bonjour ${recipient_name},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
          Vous avez reçu un nouveau message concernant votre soumission <strong>#${data.submission_number || data.submission_id?.substring(0, 8) || ''}</strong>.
        </p>
        ${data.message_preview ? `
        <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Aperçu du message</p>
          <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-style: italic;">"${data.message_preview}"</p>
        </div>
        ` : ''}
        <table role="presentation" style="width: 100%; margin: 30px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${dashboardUrl}/submission/${data.submission_id}" style="display: inline-block; padding: 14px 28px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Voir la conversation
              </a>
            </td>
          </tr>
        </table>
      `)
      break

    default:
      subject = 'Notification de MY NOTARY'
      html = baseHTML(`
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
          Bonjour ${recipient_name},
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
          Vous avez une nouvelle notification.
        </p>
      `)
  }

  return { subject, html, attachments: attachments.length > 0 ? attachments : undefined }
}


import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationEmailRequest {
  notification_id: string
}

interface NotificationData {
  id: string
  user_id: string
  user_type: 'client' | 'notary' | 'admin'
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  action_type: string | null
  action_data: any
  created_at: string
}

interface UserEmailData {
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  name?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { notification_id }: NotificationEmailRequest = await req.json()

    if (!notification_id) {
      return new Response(
        JSON.stringify({ error: 'notification_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get environment variables
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
    const SENDGRID_TEMPLATE_ID = Deno.env.get('SENDGRID_TEMPLATE_ID')
    const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') || 'support@mynotary.io'
    const SENDGRID_FROM_NAME = Deno.env.get('SENDGRID_FROM_NAME') || 'MY NOTARY'
    const CLIENT_DASHBOARD_URL = Deno.env.get('CLIENT_DASHBOARD_URL') || 'https://client.mynotary.io'
    const NOTARY_DASHBOARD_URL = Deno.env.get('NOTARY_DASHBOARD_URL') || 'https://notary.mynotary.io'
    const ADMIN_DASHBOARD_URL = Deno.env.get('ADMIN_DASHBOARD_URL') || 'https://admin.mynotary.io'

    if (!SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY is not set')
      return new Response(
        JSON.stringify({ error: 'SendGrid API key is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get notification details
    const { data: notification, error: notificationError } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('id', notification_id)
      .single()

    if (notificationError || !notification) {
      console.error('Error fetching notification:', notificationError)
      return new Response(
        JSON.stringify({ error: 'Notification not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const notif: NotificationData = notification

    // Get user email based on user_type
    let userEmailData: UserEmailData | null = null

    if (notif.user_type === 'client') {
      const { data: client, error: clientError } = await supabaseClient
        .from('client')
        .select('email, first_name, last_name')
        .eq('id', notif.user_id)
        .single()

      if (clientError) {
        console.error('Error fetching client:', clientError)
        return new Response(
          JSON.stringify({ error: 'Client not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userEmailData = {
        email: client.email,
        first_name: client.first_name,
        last_name: client.last_name,
      }
    } else if (notif.user_type === 'notary') {
      const { data: notary, error: notaryError } = await supabaseClient
        .from('notary')
        .select('email, full_name, name')
        .eq('id', notif.user_id)
        .single()

      if (notaryError) {
        console.error('Error fetching notary:', notaryError)
        return new Response(
          JSON.stringify({ error: 'Notary not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userEmailData = {
        email: notary.email,
        full_name: notary.full_name,
        name: notary.name,
      }
    } else if (notif.user_type === 'admin') {
      // For admin, we need to get the email from auth.users
      // Since admin_user table may not have email, we'll skip email for admins
      // Or you can add email to admin_user table
      console.log('Admin notifications - email sending skipped for now')
      return new Response(
        JSON.stringify({ success: true, message: 'Admin notification - email skipped' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!userEmailData || !userEmailData.email) {
      return new Response(
        JSON.stringify({ error: 'User email not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine dashboard URL based on user type
    let dashboardUrl = CLIENT_DASHBOARD_URL
    if (notif.user_type === 'notary') {
      dashboardUrl = NOTARY_DASHBOARD_URL
    } else if (notif.user_type === 'admin') {
      dashboardUrl = ADMIN_DASHBOARD_URL
    }

    // Build action URL based on action_type and action_data
    let actionUrl = dashboardUrl
    if (notif.action_data) {
      const actionData = typeof notif.action_data === 'string' 
        ? JSON.parse(notif.action_data) 
        : notif.action_data

      if (actionData.submission_id) {
        if (notif.action_type === 'notarized_file_uploaded') {
          actionUrl = `${dashboardUrl}/submission/${actionData.submission_id}?tab=notarized`
        } else {
          actionUrl = `${dashboardUrl}/submission/${actionData.submission_id}`
        }
      } else if (actionData.notary_id && notif.user_type === 'admin') {
        actionUrl = `${dashboardUrl}/notary/${actionData.notary_id}`
      } else if (notif.action_type === 'payout_created' && notif.user_type === 'notary') {
        actionUrl = `${dashboardUrl}/payouts`
      } else if (notif.action_type === 'message_received' || notif.action_type === 'new_message') {
        actionUrl = `${dashboardUrl}/messages`
      }
    }

    // Prepare template data for SendGrid
    const templateData = {
      notification_title: notif.title,
      notification_message: notif.message,
      notification_type: notif.type,
      user_name: userEmailData.first_name 
        ? `${userEmailData.first_name} ${userEmailData.last_name || ''}`.trim()
        : userEmailData.full_name || userEmailData.name || 'User',
      action_url: actionUrl,
      dashboard_url: dashboardUrl,
      submission_id: notif.action_data?.submission_id || null,
      file_name: notif.action_data?.file_name || null,
    }

    // Send email via SendGrid
    const sendGridPayload: any = {
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: SENDGRID_FROM_NAME,
      },
      personalizations: [
        {
          to: [{ email: userEmailData.email, name: templateData.user_name }],
          dynamic_template_data: templateData,
          // Add custom_args to track notification_id and email_type in webhooks
          custom_args: {
            notification_id: notif.id || '',
            submission_id: notif.action_data?.submission_id || '',
            email_type: 'notification',
          },
        },
      ],
      template_id: SENDGRID_TEMPLATE_ID,
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

    // Generate HTML content for storage (even if using template)
    let htmlContent: string | null = null
    if (!SENDGRID_TEMPLATE_ID) {
      // If no template ID, use plain HTML email
      htmlContent = generatePlainEmailHTML(notif, templateData)
      sendGridPayload.content = [
        {
          type: 'text/html',
          value: htmlContent,
        },
      ]
      delete sendGridPayload.template_id
    } else {
      // If using template, generate a basic HTML version for storage
      // Note: This won't be the exact template rendered by SendGrid, but a representation
      htmlContent = generatePlainEmailHTML(notif, templateData)
    }

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

    // Extract SendGrid message ID from response headers
    const sgMessageId = sendGridResponse.headers.get('x-message-id') || null

    // Log email in email_sent table
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Get client_id from user if available
      let clientId = null
      if (notif.user_type === 'client' && notif.user_id) {
        const { data: client } = await supabase
          .from('client')
          .select('id')
          .eq('id', notif.user_id)
          .single()
        
        if (client?.id) {
          clientId = client.id
        }
      }

      // Insert email record with html_content
      const { error: insertError } = await supabase
        .from('email_sent')
        .insert({
          email: userEmailData.email,
          recipient_name: templateData.user_name,
          recipient_type: notif.user_type || 'client',
          email_type: 'notification',
          subject: notif.title,
          html_content: htmlContent, // Store HTML content
          submission_id: notif.action_data?.submission_id || null,
          client_id: clientId,
          notification_id: notif.id,
          sg_message_id: sgMessageId,
        })

      if (insertError) {
        console.error('Error logging email to email_sent:', insertError)
        // Don't fail the email send if logging fails
      }
    } catch (logError) {
      console.error('Error logging email:', logError)
      // Don't fail the email send if logging fails
    }

    console.log('Email sent successfully to:', userEmailData.email, 'Message ID:', sgMessageId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        recipient: userEmailData.email 
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

function generatePlainEmailHTML(notification: NotificationData, templateData: any): string {
  const typeColors = {
    info: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  }

  const typeColor = typeColors[notification.type] || typeColors.info
  const typeIcons = {
    info: '📢',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  }

  const typeIcon = typeIcons[notification.type] || typeIcons.info

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${notification.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 2px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #111827;">MY NOTARY</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="font-size: 48px; text-align: center; margin-bottom: 20px;">${typeIcon}</div>
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #111827;">
                ${notification.title}
              </h2>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                ${notification.message}
              </p>
              
              ${templateData.action_url ? `
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${templateData.action_url}" style="display: inline-block; padding: 14px 28px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Details
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
                This is an automated notification from MY NOTARY.<br>
                Please do not reply to this email.
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
                <a href="${templateData.dashboard_url}" style="color: #6b7280; text-decoration: none;">Visit Dashboard</a>
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
}


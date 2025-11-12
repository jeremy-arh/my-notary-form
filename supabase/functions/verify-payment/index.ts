import { serve } from 'https://deno.land/std@0.177.1/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      throw new Error('Missing session ID')
    }

    // Retrieve the Stripe session with expanded payment_intent
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'invoice']
    })

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ verified: false, error: 'Payment not completed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get invoice/receipt URL
    let invoiceUrl = null

    // Try to get invoice URL (for subscription payments)
    if (session.invoice && typeof session.invoice === 'object') {
      invoiceUrl = session.invoice.hosted_invoice_url || session.invoice.invoice_pdf
    }

    // For one-time payments, get receipt URL from payment_intent
    if (!invoiceUrl && session.payment_intent && typeof session.payment_intent === 'object') {
      const charges = await stripe.charges.list({
        payment_intent: session.payment_intent.id,
        limit: 1
      })

      if (charges.data.length > 0) {
        invoiceUrl = charges.data[0].receipt_url
      }
    }

    // Get the submission ID from metadata
    const submissionId = session.metadata.submission_id
    const accountCreated = session.metadata.account_created === 'true'

    if (!submissionId) {
      throw new Error('Missing submission ID in payment metadata')
    }

    // Get the authorization header
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the existing submission
    const { data: existingSubmission, error: fetchError } = await supabase
      .from('submission')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (fetchError || !existingSubmission) {
      console.error('Error fetching submission:', fetchError)
      throw new Error('Submission not found')
    }

    // Update submission with payment information and change status to 'pending'
    const updatedData = {
      ...existingSubmission.data,
      payment: {
        stripe_session_id: sessionId,
        amount_paid: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        paid_at: new Date().toISOString(),
        invoice_url: invoiceUrl,
      },
    }

    const { data: submission, error: updateError } = await supabase
      .from('submission')
      .update({
        status: 'pending',
        data: updatedData,
      })
      .eq('id', submissionId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating submission:', updateError)
      throw new Error('Failed to update submission')
    }

    // Create submission_files entries for uploaded files
    if (existingSubmission.data?.uploadedFiles && existingSubmission.data.uploadedFiles.length > 0) {
      console.log('📁 [FILES] Creating submission_files entries for', existingSubmission.data.uploadedFiles.length, 'files')

      const fileEntries = existingSubmission.data.uploadedFiles.map((file: any) => ({
        submission_id: submissionId,
        file_name: file.name,
        file_url: file.public_url,
        file_type: file.type,
        file_size: file.size,
        storage_path: file.storage_path,
      }))

      const { error: filesError } = await supabase
        .from('submission_files')
        .insert(fileEntries)

      if (filesError) {
        console.error('❌ [FILES] Error creating submission_files entries:', filesError)
        // Don't throw - payment is successful, just log the error
      } else {
        console.log('✅ [FILES] Created', fileEntries.length, 'submission_files entries')
      }
    }

    // Send email to client with invoice
    try {
      // Get client information
      const { data: clientData, error: clientError } = await supabase
        .from('client')
        .select('email, first_name, last_name, id')
        .eq('id', existingSubmission.client_id)
        .single()

      if (!clientError && clientData && clientData.email) {
        // Get submission number (first 8 chars of ID)
        const submissionNumber = submissionId.substring(0, 8)
        const clientName = `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim() || 'Client'

        // Download invoice PDF if URL is available (optional - can be done later)
        // Note: PDF attachment is optional - we'll use the URL for now
        // If you want to attach PDF, you can download it and convert to base64 here
        // For now, we'll just use the URL

        // Send transactional email
        const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            email_type: 'payment_success',
            recipient_email: clientData.email,
            recipient_name: clientName,
            recipient_type: 'client',
            data: {
              submission_id: submissionId,
              submission_number: submissionNumber,
              payment_amount: session.amount_total ? (session.amount_total / 100) : null,
              payment_date: new Date().toISOString(),
              invoice_url: invoiceUrl
              // invoice_pdf can be added later if needed
            }
          }
        })

        if (emailError) {
          console.error('❌ [EMAIL] Error sending payment success email:', emailError)
          // Don't throw - payment is successful, just log the error
        } else {
          console.log('✅ [EMAIL] Payment success email sent to:', clientData.email)
        }
      }
    } catch (emailError) {
      console.error('❌ [EMAIL] Error in email sending process:', emailError)
      // Don't throw - payment is successful, just log the error
    }

    // Notify all active notaries about the new paid submission
    try {
      console.log('📧 [NOTIFICATIONS] Sending new submission notifications to notaries (payment confirmed)')
      
      // Get all active notaries
      const { data: activeNotaries, error: notariesError } = await supabase
        .from('notary')
        .select('id, email, full_name, is_active')
        .eq('is_active', true)

      if (notariesError) {
        console.error('❌ [NOTIFICATIONS] Error fetching notaries:', notariesError)
      } else if (activeNotaries && activeNotaries.length > 0) {
        console.log(`📧 [NOTIFICATIONS] Found ${activeNotaries.length} active notaries to notify`)

        // Get submission details for email
        const clientName = `${existingSubmission.first_name || ''} ${existingSubmission.last_name || ''}`.trim() || 'Client'
        const submissionNumber = submissionId.substring(0, 8)

        // Send email to each notary
        const emailPromises = activeNotaries.map(async (notary) => {
          if (!notary.email) {
            console.warn(`⚠️ [NOTIFICATIONS] Notary ${notary.id} has no email, skipping`)
            return
          }

          try {
            const notaryName = notary.full_name || 'Notary'
            
            // Call send-transactional-email Edge Function
            const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
              body: {
                email_type: 'new_submission_available',
                recipient_email: notary.email,
                recipient_name: notaryName,
                recipient_type: 'notary',
                data: {
                  submission_id: submissionId,
                  submission_number: submissionNumber,
                  client_name: clientName,
                  appointment_date: existingSubmission.appointment_date,
                  appointment_time: existingSubmission.appointment_time,
                  timezone: existingSubmission.timezone,
                  address: existingSubmission.address,
                  city: existingSubmission.city,
                  country: existingSubmission.country
                }
              }
            })

            if (emailError) {
              console.error(`❌ [NOTIFICATIONS] Failed to send email to ${notary.email}:`, emailError)
            } else {
              console.log(`✅ [NOTIFICATIONS] Email sent to notary: ${notary.email}`)
            }
          } catch (emailError) {
            console.error(`❌ [NOTIFICATIONS] Error sending email to ${notary.email}:`, emailError)
          }
        })

        // Wait for all emails to be sent (don't block if some fail)
        await Promise.allSettled(emailPromises)
        console.log('✅ [NOTIFICATIONS] Finished sending new submission notifications to notaries')
      } else {
        console.log('⚠️ [NOTIFICATIONS] No active notaries found to notify')
      }
    } catch (notificationError) {
      console.error('❌ [NOTIFICATIONS] Error in notification process:', notificationError)
      // Don't throw - payment is successful, just log the error
    }

    // Get client data for GTM tracking
    let clientData: { email?: string; phone?: string; id?: string } | null = null
    if (existingSubmission.client_id) {
      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('email, phone, id')
        .eq('id', existingSubmission.client_id)
        .single()

      if (!clientError && client) {
        clientData = client as { email?: string; phone?: string; id?: string }
      }
    }

    // Check if this is the first purchase (new_customer)
    let isFirstPurchase = true
    if (existingSubmission.client_id) {
      const { count } = await supabase
        .from('submission')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', existingSubmission.client_id)
        .eq('status', 'pending')

      // If there are other pending submissions, this is not the first purchase
      // We check for 'pending' status because completed purchases would have different statuses
      // Actually, we should check for any completed/pending submission
      const { count: allSubmissionsCount } = await supabase
        .from('submission')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', existingSubmission.client_id)
        .in('status', ['pending', 'completed', 'in_progress'])

      isFirstPurchase = (allSubmissionsCount || 0) <= 1
    }

    // Get selected services from submission data
    const selectedServices = existingSubmission.data?.selectedServices || []
    
    // Calculate total amount
    const totalAmount = session.amount_total ? session.amount_total / 100 : 0

    return new Response(
      JSON.stringify({
        verified: true,
        submissionId: submission.id,
        accountCreated: accountCreated,
        invoiceUrl: invoiceUrl,
        // Payment data for GTM tracking
        // Use the actual currency from Stripe checkout session
        amount: totalAmount,
        currency: session.currency ? session.currency.toUpperCase() : 'EUR',
        transactionId: sessionId,
        // User data for GTM Enhanced Conversions
        userData: {
          email: existingSubmission.email || clientData?.email || '',
          phone: existingSubmission.phone || clientData?.phone || '',
          firstName: existingSubmission.first_name || '',
          lastName: existingSubmission.last_name || '',
          postalCode: existingSubmission.postal_code || '',
          country: existingSubmission.country || '',
        },
        // Services data
        selectedServices: selectedServices,
        // Customer status
        isFirstPurchase: isFirstPurchase,
        servicesCount: selectedServices.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error verifying payment:', error)
    return new Response(
      JSON.stringify({ verified: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

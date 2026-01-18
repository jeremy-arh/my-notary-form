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

    // Retrieve the Stripe session with expanded payment_intent, setup_intent, and invoice
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'invoice', 'setup_intent']
    })
    
    console.log('💳 [PAYMENT] Session retrieved:', {
      id: session.id,
      customer: session.customer,
      payment_status: session.payment_status,
      hasPaymentIntent: !!session.payment_intent,
      hasSetupIntent: !!session.setup_intent
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

    // Check if payment has already been processed
    // If status is not 'pending_payment', payment was already processed
    if (existingSubmission.status !== 'pending_payment') {
      console.log(`ℹ️ [PAYMENT] Payment already processed for submission ${submissionId}. Current status: ${existingSubmission.status}`)
      return new Response(
        JSON.stringify({ 
          verified: true, 
          message: 'Payment already processed',
          submission_id: submissionId 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Get payment_intent_id from session
    const paymentIntentId = session.payment_intent && typeof session.payment_intent === 'object' 
      ? session.payment_intent.id 
      : typeof session.payment_intent === 'string' 
        ? session.payment_intent 
        : null

    // Save payment method to customer for future automatic charges
    if (session.customer && paymentIntentId) {
      try {
        console.log('💳 [PAYMENT] Saving payment method to customer for future charges')
        console.log('💳 [PAYMENT] Customer ID:', typeof session.customer === 'string' ? session.customer : session.customer.id)
        console.log('💳 [PAYMENT] Payment Intent ID:', paymentIntentId)
        
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id
        
        // Retrieve payment intent with expanded data
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ['payment_method', 'latest_charge']
        })
        
        console.log('💳 [PAYMENT] Payment Intent retrieved:', {
          id: paymentIntent.id,
          status: paymentIntent.status,
          hasPaymentMethod: !!paymentIntent.payment_method,
          hasLatestCharge: !!paymentIntent.latest_charge
        })
        
        let paymentMethodId: string | null = null
        
        // Try to get payment method from payment intent first
        if (paymentIntent.payment_method) {
          paymentMethodId = typeof paymentIntent.payment_method === 'string' 
            ? paymentIntent.payment_method 
            : paymentIntent.payment_method.id
          console.log('💳 [PAYMENT] Payment method found in payment intent:', paymentMethodId)
        }
        
        // If not found, try to get it from the latest charge
        if (!paymentMethodId && paymentIntent.latest_charge) {
          const chargeId = typeof paymentIntent.latest_charge === 'string' 
            ? paymentIntent.latest_charge 
            : paymentIntent.latest_charge.id
          
          console.log('💳 [PAYMENT] Retrieving charge to get payment method:', chargeId)
          const charge = await stripe.charges.retrieve(chargeId, {
            expand: ['payment_method']
          })
          
          if (charge.payment_method) {
            paymentMethodId = typeof charge.payment_method === 'string' 
              ? charge.payment_method 
              : charge.payment_method.id
            console.log('💳 [PAYMENT] Payment method found in charge:', paymentMethodId)
          }
        }
        
        // Also check setup_intent if available (created when setup_future_usage is enabled)
        if (!paymentMethodId && session.setup_intent) {
          const setupIntentId = typeof session.setup_intent === 'string' 
            ? session.setup_intent 
            : session.setup_intent.id
          
          console.log('💳 [PAYMENT] Checking setup_intent for payment method:', setupIntentId)
          try {
            const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
              expand: ['payment_method']
            })
            
            if (setupIntent.payment_method) {
              paymentMethodId = typeof setupIntent.payment_method === 'string' 
                ? setupIntent.payment_method 
                : setupIntent.payment_method.id
              console.log('💳 [PAYMENT] Payment method found in setup_intent:', paymentMethodId)
            }
          } catch (setupError: any) {
            console.warn('⚠️ [PAYMENT] Could not retrieve setup_intent:', setupError.message)
          }
        }
        
        if (paymentMethodId) {
          console.log('💳 [PAYMENT] Attempting to attach payment method:', paymentMethodId)
          
          // Check if payment method is already attached to customer
          try {
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
            
            console.log('💳 [PAYMENT] Payment method details:', {
              id: paymentMethod.id,
              customer: paymentMethod.customer,
              type: paymentMethod.type
            })
            
            if (!paymentMethod.customer || paymentMethod.customer !== customerId) {
              // Attach payment method to customer
              console.log('🔗 [PAYMENT] Attaching payment method to customer')
              await stripe.paymentMethods.attach(paymentMethodId, {
                customer: customerId
              })
              console.log('✅ [PAYMENT] Payment method attached to customer:', customerId)
              
              // Set as default payment method for customer
              await stripe.customers.update(customerId, {
                invoice_settings: {
                  default_payment_method: paymentMethodId
                }
              })
              console.log('✅ [PAYMENT] Payment method set as default for customer')
            } else {
              console.log('ℹ️ [PAYMENT] Payment method already attached to customer')
              
              // Make sure it's set as default even if already attached
              try {
                await stripe.customers.update(customerId, {
                  invoice_settings: {
                    default_payment_method: paymentMethodId
                  }
                })
                console.log('✅ [PAYMENT] Payment method confirmed as default for customer')
              } catch (updateError: any) {
                console.warn('⚠️ [PAYMENT] Could not set as default (may already be default):', updateError.message)
              }
            }
          } catch (attachError: any) {
            console.error('❌ [PAYMENT] Error attaching payment method:', {
              message: attachError.message,
              type: attachError.type,
              code: attachError.code
            })
            
            // If payment method was used without customer, it can't be attached
            // This is OK - we'll create checkout sessions for future charges
            if (attachError.message?.includes('previously used without being attached') || 
                attachError.message?.includes('may not be used again')) {
              console.warn('⚠️ [PAYMENT] Payment method cannot be attached (was used without customer). Future charges will use checkout sessions.')
            } else {
              console.warn('⚠️ [PAYMENT] Could not attach payment method:', attachError.message)
            }
          }
        } else {
          console.warn('⚠️ [PAYMENT] No payment method found in payment intent or charge')
        }
      } catch (error: any) {
        // Don't fail the payment verification if saving payment method fails
        console.error('⚠️ [PAYMENT] Error saving payment method (non-critical):', {
          message: error.message,
          stack: error.stack,
          type: error.type
        })
      }
    } else {
      console.log('ℹ️ [PAYMENT] No customer or payment intent - skipping payment method save')
      console.log('ℹ️ [PAYMENT] Session customer:', session.customer)
      console.log('ℹ️ [PAYMENT] Payment Intent ID:', paymentIntentId)
    }

    // Update submission with payment information and change status to 'pending'
    const updatedData = {
      ...existingSubmission.data,
      payment: {
        stripe_session_id: sessionId,
        payment_intent_id: paymentIntentId,
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

    // Create signatories entries (only if they don't already exist)
    // Support both old format (signatoriesByDocument) and new format (signatories)
    const signatoriesData = existingSubmission.data?.signatories || existingSubmission.data?.signatoriesByDocument
    if (signatoriesData) {
      console.log('👥 [SIGNATORIES] Checking and creating signatories entries')
      
      // First, check if signatories already exist for this submission
      const { data: existingSignatories, error: checkError } = await supabase
        .from('signatories')
        .select('id, submission_id, document_key, first_name, last_name, birth_date')
        .eq('submission_id', submissionId)

      if (checkError) {
        console.error('❌ [SIGNATORIES] Error checking existing signatories:', checkError)
        // Continue anyway - try to insert
      }

      // If signatories already exist, skip insertion
      if (existingSignatories && existingSignatories.length > 0) {
        console.log(`ℹ️ [SIGNATORIES] Signatories already exist for submission ${submissionId} (${existingSignatories.length} entries). Skipping insertion to avoid duplicates.`)
      } else {
        // No existing signatories, proceed with insertion
        const signatoryEntries: any[] = []
        
        // Check if it's the new format (array) or old format (object by document)
        if (Array.isArray(signatoriesData)) {
          // New format: global signatories - associate with all documents
          const serviceDocuments = existingSubmission.data?.serviceDocuments || {}
          const allDocKeys: string[] = []
          
          // Generate all document keys
          if (serviceDocuments && typeof serviceDocuments === 'object') {
            Object.entries(serviceDocuments).forEach(([serviceId, documents]: [string, any]) => {
              if (Array.isArray(documents)) {
                documents.forEach((doc: any, docIndex: number) => {
                  allDocKeys.push(`${serviceId}_${docIndex}`)
                })
              }
            })
          }
          
          // If no documents found, use a global key
          const docKeysToUse = allDocKeys.length > 0 ? allDocKeys : ['global']
          
          console.log(`📋 [SIGNATORIES] Global signatories format: ${signatoriesData.length} signatories for ${docKeysToUse.length} document(s)`)
          
          // Associate each signatory with all documents
          signatoriesData.forEach((signatory: any) => {
            if (signatory.firstName && signatory.lastName) {
              docKeysToUse.forEach((docKey: string) => {
                signatoryEntries.push({
                  submission_id: submissionId,
                  document_key: docKey,
                  first_name: signatory.firstName,
                  last_name: signatory.lastName,
                  birth_date: signatory.birthDate,
                  birth_city: signatory.birthCity,
                  postal_address: signatory.postalAddress,
                  email: signatory.email || null,
                  phone: signatory.phone || null,
                })
              })
            }
          })
        } else {
          // Old format: signatoriesByDocument - keep backward compatibility
          console.log('📋 [SIGNATORIES] Old format (signatoriesByDocument) detected')
          for (const [docKey, signatories] of Object.entries(signatoriesData)) {
            if (Array.isArray(signatories)) {
              signatories.forEach((signatory: any) => {
                if (signatory.firstName && signatory.lastName) {
                  signatoryEntries.push({
                    submission_id: submissionId,
                    document_key: docKey,
                    first_name: signatory.firstName,
                    last_name: signatory.lastName,
                    birth_date: signatory.birthDate,
                    birth_city: signatory.birthCity,
                    postal_address: signatory.postalAddress,
                    email: signatory.email || null,
                    phone: signatory.phone || null,
                  })
                }
              })
            }
          }
        }

        if (signatoryEntries.length > 0) {
          const { error: signatoriesError } = await supabase
            .from('signatories')
            .insert(signatoryEntries)

          if (signatoriesError) {
            console.error('❌ [SIGNATORIES] Error creating signatories entries:', signatoriesError)
            // Don't throw - payment is successful, just log the error
          } else {
            console.log('✅ [SIGNATORIES] Created', signatoryEntries.length, 'signatories entries')
          }
        } else {
          console.log('ℹ️ [SIGNATORIES] No signatories to save')
        }
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

    // Note: form_draft entries are kept in the database for analytics purposes
    // The abandoned cart email function will check for paid submissions and skip sending emails
    console.log('ℹ️ [FORM_DRAFT] Keeping form_draft entries in database (will not receive abandoned cart emails due to paid submission)')

    // Notify all active notaries about the new paid submission
    try {
      console.log('📧 [NOTIFICATIONS] Sending new submission notifications to notaries (payment confirmed)')
      
      // Get all active notaries
      const { data: activeNotaries, error: notariesError } = await supabase
        .from('notary')
        .select('id, email, full_name, is_active, timezone')
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
            // Default to Miami (America/New_York) if notary timezone is not set
            const notaryTimezone = notary.timezone || 'America/New_York'
            const clientTimezone = existingSubmission.timezone || 'UTC'
            
            console.log('📧 [NOTIFICATIONS] Sending email to notary:', {
              email: notary.email,
              notaryTimezone: notaryTimezone,
              clientTimezone: clientTimezone,
              appointment_date: existingSubmission.appointment_date,
              appointment_time: existingSubmission.appointment_time
            })
            
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
                  client_timezone: clientTimezone,
                  notary_timezone: notaryTimezone,
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
    const selectedServiceIds = existingSubmission.data?.selectedServices || []
    
    // Fetch full service details from database for GTM tracking
    let selectedServices = []
    if (selectedServiceIds.length > 0) {
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('service_id, name, base_price')
        .in('service_id', selectedServiceIds)
        .eq('is_active', true)

      if (!servicesError && services && services.length > 0) {
        // Map services to include all required fields for GTM
        selectedServices = services.map((service) => ({
          service_id: service.service_id,
          id: service.service_id, // Alias for compatibility
          name: service.name,
          service_name: service.name, // Alias for compatibility
          price: service.base_price || 0,
        }))
        console.log('✅ [GTM] Fetched services for tracking:', selectedServices.length)
      } else {
        console.error('❌ [GTM] Error fetching services:', servicesError)
        // Fallback: create minimal service objects from IDs
        selectedServices = selectedServiceIds.map((serviceId) => ({
          service_id: serviceId,
          id: serviceId,
          name: '',
          service_name: '',
          price: 0,
        }))
        console.warn('⚠️ [GTM] Using fallback service data')
      }
    }
    
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

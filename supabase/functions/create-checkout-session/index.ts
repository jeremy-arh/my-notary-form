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
    const { formData } = await req.json()

    if (!formData) {
      throw new Error('Missing required field: formData')
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user session (using anon key for user context)
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') as string, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
    } = await supabaseAnon.auth.getUser()

    // Create user account if guest
    let userId = user?.id || null
    let accountCreated = false

    if (!userId && formData.email) {
      // Create account with password if provided, otherwise generate random password
      const password = formData.password || crypto.randomUUID()

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: password,
        email_confirm: true,
      })

      if (authError) {
        console.error('❌ [AUTH] Failed to create account:', authError)

        // If account already exists, try to get the user by email
        if (authError.message?.includes('already been registered') || authError.code === 'email_exists') {
          console.log('🔍 [AUTH] Account exists, fetching user by email:', formData.email)

          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

          if (!listError && users) {
            const existingUser = users.find(u => u.email === formData.email)
            if (existingUser) {
              userId = existingUser.id
              accountCreated = false
              console.log('✅ [AUTH] Found existing user:', userId)
            } else {
              console.error('❌ [AUTH] Could not find user with email:', formData.email)
            }
          } else {
            console.error('❌ [AUTH] Error listing users:', listError)
          }
        }
      } else if (authData.user) {
        userId = authData.user.id
        accountCreated = true
        console.log('✅ [AUTH] Created new account for:', formData.email, 'with auto-generated password:', !formData.password)
      }
    }

    // Get or create client record
    let clientId = null

    console.log('🔍 [CLIENT] userId:', userId, 'accountCreated:', accountCreated)

    if (userId) {
      // Try to get existing client
      const { data: existingClient, error: fetchError } = await supabase
        .from('client')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle() // Use maybeSingle() instead of single() to avoid error when not found

      console.log('🔍 [CLIENT] Existing client:', existingClient, 'Error:', fetchError)

      if (existingClient) {
        clientId = existingClient.id
        console.log('✅ [CLIENT] Found existing client:', clientId)
      } else if (!fetchError || fetchError.code === 'PGRST116') {
        // Create new client record (PGRST116 = no rows returned, which is expected)
        console.log('🆕 [CLIENT] Creating new client for userId:', userId)

        // Use auth user email as fallback if formData.email is empty
        const clientEmail = formData.email || user?.email

        if (!clientEmail) {
          console.error('❌ [CLIENT] No email available for client creation')
          throw new Error('Email is required to create client account')
        }

        const clientData = {
          user_id: userId,
          first_name: formData.firstName || 'Guest',
          last_name: formData.lastName || 'User',
          email: clientEmail,
          phone: formData.phone || '',
          address: formData.address || '',
          city: formData.city || '',
          postal_code: formData.postalCode || '',
          country: formData.country || '',
        }

        console.log('🆕 [CLIENT] Client data to insert:', JSON.stringify(clientData, null, 2))

        const { data: newClient, error: clientError } = await supabase
          .from('client')
          .insert([clientData])
          .select('id')
          .single()

        console.log('🆕 [CLIENT] New client result:', newClient, 'Error:', clientError)

        if (clientError) {
          console.error('❌ [CLIENT] Error creating client:', clientError)
          // Don't throw here, let submission continue with null client_id
        }

        if (!clientError && newClient) {
          clientId = newClient.id
          console.log('✅ [CLIENT] Created new client:', clientId)
        }
      } else {
        console.error('❌ [CLIENT] Unexpected error fetching client:', fetchError)
      }
    } else {
      console.warn('⚠️ [CLIENT] No userId - submission will have null client_id')
    }

    console.log('📋 [CLIENT] Final clientId for submission:', clientId)

    // Service documents are already uploaded and converted to metadata in NotaryForm.jsx
    console.log('📁 [FILES] Received service documents:', JSON.stringify(formData.serviceDocuments, null, 2))

    // Create temporary submission in database with status 'pending_payment'
    const submissionData = {
      client_id: clientId,
      status: 'pending_payment',
      appointment_date: formData.appointmentDate,
      appointment_time: formData.appointmentTime,
      timezone: formData.timezone,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      postal_code: formData.postalCode,
      country: formData.country,
      notes: formData.notes || null,
      data: {
        selectedServices: formData.selectedServices,
        serviceDocuments: formData.serviceDocuments, // Already converted
      },
    }

    console.log('💾 [SUBMISSION] Creating submission with data:', JSON.stringify(submissionData, null, 2))

    const { data: submission, error: submissionError } = await supabase
      .from('submission')
      .insert([submissionData])
      .select()
      .single()

    if (submissionError) {
      console.error('❌ [SUBMISSION] Error creating submission:', submissionError)
      throw new Error('Failed to create submission: ' + submissionError.message)
    }

    console.log('✅ [SUBMISSION] Created submission:', submission.id, 'with client_id:', submission.client_id)

    // Fetch services from database to get pricing
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)

    if (servicesError) {
      console.error('❌ [SERVICES] Error fetching services:', servicesError)
      throw new Error('Failed to fetch services: ' + servicesError.message)
    }

    console.log('✅ [SERVICES] Fetched services:', services.length)

    // Create a map of service_id to service
    const servicesMap = {}
    services.forEach(service => {
      servicesMap[service.service_id] = service
    })

    // Get apostille service
    const apostilleService = servicesMap['473fb677-4dd3-4766-8221-0250ea3440cd']
    console.log('📋 [APOSTILLE] Apostille service:', apostilleService ? `${apostilleService.name} - $${apostilleService.base_price}` : 'Not found')

    // Calculate line items for Stripe from selected services and documents
    const lineItems = []
    let totalApostilleCount = 0

    if (formData.selectedServices && formData.selectedServices.length > 0) {
      for (const serviceId of formData.selectedServices) {
        const service = servicesMap[serviceId]
        if (service) {
          // Get document count for this service
          const documentsForService = formData.serviceDocuments?.[serviceId] || []
          const documentCount = documentsForService.length

          if (documentCount > 0) {
            // Add main service line item
            lineItems.push({
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `${service.name} (${documentCount} document${documentCount > 1 ? 's' : ''})`,
                  description: service.short_description || service.description,
                },
                unit_amount: Math.round(service.base_price * 100), // Convert to cents
              },
              quantity: documentCount,
            })
            console.log(`✅ [SERVICES] Added service: ${service.name} × ${documentCount} documents = $${(service.base_price * documentCount).toFixed(2)}`)

            // Count apostilles for this service
            const apostilleCount = documentsForService.filter(doc => doc.hasApostille === true).length
            totalApostilleCount += apostilleCount

            if (apostilleCount > 0) {
              console.log(`📋 [APOSTILLE] Service ${service.name} has ${apostilleCount} documents with apostille`)
            }
          } else {
            console.warn(`⚠️ [SERVICES] No documents for service: ${serviceId}`)
          }
        } else {
          console.warn(`⚠️ [SERVICES] Service not found: ${serviceId}`)
        }
      }
    }

    // Add apostille line item if any documents have apostille selected
    if (totalApostilleCount > 0 && apostilleService) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Apostille Service (${totalApostilleCount} document${totalApostilleCount > 1 ? 's' : ''})`,
            description: apostilleService.short_description || apostilleService.description,
          },
          unit_amount: Math.round(apostilleService.base_price * 100),
        },
        quantity: totalApostilleCount,
      })
      console.log(`✅ [APOSTILLE] Added apostille: ${totalApostilleCount} documents × $${apostilleService.base_price} = $${(apostilleService.base_price * totalApostilleCount).toFixed(2)}`)
    }

    // Ensure we have at least one line item
    if (lineItems.length === 0) {
      console.error('❌ [SERVICES] No valid services with documents selected')
      throw new Error('No valid services with documents selected')
    }

    // Create Stripe Checkout Session with minimal metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/payment/failed`,
      customer_email: formData.email || user?.email,
      metadata: {
        submission_id: submission.id,
        client_id: clientId || 'guest',
        account_created: accountCreated ? 'true' : 'false',
      },
    })

    return new Response(
      JSON.stringify({ url: session.url, submissionId: submission.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

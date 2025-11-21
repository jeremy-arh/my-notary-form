import { serve } from 'https://deno.land/std@0.177.1/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Fonction de conversion de devises (EUR vers autres devises)
// Les prix dans la base de données sont stockés en EUR
const convertCurrency = (amountEUR: number, targetCurrency: string): number => {
  const exchangeRates: { [key: string]: number } = {
    'EUR': 1.0,
    'USD': 1.10, // Exemple: 1 EUR = 1.10 USD
    'GBP': 0.85, // Exemple: 1 EUR = 0.85 GBP
    'CAD': 1.50, // Exemple: 1 EUR = 1.50 CAD
    'AUD': 1.65, // Exemple: 1 EUR = 1.65 AUD
    'CHF': 0.95, // Exemple: 1 EUR = 0.95 CHF
    'JPY': 165.0, // Exemple: 1 EUR = 165 JPY
    'CNY': 7.80, // Exemple: 1 EUR = 7.80 CNY
  }
  
  const rate = exchangeRates[targetCurrency.toUpperCase()] || 1.0
  return amountEUR * rate
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Declare variables outside try block for access in catch
  let formData: any = null
  let submissionId: string | undefined = undefined
  let stripeCustomerId: string | null = null

  try {
      let body: any = null
      try {
        body = await req.json()
        formData = body.formData
        submissionId = body.submissionId
    } catch (jsonError: any) {
      console.error('❌ [ERROR] Failed to parse request body:', jsonError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: jsonError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (!formData) {
      throw new Error('Missing required field: formData')
    }

    // Récupérer la devise : d'abord depuis le paramètre séparé, puis depuis formData (par défaut EUR)
    let currency = (body.currency || formData.currency || 'EUR').toUpperCase()
    let stripeCurrency = currency.toLowerCase() // Stripe utilise des codes en minuscules
    console.log('💰 [CURRENCY] Devise détectée:', currency, '(Stripe:', stripeCurrency + ')')
    console.log('💰 [CURRENCY] body.currency:', body.currency)
    console.log('💰 [CURRENCY] formData.currency:', formData.currency)

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

    let submission
    let clientId
    let accountCreated = false

    // Check if this is a retry payment (existing submission)
    if (submissionId) {
      console.log('🔄 [RETRY] Using existing submission:', submissionId)

      const { data: existingSubmission, error: fetchError } = await supabase
        .from('submission')
        .select('*')
        .eq('id', submissionId)
        .single()

      if (fetchError) {
        console.error('❌ [RETRY] Error fetching submission:', fetchError)
        throw new Error('Failed to fetch submission: ' + fetchError.message)
      }

      submission = existingSubmission
      clientId = existingSubmission.client_id
      console.log('✅ [RETRY] Using existing submission and client_id:', clientId)

    } else {
      // NEW SUBMISSION: Create user account if guest
      let userId = user?.id || null

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

      // Get or create client record and Stripe customer
      console.log('🔍 [CLIENT] userId:', userId, 'accountCreated:', accountCreated)

      if (userId) {
      // Try to get existing client
      const { data: existingClient, error: fetchError } = await supabase
        .from('client')
        .select('id, stripe_customer_id')
        .eq('user_id', userId)
        .maybeSingle() // Use maybeSingle() instead of single() to avoid error when not found

      console.log('🔍 [CLIENT] Existing client:', existingClient, 'Error:', fetchError)

      if (existingClient) {
        clientId = existingClient.id
        stripeCustomerId = existingClient.stripe_customer_id || null
        console.log('✅ [CLIENT] Found existing client:', clientId, 'Stripe customer:', stripeCustomerId || 'None')
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

      // Create or retrieve Stripe customer if we have a client
      if (clientId && !stripeCustomerId) {
        console.log('💳 [STRIPE] Creating Stripe customer for client:', clientId)
        
        const clientEmail = formData.email || user?.email
        const clientName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Guest User'
        
        try {
          const customer = await stripe.customers.create({
            email: clientEmail,
            name: clientName,
            phone: formData.phone || undefined,
            metadata: {
              client_id: clientId,
              user_id: userId || '',
            }
          })
          
          stripeCustomerId = customer.id
          console.log('✅ [STRIPE] Created Stripe customer:', stripeCustomerId)
          
          // Update client record with Stripe customer ID
          const { error: updateError } = await supabase
            .from('client')
            .update({ stripe_customer_id: stripeCustomerId })
            .eq('id', clientId)
          
          if (updateError) {
            console.error('⚠️ [STRIPE] Could not update client with Stripe customer ID:', updateError)
          } else {
            console.log('✅ [STRIPE] Updated client with Stripe customer ID')
          }
        } catch (stripeError: any) {
          console.error('❌ [STRIPE] Error creating Stripe customer:', stripeError.message)
          // Don't throw - continue without Stripe customer (will use customer_email instead)
        }
      } else if (stripeCustomerId) {
        console.log('✅ [STRIPE] Using existing Stripe customer:', stripeCustomerId)
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
          signatories: formData.signatories || [], // Signatories data (global list)
          currency: currency, // Stocker la devise dans les données de la submission
        },
      }

      console.log('💾 [SUBMISSION] Creating submission with data:', JSON.stringify(submissionData, null, 2))
      console.log('👥 [SIGNATORIES] Signatories in submission.data:', JSON.stringify(submissionData.data.signatories, null, 2))
      console.log('👥 [SIGNATORIES] Signatories count:', submissionData.data.signatories?.length || 0)

      const { data: newSubmission, error: submissionError } = await supabase
        .from('submission')
        .insert([submissionData])
        .select()
        .single()

      if (submissionError) {
        console.error('❌ [SUBMISSION] Error creating submission:', submissionError)
        throw new Error('Failed to create submission: ' + submissionError.message)
      }

      submission = newSubmission
      console.log('✅ [SUBMISSION] Created submission:', submission.id, 'with client_id:', submission.client_id)

      // NOTE: Notifications to notaries are now sent only after payment is successful
      // See verify-payment function for notification logic
    }

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

    // Fetch options from database
    const { data: options, error: optionsError } = await supabase
      .from('options')
      .select('*')
      .eq('is_active', true)

    if (optionsError) {
      console.error('❌ [OPTIONS] Error fetching options:', optionsError)
      throw new Error('Failed to fetch options: ' + optionsError.message)
    }

    console.log('✅ [OPTIONS] Fetched options:', options?.length || 0)

    // Create a map of option_id to option
    const optionsMap = {}
    if (options) {
      options.forEach(option => {
        optionsMap[option.option_id] = option
      })
    }

    // Si c'est une soumission existante, vérifier d'abord le paramètre currency séparé,
    // puis les données de la submission, sinon utiliser la devise déjà récupérée
    if (submissionId && submission) {
      // Le paramètre currency séparé a la priorité (déjà récupéré au début)
      // Si pas de paramètre séparé, utiliser la devise de la submission
      if (!body.currency && submission.data?.currency) {
        const submissionCurrency = (submission.data.currency || 'EUR').toUpperCase()
        currency = submissionCurrency
        stripeCurrency = currency.toLowerCase()
        console.log('💰 [CURRENCY] Devise récupérée depuis la submission existante:', currency, '(Stripe:', stripeCurrency + ')')
      } else {
        console.log('💰 [CURRENCY] Utilisation de la devise du paramètre séparé:', currency, '(Stripe:', stripeCurrency + ')')
      }
    }

    // Calculate line items for Stripe from selected services and documents
    const lineItems = []
    const optionCounts = {} // Track total count per option across all services

    if (formData.selectedServices && formData.selectedServices.length > 0) {
      for (const serviceId of formData.selectedServices) {
        const service = servicesMap[serviceId]
        if (service) {
          // Get document count for this service
          const documentsForService = formData.serviceDocuments?.[serviceId] || []
          const documentCount = documentsForService.length

          if (documentCount > 0) {
            // Convertir le prix depuis EUR vers la devise demandée
            const priceInCurrency = convertCurrency(service.base_price || 0, currency)
            // Pour JPY, Stripe n'accepte pas les centimes (utiliser des unités entières)
            // Pour les autres devises, convertir en centimes
            const unitAmount = currency === 'JPY' 
              ? Math.round(priceInCurrency) 
              : Math.round(priceInCurrency * 100)
            
            // Add main service line item
            lineItems.push({
              price_data: {
                currency: stripeCurrency,
                product_data: {
                  name: `${service.name} (${documentCount} document${documentCount > 1 ? 's' : ''})`,
                  description: service.short_description || service.description,
                },
                unit_amount: unitAmount,
              },
              quantity: documentCount,
            })
            console.log(`✅ [SERVICES] Added service: ${service.name} × ${documentCount} documents = ${currency}${(priceInCurrency * documentCount).toFixed(currency === 'JPY' ? 0 : 2)} (${service.base_price} EUR converted)`)

            // Count options for this service
            console.log(`📋 [OPTIONS DEBUG] Checking documents for service ${service.name}:`)
            documentsForService.forEach((doc, idx) => {
              console.log(`   Document ${idx}: ${doc.name}`)
              console.log(`   selectedOptions (raw):`, doc.selectedOptions, typeof doc.selectedOptions)
              
              // Handle selectedOptions - could be array, string, or null/undefined
              let optionsArray = []
              
              if (doc.selectedOptions) {
                if (Array.isArray(doc.selectedOptions)) {
                  optionsArray = doc.selectedOptions
                } else if (typeof doc.selectedOptions === 'string') {
                  // Try to parse as JSON string
                  try {
                    const parsed = JSON.parse(doc.selectedOptions)
                    if (Array.isArray(parsed)) {
                      optionsArray = parsed
                    } else {
                      console.warn(`   ⚠️ Parsed selectedOptions is not an array:`, parsed)
                    }
                  } catch (parseError) {
                    console.warn(`   ⚠️ Failed to parse selectedOptions as JSON:`, parseError)
                    // If it's a single string value, treat it as a single-item array
                    optionsArray = [doc.selectedOptions]
                  }
                } else {
                  console.warn(`   ⚠️ selectedOptions is neither array nor string:`, typeof doc.selectedOptions)
                }
              }

              console.log(`   Options array:`, optionsArray)
              console.log(`   Options count:`, optionsArray.length)

              if (optionsArray.length > 0) {
                optionsArray.forEach(optionId => {
                  console.log(`   Adding option: ${optionId}`)
                  optionCounts[optionId] = (optionCounts[optionId] || 0) + 1
                })
              } else {
                console.log(`   ⚠️ No options to add`)
              }
            })
          } else {
            console.warn(`⚠️ [SERVICES] No documents for service: ${serviceId}`)
          }
        } else {
          console.warn(`⚠️ [SERVICES] Service not found: ${serviceId}`)
        }
      }
    }

    // Add line items for options
    console.log(`📋 [OPTIONS SUMMARY] Total option counts:`, optionCounts)
    console.log(`📋 [OPTIONS SUMMARY] Number of different options:`, Object.keys(optionCounts).length)

    if (Object.keys(optionCounts).length > 0) {
      for (const [optionId, count] of Object.entries(optionCounts)) {
        const option = optionsMap[optionId]
        console.log(`📋 [OPTIONS] Processing option ${optionId}:`, option ? option.name : 'NOT FOUND')

        if (option && option.additional_price) {
          // Convertir le prix depuis EUR vers la devise demandée
          const priceInCurrency = convertCurrency(option.additional_price || 0, currency)
          // Pour JPY, Stripe n'accepte pas les centimes (utiliser des unités entières)
          const unitAmount = currency === 'JPY' 
            ? Math.round(priceInCurrency) 
            : Math.round(priceInCurrency * 100)
          
          lineItems.push({
            price_data: {
              currency: stripeCurrency,
              product_data: {
                name: `${option.name} (${count} document${count > 1 ? 's' : ''})`,
                description: option.description || '',
              },
              unit_amount: unitAmount,
            },
            quantity: count,
          })
          console.log(`✅ [OPTIONS] Added option: ${option.name} × ${count} documents = ${currency}${(priceInCurrency * count).toFixed(currency === 'JPY' ? 0 : 2)} (${option.additional_price} EUR converted)`)
        } else {
          console.warn(`⚠️ [OPTIONS] Option ${optionId} not found or has no price`)
        }
      }
    } else {
      console.log(`⚠️ [OPTIONS] No options selected`)
    }

    // Calculate additional signatories cost (€10 per additional signatory, first one is included)
    let additionalSignatoriesCount = 0
    if (formData.signatories && Array.isArray(formData.signatories)) {
      console.log('📋 [SIGNATORIES] Processing signatories:', formData.signatories.length, 'signatories (global)')
      if (formData.signatories.length > 1) {
        // First signatory is included, count additional ones
        additionalSignatoriesCount = formData.signatories.length - 1
        console.log(`   Total: ${formData.signatories.length} signatories (${additionalSignatoriesCount} additional)`)
      } else if (formData.signatories.length === 1) {
        console.log(`   Total: 1 signatory (included)`)
      }
      
      if (additionalSignatoriesCount > 0) {
        const additionalSignatoriesPriceEUR = 10.00 // €10 per additional signatory (en EUR)
        // Convertir le prix depuis EUR vers la devise demandée
        const additionalSignatoriesPrice = convertCurrency(additionalSignatoriesPriceEUR, currency)
        // Pour JPY, Stripe n'accepte pas les centimes (utiliser des unités entières)
        const unitAmount = currency === 'JPY' 
          ? Math.round(additionalSignatoriesPrice) 
          : Math.round(additionalSignatoriesPrice * 100)
        
        lineItems.push({
          price_data: {
            currency: stripeCurrency,
            product_data: {
              name: `Additional Signatories (${additionalSignatoriesCount} signatory${additionalSignatoriesCount > 1 ? 'ies' : ''})`,
              description: 'Fee for additional signatories (the first signatory is included)',
            },
            unit_amount: unitAmount,
          },
          quantity: additionalSignatoriesCount, // Quantity should match the number of additional signatories
        })
        console.log(`✅ [SIGNATORIES] Added ${additionalSignatoriesCount} additional signatories = ${currency}${(additionalSignatoriesPrice * additionalSignatoriesCount).toFixed(currency === 'JPY' ? 0 : 2)} (${additionalSignatoriesPriceEUR} EUR converted)`)
      } else {
        console.log(`ℹ️ [SIGNATORIES] No additional signatories (only first signatory per document)`)
      }
    } else {
      console.log(`⚠️ [SIGNATORIES] No signatories data found`)
    }

    // Ensure we have at least one line item
    if (lineItems.length === 0) {
      console.error('❌ [SERVICES] No valid services with documents selected')
      throw new Error('No valid services with documents selected')
    }

    // Create Stripe Checkout Session with minimal metadata
    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/payment/failed`,
      metadata: {
        submission_id: submission.id,
        client_id: clientId || 'guest',
        account_created: accountCreated ? 'true' : 'false',
      },
    }

    // Use Stripe customer ID if available, otherwise use customer_email
    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId
      // Enable saving payment method for future use
      sessionParams.payment_method_options = {
        card: {
          setup_future_usage: 'off_session'
        }
      }
      console.log('💳 [STRIPE] Using Stripe customer for checkout session:', stripeCustomerId)
      console.log('💳 [STRIPE] Payment method will be saved for future off_session charges')
    } else {
      sessionParams.customer_email = formData.email || user?.email
      // Even without customer, we can save payment method for future use
      sessionParams.payment_method_options = {
        card: {
          setup_future_usage: 'off_session'
        }
      }
      console.log('💳 [STRIPE] Using customer_email for checkout session')
      console.log('💳 [STRIPE] Payment method will be saved (will be attached when customer is created)')
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(
      JSON.stringify({ url: session.url, submissionId: submission.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ [ERROR] Error creating checkout session:', error)
    console.error('❌ [ERROR] Error type:', error?.constructor?.name)
    console.error('❌ [ERROR] Error message:', error?.message)
    console.error('❌ [ERROR] Error stack:', error?.stack)
    
    // Log formData for debugging (without sensitive info)
    try {
      if (formData) {
        console.error('❌ [ERROR] FormData received:', {
          selectedServices: formData.selectedServices,
          serviceDocumentsKeys: formData.serviceDocuments ? Object.keys(formData.serviceDocuments) : null,
          hasEmail: !!formData.email,
          hasAppointmentDate: !!formData.appointmentDate,
        })
      }
    } catch (logError) {
      console.error('❌ [ERROR] Could not log formData:', logError)
    }
    
    // Return more detailed error information with CORS headers
    const errorMessage = error?.message || 'Unknown error occurred'
    const errorDetails = {
      error: errorMessage,
      type: error?.constructor?.name || 'Error',
      stack: error?.stack || undefined,
    }
    
    return new Response(
      JSON.stringify(errorDetails),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
        status: 400,
      }
    )
  }
})

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
    const { formData, amount } = await req.json()

    if (!formData || !amount) {
      throw new Error('Missing required fields: formData and amount')
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

    // Create user account if guest and has password
    let userId = user?.id || null
    let accountCreated = false

    if (!userId && formData.email && formData.password) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
      })

      if (!authError && authData.user) {
        userId = authData.user.id
        accountCreated = true
      }
    }

    // Prepare simplified document data (just names and sizes, not file objects)
    const simplifiedDocuments = formData.documents?.map((doc: any) => ({
      name: doc.name,
      size: doc.size,
      type: doc.type
    })) || []

    // Create temporary submission in database with status 'pending_payment'
    const submissionData = {
      client_id: userId,
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
        selectedOptions: formData.selectedOptions,
        documents: simplifiedDocuments,
      },
    }

    const { data: submission, error: submissionError } = await supabase
      .from('submission')
      .insert([submissionData])
      .select()
      .single()

    if (submissionError) {
      console.error('Error creating submission:', submissionError)
      throw new Error('Failed to create submission')
    }

    // Calculate line items for Stripe
    const lineItems = []

    // Base notary service
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Notary Service Fee',
          description: 'Base notary service',
        },
        unit_amount: 7500, // $75.00 in cents
      },
      quantity: 1,
    })

    // Additional services
    if (formData.selectedOptions?.includes('urgent')) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Urgent Service (48h)',
          },
          unit_amount: 5000, // $50.00
        },
        quantity: 1,
      })
    }

    if (formData.selectedOptions?.includes('home-visit')) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Home Visit',
          },
          unit_amount: 10000, // $100.00
        },
        quantity: 1,
      })
    }

    if (formData.selectedOptions?.includes('translation')) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Translation Service',
          },
          unit_amount: 3500, // $35.00
        },
        quantity: 1,
      })
    }

    if (formData.selectedOptions?.includes('consultation')) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Legal Consultation',
          },
          unit_amount: 15000, // $150.00
        },
        quantity: 1,
      })
    }

    // Document processing
    if (simplifiedDocuments.length > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Document Processing (${simplifiedDocuments.length} files)`,
          },
          unit_amount: 1000, // $10.00 per document
        },
        quantity: simplifiedDocuments.length,
      })
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
        client_id: userId || 'guest',
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

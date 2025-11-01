import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') as string

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Get user session
    const {
      data: { user },
    } = await supabase.auth.getUser()

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
    if (formData.documents?.length > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Document Processing (${formData.documents.length} files)`,
          },
          unit_amount: 1000, // $10.00 per document
        },
        quantity: formData.documents.length,
      })
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/payment/failed`,
      customer_email: formData.email || user?.email,
      metadata: {
        user_id: user?.id || 'guest',
        form_data: JSON.stringify(formData),
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
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

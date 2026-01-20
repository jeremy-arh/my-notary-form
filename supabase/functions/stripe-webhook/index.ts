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
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('Missing stripe-signature header')
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET')
    }

    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('💳 [WEBHOOK] Payment intent succeeded:', paymentIntent.id)
        // Les données sont automatiquement synchronisées dans stripe.balance_transactions par Supabase
        // Pas besoin d'insérer manuellement
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // Payment success is handled by payment_intent.succeeded
        console.log('Checkout session completed:', session.id)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log('💳 [WEBHOOK] Charge refunded:', charge.id)
        // Les données sont automatiquement synchronisées dans stripe.balance_transactions par Supabase
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const sessionId = paymentIntent.metadata?.session_id

        if (sessionId) {
          // Get session to find submission_id
          const session = await stripe.checkout.sessions.retrieve(sessionId)
          const submissionId = session.metadata?.submission_id

          if (submissionId) {
            // Get submission and client info
            const { data: submissionData, error: subError } = await supabase
              .from('submission')
              .select('id, client_id, first_name, last_name')
              .eq('id', submissionId)
              .single()

            if (!subError && submissionData && submissionData.client_id) {
              // Get client info
              const { data: clientData, error: clientError } = await supabase
                .from('client')
                .select('email, first_name, last_name')
                .eq('id', submissionData.client_id)
                .single()

              if (!clientError && clientData && clientData.email) {
                const clientName = `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim() || 'Client'
                const submissionNumber = submissionId.substring(0, 8)
                const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed'

                // Send transactional email
                const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
                  body: {
                    email_type: 'payment_failed',
                    recipient_email: clientData.email,
                    recipient_name: clientName,
                    recipient_type: 'client',
                    data: {
                      submission_id: submissionId,
                      submission_number: submissionNumber,
                      error_message: errorMessage
                    }
                  }
                })

                if (emailError) {
                  console.error('Error sending payment failed email:', emailError)
                } else {
                  console.log('Payment failed email sent to:', clientData.email)
                }
              }
            }
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})


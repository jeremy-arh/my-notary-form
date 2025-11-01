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

    return new Response(
      JSON.stringify({
        verified: true,
        submissionId: submission.id,
        accountCreated: accountCreated,
        invoiceUrl: invoiceUrl,
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

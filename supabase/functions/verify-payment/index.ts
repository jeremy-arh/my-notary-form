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
    const { sessionId } = await req.json()

    if (!sessionId) {
      throw new Error('Missing session ID')
    }

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ verified: false, error: 'Payment not completed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse form data from session metadata
    const formData = JSON.parse(session.metadata.form_data)

    // Create user account if doesn't exist (guest checkout)
    let userId = session.metadata.user_id

    if (userId === 'guest' && formData.email && formData.password) {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
      })

      if (authError) {
        console.error('Error creating user:', authError)
        // If user already exists, try to get their ID
        const { data: existingUser } = await supabase
          .from('auth.users')
          .select('id')
          .eq('email', formData.email)
          .single()

        userId = existingUser?.id || userId
      } else {
        userId = authData.user.id
      }
    }

    // Upload documents to storage if any
    const documentUrls = []
    if (formData.documents && formData.documents.length > 0) {
      for (const doc of formData.documents) {
        // Note: In real implementation, documents should be uploaded from client
        // and their URLs stored in formData before payment
        documentUrls.push({
          name: doc.name,
          url: `placeholder-url-${doc.name}`,
        })
      }
    }

    // Insert submission into database
    const submissionData = {
      user_id: userId !== 'guest' ? userId : null,
      status: 'pending',
      type: 'notary_request',
      data: {
        ...formData,
        documents: documentUrls,
        payment: {
          stripe_session_id: sessionId,
          amount_paid: session.amount_total,
          currency: session.currency,
          payment_status: session.payment_status,
        },
      },
      email: formData.email,
      first_name: formData.firstName,
      last_name: formData.lastName,
      phone: formData.phone,
      appointment_date: formData.appointmentDate,
      appointment_time: formData.appointmentTime,
    }

    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .insert([submissionData])
      .select()
      .single()

    if (submissionError) {
      console.error('Error creating submission:', submissionError)
      throw new Error('Failed to create submission')
    }

    return new Response(
      JSON.stringify({
        verified: true,
        submissionId: submission.id,
        accountCreated: userId !== 'guest' && session.metadata.user_id === 'guest',
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

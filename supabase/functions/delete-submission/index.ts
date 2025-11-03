import { serve } from 'https://deno.land/std@0.177.1/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

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
    const { submissionId } = await req.json()

    if (!submissionId) {
      throw new Error('Missing required field: submissionId')
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

    if (!user) {
      throw new Error('User not authenticated')
    }

    console.log('🔍 [DELETE] User requesting deletion:', user.id)

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('client')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (clientError) {
      console.error('❌ [DELETE] Error fetching client:', clientError)
      throw new Error('Client not found')
    }

    console.log('🔍 [DELETE] Client ID:', client.id)

    // Get submission to verify ownership and status
    const { data: submission, error: submissionError } = await supabase
      .from('submission')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (submissionError) {
      console.error('❌ [DELETE] Error fetching submission:', submissionError)
      throw new Error('Submission not found')
    }

    console.log('🔍 [DELETE] Submission client_id:', submission.client_id, 'status:', submission.status)

    // Verify ownership
    if (submission.client_id !== client.id) {
      console.error('❌ [DELETE] Unauthorized: submission does not belong to client')
      throw new Error('Unauthorized: You can only delete your own submissions')
    }

    // Verify status is pending_payment
    if (submission.status !== 'pending_payment') {
      console.error('❌ [DELETE] Invalid status:', submission.status)
      throw new Error('Only submissions with pending_payment status can be deleted')
    }

    // Delete the submission
    const { error: deleteError } = await supabase
      .from('submission')
      .delete()
      .eq('id', submissionId)

    if (deleteError) {
      console.error('❌ [DELETE] Error deleting submission:', deleteError)
      throw new Error('Failed to delete submission: ' + deleteError.message)
    }

    console.log('✅ [DELETE] Submission deleted successfully:', submissionId)

    return new Response(
      JSON.stringify({ success: true, message: 'Submission deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error deleting submission:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

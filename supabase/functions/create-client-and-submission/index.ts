import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    const {
      email,
      firstName,
      lastName,
      phone,
      address,
      city,
      postalCode,
      country,
      selectedServices = [],
      documents = {},
      deliveryMethod,
      signatories = [],
      currentStep,
      sessionId,
      submissionId,
      password // Password for new user creation and auto-login
    } = await req.json()

    if (!email || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: 'Email, first name, and last name are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Determine funnel status based on current step
    // Note: signatories_added step has been removed from the form
    const getFunnelStatus = (step: number) => {
      if (step >= 4) return 'personal_info_completed'
      if (step >= 3) return 'delivery_method_selected'
      if (step >= 2) return 'documents_uploaded'
      if (step >= 1) return 'services_selected'
      return 'started'
    }

    const funnelStatus = getFunnelStatus(currentStep || 4)

    // 1. Check if client exists by email
    let clientId: string | null = null
    let userId: string | null = null
    let userCreated = false // Track if a new user was created
    let userPassword: string | null = null // Store password for new users only

    console.log('🔍 [EDGE-FUNCTION] Checking if client exists with email:', email)
    
    const { data: existingClient, error: clientCheckError } = await supabase
      .from('client')
      .select('id, user_id, email')
      .eq('email', email.toLowerCase().trim()) // Normalize email for comparison
      .maybeSingle()

    if (clientCheckError) {
      console.error('❌ [EDGE-FUNCTION] Error checking for existing client:', clientCheckError)
    }

    if (existingClient) {
      console.log('✅ [EDGE-FUNCTION] Client already exists:', existingClient.id)
      clientId = existingClient.id
      userId = existingClient.user_id

      // Update client with latest info (funnel_status is only for submissions, not clients)
      const { error: updateError } = await supabase
        .from('client')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          address: address || null,
          city: city || null,
          postal_code: postalCode || null,
          country: country || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)

      if (updateError) {
        console.error('❌ [EDGE-FUNCTION] Error updating client:', updateError)
      } else {
        console.log('✅ [EDGE-FUNCTION] Client updated successfully')
      }
    } else {
      console.log('✨ [EDGE-FUNCTION] Client does not exist, creating new client/user')
      // 2. Check if auth user exists by email first
      console.log('🔍 [EDGE-FUNCTION] Checking if auth user exists with email:', email)
      const { data: usersList } = await supabase.auth.admin.listUsers()
      const existingAuthUser = usersList?.users.find(u => 
        u.email?.toLowerCase().trim() === email.toLowerCase().trim()
      )

      if (existingAuthUser) {
        console.log('✅ [EDGE-FUNCTION] Auth user already exists:', existingAuthUser.id)
        userId = existingAuthUser.id
      } else {
        // Create new auth user with password
        console.log('✨ [EDGE-FUNCTION] Creating new auth user')
        // Get password from request body, or generate one if not provided
        const newPassword = password || crypto.randomUUID()
        const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
          email: email.toLowerCase().trim(),
          password: newPassword, // Set password for auto-login
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            user_type: 'client'
          }
        })

        if (signUpError) {
          console.error('❌ [EDGE-FUNCTION] Error creating auth user:', signUpError)
          // Try to get user again in case it was created by another process
          const { data: usersRetry } = await supabase.auth.admin.listUsers()
          const retryUser = usersRetry?.users.find(u => 
            u.email?.toLowerCase().trim() === email.toLowerCase().trim()
          )
          userId = retryUser?.id || null
        } else {
          userId = authData?.user?.id || null
          userCreated = true
          userPassword = newPassword // Store password for auto-login
          console.log('✅ [EDGE-FUNCTION] Auth user created:', userId)
        }
      }

      // 3. Create client record (funnel_status is only for submissions, not clients)
      console.log('💾 [EDGE-FUNCTION] Creating client record with userId:', userId)
      const { data: newClient, error: clientError } = await supabase
        .from('client')
        .insert({
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase().trim(),
          phone: phone || null,
          address: address || null,
          city: city || null,
          postal_code: postalCode || null,
          country: country || null
        })
        .select('id')
        .single()

      if (clientError) {
        console.error('❌❌❌ [EDGE-FUNCTION] Error creating client ❌❌❌')
        console.error('❌ [EDGE-FUNCTION] Error code:', clientError.code)
        console.error('❌ [EDGE-FUNCTION] Error message:', clientError.message)
        console.error('❌ [EDGE-FUNCTION] Error details:', clientError.details)
        console.error('❌ [EDGE-FUNCTION] Error hint:', clientError.hint)
        throw clientError
      }

      clientId = newClient.id
      console.log('✅ [EDGE-FUNCTION] Client created successfully:', clientId)
    }

    // 4. Link ALL submissions with the same email to this client (ALWAYS, even if client exists)
    // Use SQL directly to ensure case-insensitive matching and bypass any potential RLS issues
    console.log('%c🔗🔗🔗 ASSOCIATING ALL SUBMISSIONS WITH EMAIL 🔗🔗🔗', 'background: blue; color: white; font-size: 18px; padding: 10px;')
    console.log('🔗 [EDGE-FUNCTION] Email:', email.toLowerCase().trim())
    console.log('🔗 [EDGE-FUNCTION] Client ID:', clientId)
    console.log('🔗 [EDGE-FUNCTION] Client exists?', !!existingClient)
    
    // Use RPC call or direct SQL to update all submissions with matching email
    // This ensures case-insensitive matching and handles any whitespace issues
    const normalizedEmail = email.toLowerCase().trim()
    
    // First, find all submissions with this email (case-insensitive)
    const { data: allSubmissionsByEmail, error: findError } = await supabase
      .from('submission')
      .select('id, client_id, email, status, created_at')
      .ilike('email', normalizedEmail) // Case-insensitive LIKE

    if (findError) {
      console.error('❌❌❌ [EDGE-FUNCTION] Error finding submissions by email ❌❌❌')
      console.error('❌ [EDGE-FUNCTION] Error:', findError)
      console.error('❌ [EDGE-FUNCTION] Error details:', findError.details)
      console.error('❌ [EDGE-FUNCTION] Error hint:', findError.hint)
    } else {
      const allSubmissions = allSubmissionsByEmail || []
      console.log(`📋 [EDGE-FUNCTION] Found ${allSubmissions.length} total submission(s) with email matching "${normalizedEmail}"`)
      
      // Log current state of each submission
      allSubmissions.forEach((sub, index) => {
        const needsUpdate = !sub.client_id || sub.client_id !== clientId
        console.log(`   ${index + 1}. Submission ${sub.id}:`)
        console.log(`      - Email: "${sub.email}"`)
        console.log(`      - Current client_id: ${sub.client_id || 'NULL'}`)
        console.log(`      - Status: ${sub.status}`)
        console.log(`      - Needs update: ${needsUpdate ? 'YES' : 'NO'}`)
      })
      
      // Filter submissions that don't have this client_id (either null or different)
      const submissionsToUpdate = allSubmissions.filter(s => 
        !s.client_id || s.client_id !== clientId
      )
      
      console.log(`📋 [EDGE-FUNCTION] ${submissionsToUpdate.length} submission(s) need to be updated with client_id ${clientId}`)
      
      if (submissionsToUpdate.length > 0) {
        // Update each submission individually to ensure it works
        let successCount = 0
        let errorCount = 0
        
        for (const submission of submissionsToUpdate) {
          console.log(`🔄 [EDGE-FUNCTION] Updating submission ${submission.id}...`)
          const { error: updateError, data: updateData } = await supabase
            .from('submission')
            .update({ client_id: clientId })
            .eq('id', submission.id)
            .select('id, client_id')

          if (updateError) {
            errorCount++
            console.error(`❌ [EDGE-FUNCTION] Error updating submission ${submission.id}:`, updateError)
            console.error(`❌ [EDGE-FUNCTION] Error code:`, updateError.code)
            console.error(`❌ [EDGE-FUNCTION] Error message:`, updateError.message)
          } else {
            successCount++
            console.log(`✅ [EDGE-FUNCTION] Successfully updated submission ${submission.id}`)
            if (updateData && updateData.length > 0) {
              console.log(`✅ [EDGE-FUNCTION] Verified: client_id is now ${updateData[0].client_id}`)
            }
          }
        }
        
        console.log(`✅✅✅ [EDGE-FUNCTION] Update complete: ${successCount} succeeded, ${errorCount} failed`)
      } else {
        console.log('✅ [EDGE-FUNCTION] All submissions with this email are already associated with this client_id')
      }
    }

    // 5. Update or create the specific submission for this session
    let finalSubmissionId: string | null = submissionId || null

    if (submissionId) {
      // Helper function to get funnel status order (higher = more advanced)
      const getFunnelStatusOrder = (status: string | null): number => {
        if (!status) return 0;
        const orderMap: Record<string, number> = {
          'started': 1,
          'services_selected': 2,
          'documents_uploaded': 3,
          'delivery_method_selected': 4,
          'personal_info_completed': 5,
          'payment_pending': 6,
          'payment_completed': 7,
          'submission_completed': 8,
        };
        return orderMap[status] || 0;
      };

      // Get current funnel_status before updating
      const { data: currentSubmission } = await supabase
        .from('submission')
        .select('funnel_status')
        .eq('id', submissionId)
        .single();

      const currentStatus = currentSubmission?.funnel_status || null;
      const currentOrder = getFunnelStatusOrder(currentStatus);
      const newOrder = getFunnelStatusOrder(funnelStatus);

      // Prepare update data
      const updateData: any = {
        client_id: clientId, // Always ensure client_id is set
        email: email.toLowerCase().trim(), // Always update email
        first_name: firstName,
        last_name: lastName,
        phone: phone || '',
        address: address || '',
        city: city || '',
        postal_code: postalCode || '',
        country: country || '',
        data: {
          session_id: sessionId,
          selected_services: selectedServices,
          documents: documents,
          delivery_method: deliveryMethod,
          signatories: signatories,
          current_step: currentStep
        }
      };

      // Only update funnel_status if new status is higher
      if (funnelStatus && newOrder > currentOrder) {
        updateData.funnel_status = funnelStatus;
        console.log(`🔄 [EDGE-FUNCTION] Updating funnel_status from '${currentStatus}' to '${funnelStatus}'`);
      } else if (funnelStatus) {
        console.log(`ℹ️ [EDGE-FUNCTION] Skipping funnel_status update - current '${currentStatus}' (order: ${currentOrder}) is higher or equal to '${funnelStatus}' (order: ${newOrder})`);
      }

      // Update existing submission with client_id and email
      console.log('🔄 [EDGE-FUNCTION] Updating existing submission:', submissionId)
      console.log('📧 [EDGE-FUNCTION] Email to update:', email.toLowerCase().trim())
      console.log('👤 [EDGE-FUNCTION] Client ID to update:', clientId)
      console.log('📦 [EDGE-FUNCTION] Update data:', JSON.stringify(updateData, null, 2))
      const { error: updateError } = await supabase
        .from('submission')
        .update(updateData)
        .eq('id', submissionId)

      if (updateError) {
        console.error('❌ [EDGE-FUNCTION] Error updating submission:', updateError)
      } else {
        console.log('✅ [EDGE-FUNCTION] Submission updated successfully with client_id:', clientId)
        finalSubmissionId = submissionId
      }
    } else {
      // Check if submission already exists for this client OR by session_id
      // First, try to find by client_id
      let existingSubmission: { id: string; client_id: string | null; funnel_status: string | null; data?: any } | null = null
      const { data: submissionByClient } = await supabase
        .from('submission')
        .select('id, client_id, funnel_status, data')
        .eq('client_id', clientId)
        .eq('status', 'pending_payment')
        .maybeSingle()

      if (submissionByClient) {
        existingSubmission = submissionByClient
        console.log('✅ [EDGE-FUNCTION] Found submission by client_id:', existingSubmission?.id)
      } else {
        // If not found by client_id, try to find by session_id (even if client_id is null)
        console.log('🔍 [EDGE-FUNCTION] No submission found by client_id, searching by session_id:', sessionId)
        const { data: submissions } = await supabase
          .from('submission')
          .select('id, client_id, funnel_status, data')
          .eq('status', 'pending_payment')
          .order('created_at', { ascending: false })
          .limit(20)

        if (submissions && submissions.length > 0) {
          const foundSubmission = submissions.find(sub => 
            sub.data?.session_id === sessionId
          )
          if (foundSubmission) {
            existingSubmission = foundSubmission
            console.log('✅ [EDGE-FUNCTION] Found submission by session_id:', foundSubmission.id, 'client_id:', foundSubmission.client_id)
            if (!foundSubmission.client_id) {
              console.log('⚠️ [EDGE-FUNCTION] Submission found but has no client_id - will be updated')
            }
          }
        }
      }

      if (!existingSubmission) {
        // Create new submission with status 'pending_payment'
        const submissionInsertData = {
          client_id: clientId,
          email: email.toLowerCase().trim(), // Normalize email
          first_name: firstName,
          last_name: lastName,
          phone: phone || '',
          address: address || '',
          city: city || '',
          postal_code: postalCode || '',
          country: country || '',
          status: 'pending_payment',
          funnel_status: funnelStatus || 'started', // Use funnelStatus or default to 'started'
          data: {
            session_id: sessionId,
            selected_services: selectedServices,
            documents: documents,
            delivery_method: deliveryMethod,
            signatories: signatories,
            current_step: currentStep
          }
        };
        console.log('📧 [EDGE-FUNCTION] Creating new submission with email:', email.toLowerCase().trim())
        console.log('📦 [EDGE-FUNCTION] Submission insert data:', JSON.stringify(submissionInsertData, null, 2))
        const { data: newSubmission, error: submissionError } = await supabase
          .from('submission')
          .insert(submissionInsertData)
          .select('id')
          .single()

        if (submissionError) {
          console.error('Error creating submission:', submissionError)
        } else {
          finalSubmissionId = newSubmission.id
        }
      } else {
        // Helper function to get funnel status order (higher = more advanced)
        const getFunnelStatusOrder = (status: string | null): number => {
          if (!status) return 0;
          const orderMap: Record<string, number> = {
            'started': 1,
            'services_selected': 2,
            'documents_uploaded': 3,
            'delivery_method_selected': 4,
            'personal_info_completed': 5,
            'summary_viewed': 6,
            'payment_pending': 7,
            'payment_completed': 8,
            'submission_completed': 9,
          };
          return orderMap[status] || 0;
        };

        const currentStatus = existingSubmission.funnel_status || null;
        const currentOrder = getFunnelStatusOrder(currentStatus);
        const newOrder = getFunnelStatusOrder(funnelStatus);

        // Prepare update data
        const updateData: any = {
          client_id: clientId, // Always set client_id (especially if it was null before)
          email: email.toLowerCase().trim(), // Always update email
          first_name: firstName,
          last_name: lastName,
          phone: phone || '',
          address: address || '',
          city: city || '',
          postal_code: postalCode || '',
          country: country || '',
          data: {
            session_id: sessionId,
            selected_services: selectedServices,
            documents: documents,
            delivery_method: deliveryMethod,
            signatories: signatories,
            current_step: currentStep
          }
        };

        // Only update funnel_status if new status is higher
        if (funnelStatus && newOrder > currentOrder) {
          updateData.funnel_status = funnelStatus;
          console.log(`🔄 [EDGE-FUNCTION] Updating funnel_status from '${currentStatus}' to '${funnelStatus}'`);
        } else if (funnelStatus) {
          console.log(`ℹ️ [EDGE-FUNCTION] Skipping funnel_status update - current '${currentStatus}' (order: ${currentOrder}) is higher or equal to '${funnelStatus}' (order: ${newOrder})`);
        }

        console.log('🔄 [EDGE-FUNCTION] Updating existing submission:', existingSubmission.id)
        console.log('🔄 [EDGE-FUNCTION] Current client_id:', existingSubmission.client_id, '→ New client_id:', clientId)
        console.log('📧 [EDGE-FUNCTION] Email to update:', email.toLowerCase().trim())
        console.log('📦 [EDGE-FUNCTION] Update data:', JSON.stringify(updateData, null, 2))
        
        const { error: updateError } = await supabase
          .from('submission')
          .update(updateData)
          .eq('id', existingSubmission.id)

        if (updateError) {
          console.error('❌ [EDGE-FUNCTION] Error updating existing submission:', updateError)
        } else {
          if (!existingSubmission.client_id) {
            console.log('✅✅✅ [EDGE-FUNCTION] Successfully associated submission with client_id:', clientId)
          } else {
            console.log('✅ [EDGE-FUNCTION] Updated existing submission with client_id:', clientId)
          }
        }

        finalSubmissionId = existingSubmission.id
      }
    }

    console.log('✅✅✅ [EDGE-FUNCTION] SUCCESS - Returning response ✅✅✅')
    console.log('✅ [EDGE-FUNCTION] Client ID:', clientId)
    console.log('✅ [EDGE-FUNCTION] User ID:', userId)
    console.log('✅ [EDGE-FUNCTION] Submission ID:', finalSubmissionId)
    
    return new Response(
      JSON.stringify({
        success: true,
        client_id: clientId,
        user_id: userId,
        submission_id: finalSubmissionId,
        funnel_status: funnelStatus,
        user_created: userCreated, // Indicate if a new user was created
        password: userCreated ? userPassword : null // Return password only if new user was created
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌❌❌ [EDGE-FUNCTION] ERROR IN create-client-and-submission ❌❌❌')
    console.error('❌ [EDGE-FUNCTION] Error type:', typeof error)
    console.error('❌ [EDGE-FUNCTION] Error:', error)
    console.error('❌ [EDGE-FUNCTION] Error message:', error?.message)
    console.error('❌ [EDGE-FUNCTION] Error code:', error?.code)
    console.error('❌ [EDGE-FUNCTION] Error details:', error?.details)
    console.error('❌ [EDGE-FUNCTION] Error stack:', error?.stack)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error',
        errorCode: error?.code || 'UNKNOWN',
        errorDetails: error?.details || null,
        errorHint: error?.hint || null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

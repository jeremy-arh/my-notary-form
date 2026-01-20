/**
 * Submission Save Utilities
 * Save form data directly to submission table instead of form_draft
 */

import { supabase } from '../lib/supabase';
import { shouldUpdateFunnelStatus } from './funnelStatusHelper';

// Generate a unique session ID for anonymous users
const getSessionId = () => {
  let sessionId = localStorage.getItem('formSessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('formSessionId', sessionId);
  }
  return sessionId;
};

/**
 * Save or update submission in Supabase
 * @param {object} formData - Form data object
 * @param {number} currentStep - Current step number
 * @param {array} completedSteps - Array of completed step numbers
 * @param {number} totalAmount - Total amount in EUR
 * @returns {Promise<{id: string}>}
 */
export const saveSubmission = async (formData, currentStep, completedSteps, totalAmount = null) => {
  console.log('🚀🚀🚀 [Submission] FUNCTION CALLED 🚀🚀🚀');
  console.log('🚀 [Submission] saveSubmission called with:', {
      step: currentStep,
      email: formData.email,
      hasSelectedServices: !!formData.selectedServices?.length,
      hasDocuments: !!Object.keys(formData.serviceDocuments || {}).length
    });
  
  try {
    const sessionId = getSessionId();
    
    console.log('💾💾💾 [Submission] Saving submission... 💾💾💾');
    console.log('💾 [Submission] Step:', currentStep);
    console.log('💾 [Submission] Email:', formData.email);
    console.log('💾 [Submission] Session ID:', sessionId);
    console.log('💾 [Submission] Total amount:', totalAmount);

    // Determine funnel status based on current step
    // Note: signatories_added step has been removed from the form
    const getFunnelStatus = (step) => {
      if (step >= 4) return 'personal_info_completed'
      if (step >= 3) return 'delivery_method_selected'
      if (step >= 2) return 'documents_uploaded'
      if (step >= 1) return 'services_selected'
      return 'started'
    }

    const funnelStatus = getFunnelStatus(currentStep);

    // Get existing submission by session_id (stored in data.session_id)
    // Use a more efficient query: get all pending submissions and filter in memory
    const { data: existingSubmissions, error: fetchError } = await supabase
      .from('submission')
      .select('id, client_id, data, funnel_status')
      .eq('status', 'pending_payment')
      .order('created_at', { ascending: false })
      .limit(20); // Get more submissions to find the right one

    if (fetchError) {
      console.error('❌ [Submission] Error fetching existing submissions:', fetchError);
      // Continue anyway - will create new submission
    }

    // Try to find submission with matching session_id in data
    let existingSubmission = null;
    if (existingSubmissions && existingSubmissions.length > 0) {
      existingSubmission = existingSubmissions.find(sub => 
        sub.data?.session_id === sessionId
      );
      
      if (existingSubmission) {
        console.log('✅ [Submission] Found existing submission:', existingSubmission.id);
      }
    }

    // Prepare submission data
    // All fields are nullable to allow creating submission from step 1
    // IMPORTANT: phone must be empty string, not null, to satisfy database constraints
    // client_id is not set here - it will be set later when client is created at step 4
    const submissionData = {
      client_id: null, // Explicitly set to null - will be linked later
      email: formData.email || null,
      first_name: formData.firstName || null,
      last_name: formData.lastName || null,
      phone: formData.phone || '', // Empty string instead of null for phone
      address: formData.address || null,
      city: formData.city || null,
      postal_code: formData.postalCode || null,
      country: formData.country || null,
      status: 'pending_payment',
      // Only include funnel_status if column exists (will be added by migration)
      // If column doesn't exist, it will be skipped and won't cause error
      ...(funnelStatus ? { funnel_status: funnelStatus } : {}),
      total_price: totalAmount,
      notes: formData.notes || null,
      data: {
        session_id: sessionId,
        selected_services: formData.selectedServices || [],
        documents: formData.serviceDocuments || {},
        delivery_method: formData.deliveryMethod || null,
        signatories: formData.signatories || [],
        is_signatory: formData.isSignatory || false,
        currency: formData.currency || 'EUR',
        gclid: formData.gclid || null,
        current_step: currentStep,
        completed_steps: completedSteps,
        // Store funnel_status in data as backup
        funnel_status: funnelStatus
      }
    };
    
    console.log('📋 [Submission] Prepared submission data:', {
      hasEmail: !!submissionData.email,
      hasFirstName: !!submissionData.first_name,
      hasLastName: !!submissionData.last_name,
      phone: submissionData.phone || '(empty)',
      status: submissionData.status,
      funnel_status: submissionData.funnel_status,
      total_price: submissionData.total_price
    });

    console.log('🔵 [Submission] About to INSERT/UPDATE submission...');
    console.log('🔵 [Submission] Existing submission found?', !!existingSubmission);
    
    let result;
    if (existingSubmission) {
      // Check current funnel_status before updating
      const currentFunnelStatus = existingSubmission.funnel_status || null;
      
      // Only update funnel_status if new status is higher
      if (funnelStatus && !shouldUpdateFunnelStatus(currentFunnelStatus, funnelStatus)) {
        console.log(`ℹ️ [Submission] Skipping funnel_status update - current '${currentFunnelStatus}' is higher or equal to '${funnelStatus}'`);
        // Remove funnel_status from update data to keep current value
        const { funnel_status, ...submissionDataWithoutFunnel } = submissionData;
        submissionData = submissionDataWithoutFunnel;
      } else if (funnelStatus) {
        console.log(`🔄 [Submission] Updating funnel_status from '${currentFunnelStatus}' to '${funnelStatus}'`);
      }
      
      // Update existing submission
      console.log('🔄🔄🔄 [Submission] UPDATING existing submission 🔄🔄🔄');
      console.log('🔄 [Submission] Submission ID:', existingSubmission.id);
      console.log('🔄 [Submission] Update data:', JSON.stringify(submissionData, null, 2));
      
      result = await supabase
        .from('submission')
        .update(submissionData)
        .eq('id', existingSubmission.id)
        .select()
        .single();
        
      console.log('🔄 [Submission] UPDATE RESULT RECEIVED');
    } else {
      // Create new submission
      console.log('✨✨✨ [Submission] CREATING NEW submission ✨✨✨');
      console.log('✨ [Submission] Insert data:', JSON.stringify(submissionData, null, 2));
      
      result = await supabase
        .from('submission')
        .insert(submissionData)
        .select()
        .single();
        
      console.log('✨ [Submission] INSERT RESULT RECEIVED');
    }
    
    // Log the raw result for debugging - VERY VISIBLE
    console.log('📊📊📊 [Submission] RAW RESULT 📊📊📊');
    console.log('📊 [Submission] Has error?', !!result.error);
    console.log('📊 [Submission] Has data?', !!result.data);
    console.log('📊 [Submission] Full result object:', result);
    
    if (result.error) {
      console.error('🔴🔴🔴 [Submission] ERROR DETECTED 🔴🔴🔴');
      console.error('🔴 [Submission] Error code:', result.error.code);
      console.error('🔴 [Submission] Error message:', result.error.message);
      console.error('🔴 [Submission] Error details:', result.error.details);
      console.error('🔴 [Submission] Error hint:', result.error.hint);
      console.error('🔴 [Submission] FULL ERROR OBJECT:', result.error);
      console.error('🔴 [Submission] Error stringified:', JSON.stringify(result.error, null, 2));
    } else {
      console.log('✅✅✅ [Submission] SUCCESS! ✅✅✅');
      console.log('✅ [Submission] Submission ID:', result.data?.id);
    }

    if (result.error) {
      console.error('%c❌❌❌ SUBMISSION SAVE ERROR ❌❌❌', 'background: red; color: white; font-size: 20px; padding: 10px; font-weight: bold;');
      console.error('❌ [Submission] Error code:', result.error.code);
      console.error('❌ [Submission] Error message:', result.error.message);
      console.error('❌ [Submission] Error details:', result.error.details);
      console.error('❌ [Submission] Error hint:', result.error.hint);
      console.error('❌ [Submission] Full error object:', result.error);
      console.error('❌ [Submission] Full error JSON:', JSON.stringify(result.error, null, 2));
      console.error('❌ [Submission] Submission data attempted:', JSON.stringify(submissionData, null, 2));
      
      // Log specific error types with more details
      if (result.error.code === '42501') {
        console.error('%c❌❌❌ RLS POLICY ERROR ❌❌❌', 'background: red; color: white; font-size: 18px; padding: 8px;');
        console.error('❌ [Submission] Run migration: 20250107_ensure_submission_rls_policies.sql');
      } else if (result.error.code === '23502') {
        console.error('%c❌❌❌ NOT NULL CONSTRAINT ERROR ❌❌❌', 'background: red; color: white; font-size: 18px; padding: 8px;');
        console.error('❌ [Submission] Run migration: 20250107_make_submission_fields_nullable.sql');
        console.error('❌ [Submission] Field causing error:', result.error.message);
      } else if (result.error.code === '23503') {
        console.error('%c❌❌❌ FOREIGN KEY ERROR ❌❌❌', 'background: red; color: white; font-size: 18px; padding: 8px;');
      } else if (result.error.code === 'PGRST116') {
        console.error('%c❌❌❌ POSTGREST ERROR ❌❌❌', 'background: red; color: white; font-size: 18px; padding: 8px;');
      } else if (result.error.code === 'PGRST204') {
        console.error('%c❌❌❌ COLUMN NOT FOUND ERROR ❌❌❌', 'background: red; color: white; font-size: 18px; padding: 8px;');
        console.error('❌ [Submission] Column not found in schema cache');
        console.error('❌ [Submission] Run migration: 20250107_add_funnel_status_force.sql');
      }
      
      throw result.error;
    }

    console.log('✅✅✅ [Submission] SUBMISSION SAVED SUCCESSFULLY ✅✅✅');
    console.log('✅ [Submission] Submission ID:', result.data.id);
    console.log('✅ [Submission] Status:', result.data.status);
    console.log('✅ [Submission] Funnel status:', result.data.funnel_status);
    console.log('✅ [Submission] Full data:', JSON.stringify(result.data, null, 2));
    return { id: result.data.id };
  } catch (error) {
    console.error('❌❌❌ [Submission] CATCH BLOCK ERROR ❌❌❌');
    console.error('❌ [Submission] Error type:', typeof error);
    console.error('❌ [Submission] Error:', error);
    console.error('❌ [Submission] Error message:', error?.message);
    console.error('❌ [Submission] Error stack:', error?.stack);
    console.error('❌ [Submission] Full error:', JSON.stringify(error, null, 2));
    // Don't throw - allow form to continue even if save fails
    // But log the error so we can debug
    return null;
  }
};

/**
 * Load submission from Supabase
 * @returns {Promise<object|null>}
 */
export const loadSubmission = async () => {
  try {
    const sessionId = getSessionId();
    
    // Find submission by session_id in data
    const { data: submissions } = await supabase
      .from('submission')
      .select('*')
      .eq('status', 'pending_payment')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!submissions || submissions.length === 0) {
      return null;
    }

    // Find submission with matching session_id
    for (const submission of submissions) {
      if (submission.data?.session_id === sessionId) {
        return submission;
      }
    }

    return null;
  } catch (error) {
    console.error('❌ [Submission] Error loading submission:', error);
    return null;
  }
};

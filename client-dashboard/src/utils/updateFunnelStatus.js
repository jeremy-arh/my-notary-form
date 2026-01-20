/**
 * Update funnel_status in submission based on completed step
 * This ensures funnel_status is always up-to-date when a step is completed
 * IMPORTANT: Never regresses - only updates if new status is higher
 */

import { supabase } from '../lib/supabase';
import { shouldUpdateFunnelStatus } from './funnelStatusHelper';

/**
 * Map step ID to funnel_status
 * Step 1: Choose Services -> 'services_selected'
 * Step 2: Upload Documents -> 'documents_uploaded'
 * Step 3: Delivery Method -> 'delivery_method_selected'
 * Step 4: Personal Info -> 'personal_info_completed'
 * Step 5: Summary -> stays 'personal_info_completed' until payment
 */
const getFunnelStatusForStep = (stepId) => {
  switch (stepId) {
    case 1:
      return 'services_selected';
    case 2:
      return 'documents_uploaded';
    case 3:
      return 'delivery_method_selected';
    case 4:
      return 'personal_info_completed';
    case 5:
      // Summary step - keep previous status until payment
      return null; // Don't update on summary step
    default:
      return 'started';
  }
};

/**
 * Update funnel_status in submission when a step is completed
 * @param {number} completedStepId - The step that was just completed
 * @param {string} submissionId - Optional submission ID (will be found by session_id if not provided)
 * @returns {Promise<boolean>} - True if update was successful
 */
export const updateFunnelStatus = async (completedStepId, submissionId = null) => {
  const funnelStatus = getFunnelStatusForStep(completedStepId);
  
  // Don't update if step doesn't have a corresponding funnel_status
  if (!funnelStatus) {
    console.log(`ℹ️ [FUNNEL] Step ${completedStepId} doesn't require funnel_status update`);
    return true;
  }

  console.log(`🔄 [FUNNEL] Updating funnel_status to '${funnelStatus}' for completed step ${completedStepId}`);

  try {
    // Get session ID
    const sessionId = localStorage.getItem('formSessionId');
    
    if (!sessionId && !submissionId) {
      console.warn('⚠️ [FUNNEL] No session_id or submission_id available, skipping funnel_status update');
      return false;
    }

    // Find submission by ID or session_id
    let targetSubmissionId = submissionId;
    
    if (!targetSubmissionId && sessionId) {
      // Find submission by session_id in data field
      const { data: submissions } = await supabase
        .from('submission')
        .select('id, data')
        .eq('status', 'pending_payment')
        .order('created_at', { ascending: false })
        .limit(20);

      const foundSubmission = submissions?.find(sub => 
        sub.data?.session_id === sessionId
      );

      if (!foundSubmission) {
        console.warn('⚠️ [FUNNEL] No submission found with session_id:', sessionId);
        return false;
      }

      targetSubmissionId = foundSubmission.id;
    }

    if (!targetSubmissionId) {
      console.warn('⚠️ [FUNNEL] No submission_id available, skipping funnel_status update');
      return false;
    }

    // First, get current funnel_status to compare
    const { data: currentSubmission, error: fetchError } = await supabase
      .from('submission')
      .select('id, funnel_status')
      .eq('id', targetSubmissionId)
      .single();

    if (fetchError) {
      console.error('❌ [FUNNEL] Error fetching current submission:', fetchError);
      return false;
    }

    const currentStatus = currentSubmission?.funnel_status || null;
    
    // Check if we should update (only if new status is higher)
    if (!shouldUpdateFunnelStatus(currentStatus, funnelStatus)) {
      console.log(`ℹ️ [FUNNEL] Skipping update - current status '${currentStatus}' is higher or equal to '${funnelStatus}'`);
      return true; // Not an error, just no update needed
    }

    console.log(`🔄 [FUNNEL] Updating from '${currentStatus}' to '${funnelStatus}' (higher status)`);

    // Update funnel_status only if new status is higher
    const { error, data } = await supabase
      .from('submission')
      .update({ funnel_status: funnelStatus })
      .eq('id', targetSubmissionId)
      .select('id, funnel_status')
      .single();

    if (error) {
      console.error('❌ [FUNNEL] Error updating funnel_status:', error);
      return false;
    }

    console.log(`✅ [FUNNEL] Successfully updated funnel_status from '${currentStatus}' to '${funnelStatus}' for submission ${data.id}`);
    return true;
  } catch (error) {
    console.error('❌ [FUNNEL] Unexpected error updating funnel_status:', error);
    return false;
  }
};

/**
 * Update funnel_status to 'summary_viewed' when Summary page is opened
 * @param {string} submissionId - Optional submission ID (will be found by session_id if not provided)
 * @returns {Promise<boolean>} - True if update was successful
 */
export const updateFunnelStatusToSummaryViewed = async (submissionId = null) => {
  const funnelStatus = 'summary_viewed';
  console.log(`🔄 [FUNNEL] Updating funnel_status to '${funnelStatus}' for Summary page view`);

  try {
    // Get session ID
    const sessionId = localStorage.getItem('formSessionId');
    
    if (!sessionId && !submissionId) {
      console.warn('⚠️ [FUNNEL] No session_id or submission_id available, skipping funnel_status update');
      return false;
    }

    // Find submission by ID or session_id
    let targetSubmissionId = submissionId;
    
    if (!targetSubmissionId && sessionId) {
      // Find submission by session_id in data field
      const { data: submissions } = await supabase
        .from('submission')
        .select('id, funnel_status, data')
        .in('status', ['pending', 'pending_payment', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(20);

      const foundSubmission = submissions?.find(sub => 
        sub.data?.session_id === sessionId
      );

      if (!foundSubmission) {
        console.warn('⚠️ [FUNNEL] No submission found with session_id:', sessionId);
        return false;
      }

      targetSubmissionId = foundSubmission.id;
    }

    if (!targetSubmissionId) {
      console.warn('⚠️ [FUNNEL] No submission_id available, skipping funnel_status update');
      return false;
    }

    // First, get current funnel_status to compare
    const { data: currentSubmission, error: fetchError } = await supabase
      .from('submission')
      .select('id, funnel_status')
      .eq('id', targetSubmissionId)
      .single();

    if (fetchError) {
      console.error('❌ [FUNNEL] Error fetching current submission:', fetchError);
      return false;
    }

    const currentStatus = currentSubmission?.funnel_status || null;
    
    // Check if we should update (only if new status is higher)
    if (!shouldUpdateFunnelStatus(currentStatus, funnelStatus)) {
      console.log(`ℹ️ [FUNNEL] Skipping update - current status '${currentStatus}' is higher or equal to '${funnelStatus}'`);
      return true; // Not an error, just no update needed
    }

    console.log(`🔄 [FUNNEL] Updating from '${currentStatus}' to '${funnelStatus}' (higher status)`);

    // Update funnel_status only if new status is higher
    const { error, data } = await supabase
      .from('submission')
      .update({ funnel_status: funnelStatus })
      .eq('id', targetSubmissionId)
      .select('id, funnel_status')
      .single();

    if (error) {
      console.error('❌ [FUNNEL] Error updating funnel_status:', error);
      return false;
    }

    console.log(`✅ [FUNNEL] Successfully updated funnel_status from '${currentStatus}' to '${funnelStatus}' for submission ${data.id}`);
    return true;
  } catch (error) {
    console.error('❌ [FUNNEL] Unexpected error updating funnel_status:', error);
    return false;
  }
};

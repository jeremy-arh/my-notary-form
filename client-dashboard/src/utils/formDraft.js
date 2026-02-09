/**
 * Form Draft Utilities
 * Automatically save form data to Supabase at each step
 */

import { supabase } from '../lib/supabase';

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
 * Upload document to Supabase Storage
 * @param {File} file - File object
 * @param {string} serviceId - Service ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<{path: string, url: string}>}
 */
// Sanitize filename: remove accents, replace spaces/special chars with underscores
const sanitizeFileName = (name) => {
  // Normalize unicode to decompose accented characters, then strip diacritics
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Replace any non-alphanumeric chars (except dot, dash, underscore) with underscore
  return normalized.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_');
};

export const uploadDocument = async (file, serviceId, sessionId) => {
  try {
    const timestamp = Date.now();
    const safeName = sanitizeFileName(file.name);
    const fileName = `${sessionId}/${serviceId}/${timestamp}_${safeName}`;
    
    console.log('📤 [FormDraft] Uploading document:', fileName, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    
    const { data, error } = await supabase.storage
      .from('form-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ [FormDraft] Upload error:', error);
      throw error;
    }

    console.log('✅ [FormDraft] Document uploaded:', data.path);

    // Try to get a signed URL first (works for private buckets)
    // Valid for 7 days (604800 seconds) - enough for form completion
    let fileUrl = null;
    
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('form-documents')
      .createSignedUrl(data.path, 604800); // 7 days
    
    if (signedUrlData?.signedUrl) {
      fileUrl = signedUrlData.signedUrl;
      console.log('✅ [FormDraft] Got signed URL');
    } else {
      // Fallback to public URL (works for public buckets)
      console.log('⚠️ [FormDraft] Signed URL failed, trying public URL:', signedUrlError?.message);
      const { data: urlData } = supabase.storage
        .from('form-documents')
        .getPublicUrl(data.path);
      fileUrl = urlData.publicUrl;
    }

    return {
      path: data.path,
      url: fileUrl,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ [FormDraft] Error uploading document:', error);
    throw error;
  }
};

/**
 * Delete document from Supabase Storage
 * @param {string} path - Document path
 */
export const deleteDocument = async (path) => {
  try {
    console.log('🗑️ [FormDraft] Deleting document:', path);
    
    const { error } = await supabase.storage
      .from('form-documents')
      .remove([path]);

    if (error) {
      console.error('❌ [FormDraft] Delete error:', error);
      throw error;
    }

    console.log('✅ [FormDraft] Document deleted');
  } catch (error) {
    console.error('❌ [FormDraft] Error deleting document:', error);
    throw error;
  }
};

/**
 * Save form draft to Supabase
 * @param {object} formData - Form data object
 * @param {number} currentStep - Current step number
 * @param {array} completedSteps - Array of completed step numbers
 * @param {number} totalAmount - Total amount in EUR
 * @returns {Promise<{id: string}>}
 */
export const saveFormDraft = async (formData, currentStep, completedSteps, totalAmount = null) => {
  try {
    const sessionId = getSessionId();
    
    console.log('💾 [FormDraft] Saving draft...', {
      step: currentStep,
      email: formData.email,
      sessionId
    });

    // Get existing draft
    const { data: existingDraft } = await supabase
      .from('form_draft')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    // Prepare draft data
    const draftData = {
      session_id: sessionId,
      email: formData.email || null,
      
      // Services
      selected_services: formData.selectedServices || [],
      
      // Documents (only metadata, files are in Storage)
      documents: formData.serviceDocuments || {},
      
      // Delivery
      delivery_method: formData.deliveryMethod || null,
      
      // Personal Info
      first_name: formData.firstName || null,
      last_name: formData.lastName || null,
      phone: formData.phone || null,
      address: formData.address || null,
      city: formData.city || null,
      postal_code: formData.postalCode || null,
      country: formData.country || null,
      
      // Signatories
      signatories: formData.signatories || [],
      is_signatory: formData.isSignatory || false,
      
      // Additional
      currency: formData.currency || 'EUR',
      total_amount: totalAmount,
      timezone: formData.timezone || 'UTC-5',
      gclid: formData.gclid || null,
      
      // Progress
      current_step: currentStep,
      completed_steps: completedSteps
    };

    let result;
    if (existingDraft) {
      // Update existing draft
      console.log('🔄 [FormDraft] Updating existing draft:', existingDraft.id);
      result = await supabase
        .from('form_draft')
        .update(draftData)
        .eq('id', existingDraft.id)
        .select()
        .single();
    } else {
      // Create new draft
      console.log('✨ [FormDraft] Creating new draft');
      result = await supabase
        .from('form_draft')
        .insert(draftData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('❌ [FormDraft] Save error:', result.error);
      throw result.error;
    }

    console.log('✅ [FormDraft] Draft saved:', result.data.id);
    return { id: result.data.id };
  } catch (error) {
    console.error('❌ [FormDraft] Error saving draft:', error);
    // Don't throw - allow form to continue even if save fails
    return null;
  }
};

/**
 * Load form draft from Supabase
 * @returns {Promise<object|null>}
 */
export const loadFormDraft = async () => {
  try {
    const sessionId = getSessionId();
    
    console.log('📥 [FormDraft] Loading draft for session:', sessionId);

    const { data, error } = await supabase
      .from('form_draft')
      .select('*')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ [FormDraft] Load error:', error);
      return null;
    }

    if (!data) {
      console.log('ℹ️ [FormDraft] No draft found');
      return null;
    }

    console.log('✅ [FormDraft] Draft loaded:', data.id);

    // Convert back to form data format
    return {
      selectedServices: data.selected_services || [],
      serviceDocuments: data.documents || {},
      deliveryMethod: data.delivery_method,
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      city: data.city || '',
      postalCode: data.postal_code || '',
      country: data.country || '',
      signatories: data.signatories || [],
      isSignatory: data.is_signatory || false,
      currency: data.currency || 'EUR',
      timezone: data.timezone || 'UTC-5',
      gclid: data.gclid || null,
      currentStep: data.current_step,
      completedSteps: data.completed_steps || []
    };
  } catch (error) {
    console.error('❌ [FormDraft] Error loading draft:', error);
    return null;
  }
};

/**
 * Delete form draft from Supabase
 * @returns {Promise<boolean>}
 */
export const deleteFormDraft = async () => {
  try {
    const sessionId = getSessionId();
    
    console.log('🗑️ [FormDraft] Deleting draft for session:', sessionId);

    const { error } = await supabase
      .from('form_draft')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      console.error('❌ [FormDraft] Delete error:', error);
      return false;
    }

    console.log('✅ [FormDraft] Draft deleted');
    return true;
  } catch (error) {
    console.error('❌ [FormDraft] Error deleting draft:', error);
    return false;
  }
};


import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase project credentials
// You can find these in your Supabase project settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

// Check if we have valid Supabase credentials
const hasValidCredentials = supabaseUrl !== 'https://placeholder.supabase.co';

let supabase = null;

if (hasValidCredentials) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Fetch all active services from the database
 */
export const getServices = async () => {
  if (!supabase) {
    console.warn('Supabase not configured. Please set up your .env file.');
    return [];
  }

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching services:', error);
    return [];
  }

  return data;
};

/**
 * Fetch all active options from the database
 */
export const getOptions = async () => {
  if (!supabase) {
    console.warn('Supabase not configured. Please set up your .env file.');
    return [];
  }

  const { data, error } = await supabase
    .from('options')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching options:', error);
    return [];
  }

  return data;
};

/**
 * Submit the notary service request form
 * @param {Object} formData - The complete form data
 * @returns {Object} - Result with submission ID or error
 */
export const submitNotaryRequest = async (formData) => {
  if (!supabase) {
    console.warn('Supabase not configured. Form data:', formData);
    // Return mock success for development
    return {
      success: true,
      submissionId: 'mock-' + Date.now(),
      message: 'Mock submission (Supabase not configured)'
    };
  }

  try {
    // 1. Create the main submission
    const { data: submission, error: submissionError } = await supabase
      .from('submission')
      .insert({
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
        status: 'pending'
      })
      .select()
      .single();

    if (submissionError) throw submissionError;

    const submissionId = submission.id;

    // 2. Process selected services
    if (formData.selectedOptions && formData.selectedOptions.length > 0) {
      // Get service IDs from service_id field
      const { data: services, error: servicesLookupError } = await supabase
        .from('services')
        .select('id, service_id')
        .in('service_id', formData.selectedOptions);

      if (servicesLookupError) {
        console.error('Error looking up services:', servicesLookupError);
      } else if (services && services.length > 0) {
        const submissionServices = services.map(service => ({
          submission_id: submissionId,
          service_id: service.id
        }));

        const { error: servicesError } = await supabase
          .from('submission_services')
          .insert(submissionServices);

        if (servicesError) {
          console.error('Error inserting submission services:', servicesError);
        }
      }

      // Get option IDs from option_id field
      const { data: options, error: optionsLookupError } = await supabase
        .from('options')
        .select('id, option_id')
        .in('option_id', formData.selectedOptions);

      if (optionsLookupError) {
        console.error('Error looking up options:', optionsLookupError);
      } else if (options && options.length > 0) {
        const submissionOptions = options.map(option => ({
          submission_id: submissionId,
          option_id: option.id
        }));

        const { error: optionsError } = await supabase
          .from('submission_options')
          .insert(submissionOptions);

        if (optionsError) {
          console.error('Error inserting submission options:', optionsError);
        }
      }
    }

    // 3. Upload documents (if any)
    if (formData.documents && formData.documents.length > 0) {
      for (const doc of formData.documents) {
        // Generate unique file name
        const timestamp = Date.now();
        const fileName = `${submissionId}/${timestamp}_${doc.name}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('submission-documents')
          .upload(fileName, doc.file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('submission-documents')
          .getPublicUrl(fileName);

        // Save file metadata to database
        const { error: fileError } = await supabase
          .from('submission_files')
          .insert({
            submission_id: submissionId,
            file_name: doc.name,
            file_url: urlData.publicUrl,
            file_type: doc.type,
            file_size: doc.size,
            storage_path: fileName
          });

        if (fileError) {
          console.error('Error saving file metadata:', fileError);
        }
      }
    }

    return {
      success: true,
      submissionId: submissionId,
      message: 'Submission created successfully'
    };
  } catch (error) {
    console.error('Error submitting notary request:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get a submission by ID with all related data
 * @param {string} submissionId - The submission UUID
 */
export const getSubmissionById = async (submissionId) => {
  if (!supabase) {
    console.warn('Supabase not configured');
    return null;
  }

  const { data, error } = await supabase
    .from('submission')
    .select(`
      *,
      submission_services (
        service:services (*)
      ),
      submission_options (
        option:options (*)
      ),
      submission_files (*)
    `)
    .eq('id', submissionId)
    .single();

  if (error) {
    console.error('Error fetching submission:', error);
    return null;
  }

  return data;
};

export { supabase };

import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase project credentials
// You can find these in your Supabase project settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';
// Service Role Key pour le dashboard admin (bypass RLS)
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || null;

// Utiliser la service role key si disponible (pour bypass RLS dans le dashboard admin)
// Sinon utiliser l'anon key
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;
const isUsingServiceRole = !!supabaseServiceRoleKey;

// Check if we have valid Supabase credentials
const hasValidCredentials = supabaseUrl !== 'https://placeholder.supabase.co' &&
                             supabaseKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

// Debug logs
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔌 SUPABASE CONFIGURATION (ADMIN DASHBOARD)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Key Type:', isUsingServiceRole ? 'SERVICE ROLE (bypass RLS)' : 'ANON KEY');
console.log('🔑 Key:', supabaseKey.substring(0, 50) + '...');
console.log('✅ Valid credentials:', hasValidCredentials);
if (isUsingServiceRole) {
  console.log('⚠️  Using SERVICE ROLE KEY - RLS is bypassed');
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let supabase = null;

  if (hasValidCredentials) {
  console.log('✅ Creating Supabase client...');
  // Si on utilise service role, on crée un client sans auth
  // Sinon on utilise un client normal avec auth
  if (isUsingServiceRole) {
    // Service role key bypass RLS automatiquement, mais on doit quand même avoir une session
    // pour que auth.uid() fonctionne dans les fonctions SQL
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'apikey': supabaseKey
        }
      }
    });
  } else {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
  }
  console.log('✅ Supabase client created successfully!\n');
} else {
  console.warn('⚠️  SUPABASE NOT CONFIGURED');
  console.warn('⚠️  Running in MOCK MODE');
  console.warn('⚠️  To enable Supabase:');
  console.warn('   1. Create a .env file in notary-admin/');
  console.warn('   2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  console.warn('   3. (Optional) Add VITE_SUPABASE_SERVICE_ROLE_KEY to bypass RLS');
  console.warn('   4. Restart the dev server\n');
}

/**
 * Fetch all active services from the database
 */
export const getServices = async () => {
  if (!supabase) {
    console.warn('⚠️ getServices(): Supabase not configured');
    return [];
  }

  console.log('📥 Fetching services from Supabase...');
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('❌ Error fetching services:', error);
    return [];
  }

  console.log('✅ Services fetched:', data?.length || 0);
  return data;
};

/**
 * Fetch all active options from the database
 */
export const getOptions = async () => {
  if (!supabase) {
    console.warn('⚠️ getOptions(): Supabase not configured');
    return [];
  }

  console.log('📥 Fetching options from Supabase...');
  const { data, error } = await supabase
    .from('options')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('❌ Error fetching options:', error);
    return [];
  }

  console.log('✅ Options fetched:', data?.length || 0);
  return data;
};

/**
 * Submit the notary service request form
 * @param {Object} formData - The complete form data
 * @returns {Object} - Result with submission ID or error
 */
export const submitNotaryRequest = async (formData) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📤 SUBMITTING NOTARY REQUEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Form Data:', formData);
  console.log('Supabase connected:', !!supabase);

  if (!supabase) {
    console.warn('⚠️  Supabase not configured. Using MOCK MODE');
    console.log('📦 Mock submission data:', formData);
    // Return mock success for development
    return {
      success: true,
      submissionId: 'mock-' + Date.now(),
      message: 'Mock submission (Supabase not configured)'
    };
  }

  try {
    console.log('1️⃣ Creating main submission record...');

    // 1. Create the main submission
    const submissionData = {
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
    };

    console.log('📝 Submission data:', submissionData);

    const { data: submission, error: submissionError } = await supabase
      .from('submission')
      .insert(submissionData)
      .select()
      .single();

    if (submissionError) {
      console.error('❌ Submission error:', submissionError);
      throw submissionError;
    }

    const submissionId = submission.id;
    console.log('✅ Submission created! ID:', submissionId);

    // 2. Process selected services and options
    if (formData.selectedOptions && formData.selectedOptions.length > 0) {
      console.log('2️⃣ Processing selected services/options:', formData.selectedOptions);

      // Get service IDs from service_id field
      const { data: services, error: servicesLookupError } = await supabase
        .from('services')
        .select('id, service_id')
        .in('service_id', formData.selectedOptions);

      if (servicesLookupError) {
        console.error('❌ Error looking up services:', servicesLookupError);
      } else if (services && services.length > 0) {
        console.log('✅ Found services:', services.length);
        const submissionServices = services.map(service => ({
          submission_id: submissionId,
          service_id: service.id
        }));

        const { error: servicesError } = await supabase
          .from('submission_services')
          .insert(submissionServices);

        if (servicesError) {
          console.error('❌ Error inserting submission services:', servicesError);
        } else {
          console.log('✅ Services linked to submission');
        }
      }

      // Get option IDs from option_id field
      const { data: options, error: optionsLookupError } = await supabase
        .from('options')
        .select('id, option_id')
        .in('option_id', formData.selectedOptions);

      if (optionsLookupError) {
        console.error('❌ Error looking up options:', optionsLookupError);
      } else if (options && options.length > 0) {
        console.log('✅ Found options:', options.length);
        const submissionOptions = options.map(option => ({
          submission_id: submissionId,
          option_id: option.id
        }));

        const { error: optionsError } = await supabase
          .from('submission_options')
          .insert(submissionOptions);

        if (optionsError) {
          console.error('❌ Error inserting submission options:', optionsError);
        } else {
          console.log('✅ Options linked to submission');
        }
      }
    }

    // 3. Upload documents (if any)
    if (formData.documents && formData.documents.length > 0) {
      console.log('3️⃣ Uploading documents:', formData.documents.length);

      for (const doc of formData.documents) {
        // Generate unique file name
        const timestamp = Date.now();
        const fileName = `${submissionId}/${timestamp}_${doc.name}`;

        console.log('📤 Uploading file:', fileName);

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('submission-documents')
          .upload(fileName, doc.file);

        if (uploadError) {
          console.error('❌ Error uploading file:', uploadError);
          continue;
        }

        console.log('✅ File uploaded');

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
          console.error('❌ Error saving file metadata:', fileError);
        } else {
          console.log('✅ File metadata saved');
        }
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SUBMISSION COMPLETE!');
    console.log('📋 Submission ID:', submissionId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      success: true,
      submissionId: submissionId,
      message: 'Submission created successfully'
    };
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ SUBMISSION FAILED');
    console.error('Error:', error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
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
    console.warn('⚠️ getSubmissionById(): Supabase not configured');
    return null;
  }

  console.log('📥 Fetching submission:', submissionId);

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
    console.error('❌ Error fetching submission:', error);
    return null;
  }

  console.log('✅ Submission fetched:', data);
  return data;
};

export { supabase };

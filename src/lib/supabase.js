import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase project credentials
// You can find these in your Supabase project settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

// Check if we have valid Supabase credentials
const hasValidCredentials = supabaseUrl !== 'https://placeholder.supabase.co' &&
                             supabaseAnonKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

// Debug logs
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔌 SUPABASE CONFIGURATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Key:', supabaseAnonKey.substring(0, 50) + '...');
console.log('✅ Valid credentials:', hasValidCredentials);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let supabase = null;

if (hasValidCredentials) {
  console.log('✅ Creating Supabase client...');
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase client created successfully!\n');
} else {
  console.warn('⚠️  SUPABASE NOT CONFIGURED');
  console.warn('⚠️  Running in MOCK MODE');
  console.warn('⚠️  To enable Supabase:');
  console.warn('   1. Create a .env file');
  console.warn('   2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  console.warn('   3. Restart the dev server\n');
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
      message: 'Mock submission (Supabase not configured)',
      accountCreated: false
    };
  }

  try {
    let clientId = null;
    let accountCreated = false;
    let userId = null;
    let magicLinkSent = false;

    // 1. Check if client already exists
    console.log('1️⃣ Checking if client exists with email:', formData.email);
    const { data: existingClient, error: clientLookupError } = await supabase
      .from('client')
      .select('*')
      .eq('email', formData.email)
      .single();

    if (clientLookupError && clientLookupError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new clients
      console.error('❌ Error looking up client:', clientLookupError);
      throw clientLookupError;
    }

    if (existingClient) {
      console.log('✅ Client already exists:', existingClient.id);
      clientId = existingClient.id;
      userId = existingClient.user_id;

      // Update client record with latest info (UPSERT behavior)
      console.log('2️⃣ Updating client information...');
      const { error: updateError } = await supabase
        .from('client')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postalCode,
          country: formData.country,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);

      if (updateError) {
        console.error('⚠️  Warning: Could not update client info:', updateError);
        // Don't throw - we can continue with old data
      } else {
        console.log('✅ Client information updated');
      }
    } else {
      console.log('2️⃣ Creating new client account...');

      // Create auth user with email (passwordless - will use magic link)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16), // Random password (won't be used)
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            user_type: 'client'
          }
        }
      });

      if (signUpError) {
        console.error('❌ Error creating auth user:', signUpError);
        throw signUpError;
      }

      console.log('✅ Auth user created:', authData.user?.id);
      userId = authData.user.id;
      accountCreated = true;

      // Create client record
      const { data: newClient, error: clientError } = await supabase
        .from('client')
        .insert({
          user_id: userId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postalCode,
          country: formData.country
        })
        .select()
        .single();

      if (clientError) {
        console.error('❌ Error creating client record:', clientError);
        throw clientError;
      }

      console.log('✅ Client record created:', newClient.id);
      clientId = newClient.id;

      // Send magic link ONLY for new accounts
      console.log('3️⃣ Sending magic link to:', formData.email);
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin.replace(':5173', ':5175')}/auth/callback`
        }
      });

      if (magicLinkError) {
        console.error('⚠️  Warning: Could not send magic link:', magicLinkError);
        magicLinkSent = false;
      } else {
        console.log('✅ Magic link sent!');
        magicLinkSent = true;
      }
    }

    // If user is already authenticated on this app, don't send magic link
    console.log('🔍 Checking current auth state...');
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      console.log('✅ User is already authenticated, skipping magic link');
      magicLinkSent = false; // Don't mention magic link in success message
    }

    console.log('4️⃣ Creating submission record...');

    // 2. Create the main submission linked to client
    const submissionData = {
      client_id: clientId,
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

    // 5. Process selected services and options
    if (formData.selectedOptions && formData.selectedOptions.length > 0) {
      console.log('5️⃣ Processing selected services/options:', formData.selectedOptions);

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

    // 6. Upload documents (if any)
    if (formData.documents && formData.documents.length > 0) {
      console.log('6️⃣ Uploading documents:', formData.documents.length);

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
    console.log('👤 Client ID:', clientId);
    console.log('🆕 Account Created:', accountCreated);
    console.log('📧 Magic Link Sent:', magicLinkSent);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      success: true,
      submissionId: submissionId,
      clientId: clientId,
      accountCreated: accountCreated,
      magicLinkSent: magicLinkSent,
      message: accountCreated
        ? 'Submission created successfully! A magic link has been sent to your email to access your dashboard.'
        : 'Submission created successfully'
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

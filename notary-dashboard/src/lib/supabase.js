import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

const hasValidCredentials = supabaseUrl !== 'https://placeholder.supabase.co' &&
                             supabaseAnonKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

// Debug logs
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔌 SUPABASE CONFIGURATION (NOTARY DASHBOARD)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Key:', supabaseAnonKey.substring(0, 50) + '...');
console.log('✅ Valid credentials:', hasValidCredentials);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Always create a client, even with placeholder credentials
// This ensures supabase.auth and other methods are always available
// The client will fail on actual operations if credentials are invalid
let supabase;

if (hasValidCredentials) {
  console.log('✅ Creating Supabase client with valid credentials...');
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });
  console.log('✅ Supabase client created successfully!\n');
} else {
  console.warn('⚠️  SUPABASE NOT CONFIGURED');
  console.warn('⚠️  Creating client with placeholder credentials (will fail on operations)');
  console.warn('⚠️  To enable Supabase:');
  console.warn('   1. Create a .env file in notary-dashboard/');
  console.warn('   2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  console.warn('   3. Restart the dev server\n');
  
  // Create client with placeholder credentials so methods exist
  // Operations will fail, but at least the code won't crash
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });
}

export { supabase };


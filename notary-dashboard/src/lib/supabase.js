import { createClient } from '@supabase/supabase-js';

// Debug: Check what Vite is actually loading
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Trim whitespace and handle undefined/null
const supabaseUrl = (rawUrl && typeof rawUrl === 'string' ? rawUrl.trim() : null) || 'https://placeholder.supabase.co';
const supabaseAnonKey = (rawKey && typeof rawKey === 'string' ? rawKey.trim() : null) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

const hasValidCredentials = supabaseUrl !== 'https://placeholder.supabase.co' &&
                             supabaseAnonKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

// Debug logs with more details
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔌 SUPABASE CONFIGURATION (NOTARY DASHBOARD)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 Raw VITE_SUPABASE_URL:', rawUrl ? `"${rawUrl.substring(0, 50)}..."` : 'undefined');
console.log('🔍 Raw VITE_SUPABASE_ANON_KEY:', rawKey ? `"${rawKey.substring(0, 30)}..."` : 'undefined');
console.log('📍 Processed URL:', supabaseUrl);
console.log('🔑 Processed Key:', supabaseAnonKey.substring(0, 50) + '...');
console.log('✅ Valid credentials:', hasValidCredentials);
if (!hasValidCredentials) {
  console.warn('⚠️  Environment variables not loaded correctly!');
  console.warn('⚠️  Make sure:');
  console.warn('   1. .env file exists in notary-dashboard/ directory');
  console.warn('   2. Variables start with VITE_ prefix');
  console.warn('   3. No spaces around = sign (e.g., VITE_SUPABASE_URL=https://...)');
  console.warn('   4. Dev server was restarted after creating/modifying .env');
  console.warn('   5. File is named exactly .env (not .env.txt or .env.local)');
}
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


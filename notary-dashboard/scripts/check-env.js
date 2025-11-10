// Script to check if environment variables are available during build
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 CHECKING ENVIRONMENT VARIABLES (NOTARY DASHBOARD)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const googleMapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

console.log('VITE_SUPABASE_URL:', supabaseUrl ? `✅ Set (${supabaseUrl.substring(0, 30)}...)` : '❌ NOT SET');
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `✅ Set (${supabaseAnonKey.substring(0, 30)}...)` : '❌ NOT SET');
console.log('VITE_GOOGLE_MAPS_API_KEY:', googleMapsKey ? '✅ Set' : '⚠️ Not set (optional)');

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ ERROR: Required environment variables are not set!');
  console.error('Please configure them in Cloudflare Pages:');
  console.error('  - Settings > Environment variables');
  console.error('  - Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  console.error('  - Redeploy after adding variables');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(1);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ All required environment variables are set');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');


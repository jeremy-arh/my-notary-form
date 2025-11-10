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
  console.warn('⚠️  WARNING: Required environment variables are not set!');
  console.warn('⚠️  The build will continue, but the application will use placeholder values.');
  console.warn('⚠️  To fix this:');
  console.warn('   1. Go to Cloudflare Pages > Settings > Environment variables');
  console.warn('   2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  console.warn('   3. Redeploy after adding variables');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  // Ne pas faire échouer le build - seulement afficher un warning
  // process.exit(1); // Commenté pour permettre le build même sans variables
}

if (supabaseUrl && supabaseAnonKey) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All required environment variables are set');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
} else {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  Continuing build with placeholder values');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}


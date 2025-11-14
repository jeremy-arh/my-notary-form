// Script to verify .env file exists and has correct format
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 VERIFYING .env FILE (NOTARY DASHBOARD)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📁 Looking for .env at:', envPath);
console.log('');

// Check if file exists
if (!existsSync(envPath)) {
  console.error('❌ .env file NOT FOUND!');
  console.error('');
  console.error('📝 To fix this:');
  console.error('   1. Create a .env file in notary-dashboard/ directory');
  console.error('   2. Add the following variables:');
  console.error('      VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('      VITE_SUPABASE_ANON_KEY=your_anon_key');
  console.error('');
  process.exit(1);
}

console.log('✅ .env file found!');
console.log('');

// Read and parse file
try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));

  console.log('📋 Checking variables...');
  console.log('');

  let hasUrl = false;
  let hasKey = false;
  let hasErrors = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    // Check for spaces around =
    if (trimmed.includes(' = ') || trimmed.match(/=\s+/) || trimmed.match(/\s+=/)) {
      console.warn(`⚠️  Line ${index + 1}: Spaces around = sign detected`);
      console.warn(`   "${trimmed}"`);
      console.warn('   Remove spaces around = sign');
      console.warn('');
      hasErrors = true;
    }

    // Check for required variables
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
      hasUrl = true;
      const value = trimmed.split('=')[1]?.trim();
      if (!value || value === '') {
        console.error(`❌ Line ${index + 1}: VITE_SUPABASE_URL has no value`);
        hasErrors = true;
      } else if (value === 'https://your-project.supabase.co' || value.includes('placeholder')) {
        console.warn(`⚠️  Line ${index + 1}: VITE_SUPABASE_URL appears to be a placeholder`);
        console.warn('   Replace with your actual Supabase URL');
        hasErrors = true;
      } else {
        console.log(`✅ VITE_SUPABASE_URL found: ${value.substring(0, 40)}...`);
      }
    }

    if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      hasKey = true;
      const value = trimmed.split('=')[1]?.trim();
      if (!value || value === '') {
        console.error(`❌ Line ${index + 1}: VITE_SUPABASE_ANON_KEY has no value`);
        hasErrors = true;
      } else if (value === 'your_anon_key' || value.includes('placeholder')) {
        console.warn(`⚠️  Line ${index + 1}: VITE_SUPABASE_ANON_KEY appears to be a placeholder`);
        console.warn('   Replace with your actual Supabase anon key');
        hasErrors = true;
      } else {
        console.log(`✅ VITE_SUPABASE_ANON_KEY found: ${value.substring(0, 30)}...`);
      }
    }
  });

  console.log('');

  if (!hasUrl) {
    console.error('❌ VITE_SUPABASE_URL not found in .env file');
    hasErrors = true;
  }

  if (!hasKey) {
    console.error('❌ VITE_SUPABASE_ANON_KEY not found in .env file');
    hasErrors = true;
  }

  if (hasErrors) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ .env file has issues. Please fix them before starting the dev server.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ .env file looks good!');
  console.log('✅ All required variables are present');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('💡 Remember to restart the dev server if you just created/modified .env');
  console.log('');

} catch (error) {
  console.error('❌ Error reading .env file:', error.message);
  process.exit(1);
}


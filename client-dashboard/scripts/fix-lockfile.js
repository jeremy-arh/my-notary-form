// Script to ensure package-lock.json is in sync with package.json
// This is needed because npm ci requires a synchronized lock file
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Check if package-lock.json exists and is in sync
const lockFilePath = path.join(rootDir, 'package-lock.json');
const packageJsonPath = path.join(rootDir, 'package.json');

if (!fs.existsSync(lockFilePath)) {
  console.log('package-lock.json not found, generating...');
  execSync('npm install --package-lock-only --legacy-peer-deps', { 
    cwd: rootDir,
    stdio: 'inherit'
  });
} else {
  // Try to verify lock file is in sync
  try {
    execSync('npm ci --dry-run --legacy-peer-deps', { 
      cwd: rootDir,
      stdio: 'pipe'
    });
  } catch (error) {
    console.log('package-lock.json is out of sync, updating...');
    execSync('npm install --package-lock-only --legacy-peer-deps', { 
      cwd: rootDir,
      stdio: 'inherit'
    });
  }
}

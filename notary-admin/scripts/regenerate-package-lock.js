#!/usr/bin/env node
/**
 * Script pour régénérer le package-lock.json
 * Utilisez ce script si vous rencontrez des erreurs d'intégrité npm
 * 
 * Usage: node scripts/regenerate-package-lock.js
 */

import { execSync } from 'child_process';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const packageLockPath = join(process.cwd(), 'package-lock.json');

console.log('🧹 Nettoyage du cache npm...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
} catch (error) {
  console.warn('⚠️  Erreur lors du nettoyage du cache (peut être ignorée)');
}

console.log('🗑️  Suppression du package-lock.json existant...');
if (existsSync(packageLockPath)) {
  unlinkSync(packageLockPath);
  console.log('✅ package-lock.json supprimé');
} else {
  console.log('ℹ️  Aucun package-lock.json trouvé');
}

console.log('📦 Suppression de node_modules...');
if (existsSync(join(process.cwd(), 'node_modules'))) {
  execSync('rm -rf node_modules', { stdio: 'inherit' });
  console.log('✅ node_modules supprimé');
} else {
  console.log('ℹ️  Aucun node_modules trouvé');
}

console.log('🔄 Réinstallation des dépendances...');
try {
  execSync('npm install --legacy-peer-deps --package-lock-only', { stdio: 'inherit' });
  console.log('✅ package-lock.json régénéré avec succès!');
} catch (error) {
  console.error('❌ Erreur lors de la régénération:', error.message);
  process.exit(1);
}

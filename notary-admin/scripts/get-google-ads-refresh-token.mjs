/**
 * Script pour obtenir le Refresh Token Google Ads (Version ES Modules)
 * 
 * Usage:
 * 1. Remplacez CLIENT_ID et CLIENT_SECRET ci-dessous
 * 2. Exécutez: node scripts/get-google-ads-refresh-token.mjs
 */

import { google } from 'googleapis';
import readline from 'readline';
import http from 'http';
import url from 'url';

// ⚠️ REMPLACEZ CES VALEURS PAR VOS CREDENTIALS
const CLIENT_ID = 'VOTRE_CLIENT_ID.apps.googleusercontent.com';
const CLIENT_SECRET = 'VOTRE_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = ['https://www.googleapis.com/auth/adwords'];

// Générer l'URL d'autorisation
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent', // Important pour obtenir le refresh_token
});

console.log('\n🔗 Visitez cette URL pour autoriser l\'application:\n');
console.log(authUrl);
console.log('\n⏳ En attente de l\'autorisation...\n');

// Créer un serveur temporaire pour recevoir le code
const server = http.createServer(async (req, res) => {
  try {
    const qs = url.parse(req.url, true).query;
    
    if (qs.error) {
      console.error('❌ Erreur:', qs.error);
      res.writeHead(400);
      res.end('Erreur: ' + qs.error);
      server.close();
      return;
    }

    if (qs.code) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>✅ Autorisation réussie !</h1>
            <p>Vous pouvez fermer cette fenêtre.</p>
            <p>Vérifiez la console pour voir votre Refresh Token.</p>
          </body>
        </html>
      `);

      // Échanger le code contre les tokens
      const { tokens } = await oauth2Client.getToken(qs.code);
      
      console.log('\n✅ Tokens obtenus avec succès !\n');
      console.log('📋 Copiez ces valeurs dans vos variables d\'environnement:\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('REFRESH_TOKEN=' + tokens.refresh_token);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      if (tokens.access_token) {
        console.log('Access Token (temporaire):', tokens.access_token.substring(0, 20) + '...');
      }
      
      console.log('\n⚠️  IMPORTANT: Le Refresh Token ne sera affiché qu\'une seule fois !');
      console.log('   Assurez-vous de le copier et de le stocker en sécurité.\n');
      
      server.close();
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    res.writeHead(500);
    res.end('Erreur: ' + error.message);
    server.close();
  }
});

server.listen(3000, () => {
  console.log('🌐 Serveur temporaire démarré sur http://localhost:3000');
  console.log('   (Le serveur se fermera automatiquement après l\'autorisation)\n');
});



# Instructions de déploiement

## Application unifiée (RECOMMANDÉ)

L'application complète avec formulaire + dashboard client + profil utilisateur est maintenant dans le dossier `client-dashboard`.

### Pour lancer l'application :

```bash
cd client-dashboard
npm install
npm run dev
```

L'application sera accessible sur **http://localhost:5173**

### Routes disponibles :

- **/**  → Redirige vers `/form` (non-authentifié) ou `/dashboard` (authentifié)
- **/form/documents** → Formulaire de soumission notariale
- **/form/choose-option** → Choix des options
- **/form/book-appointment** → Réservation de rendez-vous  
- **/form/personal-info** → Informations personnelles
- **/form/summary** → Résumé et soumission
- **/dashboard** → Tableau de bord client (authentifié)
- **/profile** → Profil utilisateur (authentifié)
- **/login** → Page de connexion

### Modifications récentes :

1. ✅ Logo centralisé dans `/src/assets/Logo.jsx`
2. ✅ Sidebar réduite (blocs plus compacts)
3. ✅ Bouton "connexion" au lieu de "Dashboard"
4. ✅ Barre de progression en bas de la sidebar
5. ✅ Toutes les fonctionnalités sur le port 5173

## Ancienne application (OBSOLÈTE)

L'ancienne application dans le dossier racine `/src` utilise encore les routes `/documents`, `/choose-option`, etc. 

**⚠️ NE PAS UTILISER** - Cette version n'inclut pas le dashboard client ni les dernières modifications.

## Changement du logo

Pour changer le logo pour TOUS les dashboards :

1. Éditez `/src/assets/Logo.jsx`
2. Les changements s'appliqueront automatiquement à :
   - Formulaire client
   - Dashboard client
   - Dashboard notaire (si utilisé)

Voir `/src/assets/README.md` pour plus de détails.

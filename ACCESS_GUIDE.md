# Guide d'accès aux applications

Ce projet est composé de **4 applications séparées** qui fonctionnent ensemble pour créer une plateforme complète de services notariaux.

## 📱 Applications disponibles

### ✅ 1. Formulaire Public (Customer Form)
**Statut**: ✅ Disponible
**Port**: 5173
**Accès**: http://localhost:5173

**Comment lancer**:
```bash
cd my-notary-form
npm install
npm run dev
```

**Description**:
- Formulaire public pour soumettre des demandes de services notariaux
- 5 étapes : Documents, Services, Rendez-vous, Informations personnelles, Résumé
- Pas d'authentification requise
- Création automatique du compte client lors de la soumission

---

### ✅ 2. Notary Panel (Dashboard Notaire)
**Statut**: ✅ Disponible
**Port**: 5174
**Accès**: http://localhost:5174

**Comment lancer**:
```bash
cd notary-admin
npm install
npm run dev
```

**Description**:
- Espace pour les notaires
- Connexion avec email/mot de passe
- Fonctionnalités actuelles:
  - ✅ Dashboard avec statistiques
  - ✅ Liste des demandes (submissions)
  - ✅ Accepter/Rejeter les demandes
  - ✅ Upload de documents signés
  - ✅ Gestion du profil
  - ⏳ Messagerie avec clients (à venir)

**Comment se connecter**:
1. Créer un compte dans Supabase Auth
2. Ajouter l'utilisateur dans la table `notary` avec le user_id

---

### ⏳ 3. Client Dashboard (Dashboard Client)
**Statut**: ⏳ En cours de développement
**Port**: 5175 (prévu)
**Accès**: http://localhost:5175 (bientôt)

**Comment lancer**: Pas encore disponible

**Description**:
- Espace personnel pour les clients
- Authentification par **magic link** (lien envoyé par email)
- Fonctionnalités prévues:
  - ⏳ Voir toutes ses demandes
  - ⏳ Statut des demandes (pending, accepted, rejected)
  - ⏳ Télécharger les documents signés
  - ⏳ Messagerie avec le notaire assigné
  - ⏳ Soumettre une nouvelle demande

**Comment créer un compte client**:
Le compte est créé automatiquement lors de la soumission du formulaire (étape Personal Info).

---

### ⏳ 4. Admin Dashboard (Dashboard Administrateur)
**Statut**: ⏳ En cours de développement
**Port**: 5176 (prévu)
**Accès**: http://localhost:5176 (bientôt)

**Comment lancer**: Pas encore disponible

**Description**:
- Espace pour les super administrateurs
- Connexion avec email/mot de passe
- Fonctionnalités prévues:
  - ⏳ Gestion des notaires (créer, modifier, désactiver)
  - ⏳ Assigner les notaires aux demandes
  - ⏳ Vue globale de toutes les demandes
  - ⏳ Voir toutes les conversations (client ↔ notaire)
  - ⏳ Dashboard analytics (revenus, statistiques)

**Comment créer un admin**:
Après avoir exécuté `supabase-messaging-migration.sql`:
1. Créer un compte dans Supabase Auth
2. Exécuter cette requête SQL:
```sql
INSERT INTO admin_user (user_id, first_name, last_name, email, role)
VALUES (
  'YOUR_USER_ID', -- Remplacer par le user ID de Supabase Auth
  'Admin',
  'User',
  'admin@example.com',
  'super_admin'
);
```

---

## 🔄 Système de messagerie

**Statut**: ⏳ Backend prêt, UI en développement

### Architecture
```
Client (Dashboard Client)
    ↕ Messages
Notary (Notary Panel)
    ↕ Visible par
Admin (Admin Dashboard)
```

### Fonctionnalités
- ✅ Base de données configurée (table `message`)
- ✅ RLS policies (sécurité)
- ⏳ Notifications email via SendGrid (à configurer)
- ⏳ Interface de chat (à développer)
- ⏳ Compteur de messages non lus

---

## 🗄️ Base de données

### Migrations à exécuter (dans l'ordre)

1. **supabase-schema.sql** - Schéma initial
   - Tables: notary, services, options, submission, etc.

2. **supabase-admin-migration.sql** - Features admin pour notaires
   - Ajoute user_id à notary
   - Ajoute status à submission
   - RLS policies pour notary

3. **supabase-messaging-migration.sql** - Système de messagerie ✅ CORRIGÉ
   - Tables: client, admin_user, message
   - Ajoute client_id à submission
   - RLS policies complètes
   - Fonctions helper

### Tables principales

| Table | Description | Clé primaire |
|-------|-------------|--------------|
| `client` | Comptes clients | `id` (UUID) |
| `notary` | Comptes notaires | `id` (UUID) |
| `admin_user` | Comptes admins | `id` (UUID) |
| `submission` | Demandes de services | `id` (UUID) |
| `message` | Messages internes | `message_id` (UUID) |
| `services` | Services disponibles | `id` (UUID) |
| `options` | Options additionnelles | `id` (UUID) |

### Colonnes importantes dans `submission`
- `client_id` → Référence `client(id)`
- `assigned_notary_id` → Référence `notary(id)`
- `status` → 'pending', 'accepted', 'rejected', etc.

---

## 📋 Prochaines étapes

### Phase en cours : Développement des dashboards

1. ✅ **Base de données** - Terminé
   - Migration SQL corrigée
   - RLS policies en place

2. ⏳ **Modifier le formulaire** - En cours
   - Créer automatiquement le compte client
   - Envoyer magic link
   - Associer submission au client

3. ⏳ **Client Dashboard** - À faire
   - Créer l'application Vite (port 5175)
   - Authentification magic link
   - Interface de gestion des demandes
   - Chat avec notaire

4. ⏳ **Messagerie Notary Panel** - À faire
   - Ajouter onglet Messages
   - Interface de chat
   - Notifications

5. ⏳ **Admin Dashboard** - À faire
   - Créer l'application Vite (port 5176)
   - Gestion des notaires
   - Assignment manuel
   - Vue globale
   - Messagerie complète

6. ⏳ **SendGrid** - À configurer
   - Configuration API
   - Edge Function pour emails
   - Templates d'emails

---

## ❓ FAQ

### Comment tester les applications actuellement disponibles ?

**Formulaire**:
```bash
cd my-notary-form
npm run dev
```
Ouvrir http://localhost:5173

**Notary Panel**:
```bash
cd notary-admin
npm run dev
```
Ouvrir http://localhost:5174

### Les deux apps peuvent tourner en même temps ?
✅ Oui ! Ouvrez deux terminaux et lancez chaque app dans son dossier.

### Où est la messagerie ?
La base de données est prête, mais l'interface utilisateur n'est pas encore développée. Elle sera ajoutée dans les prochaines phases.

### Comment créer un compte notaire ?
1. Créer un utilisateur dans Supabase Auth (Dashboard > Authentication > Users)
2. Copier le User ID
3. Ajouter dans la table `notary`:
```sql
INSERT INTO notary (user_id, name, email, phone, is_active)
VALUES (
  'USER_ID_HERE',
  'John Doe',
  'john@notary.com',
  '+1234567890',
  true
);
```

### L'erreur SQL est-elle corrigée ?
✅ Oui ! La migration `supabase-messaging-migration.sql` a été corrigée. Vous pouvez maintenant l'exécuter sans erreur.

### Comment voir mes données dans Supabase ?
Supabase Dashboard > Table Editor > Sélectionnez la table

---

## 🔗 Liens utiles

- **Supabase Dashboard**: https://app.supabase.com
- **Documentation Supabase Auth**: https://supabase.com/docs/guides/auth
- **SendGrid Dashboard**: https://app.sendgrid.com
- **Guide Setup Messaging**: Voir `MESSAGING_SETUP.md`

---

**Dernière mise à jour**: Date de création de ce document

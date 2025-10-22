# Client Dashboard - Guide d'utilisation

Le Client Dashboard est maintenant **100% fonctionnel** ! Voici comment l'utiliser et le tester.

## 🎉 Fonctionnalités complètes

✅ **Authentification Magic Link** (sans mot de passe)
✅ **Dashboard** avec stats et liste des demandes
✅ **Détails complets** de chaque demande
✅ **Messagerie en temps réel** avec le notaire
✅ **Téléchargement de documents**
✅ **Design responsive** (mobile + desktop)

---

## 🚀 Démarrage rapide

### 1. Installation

```bash
cd client-dashboard
npm install
cp .env.example .env
```

### 2. Configuration

Éditez `.env` et ajoutez vos credentials Supabase:
```
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon
```

### 3. Lancer l'application

```bash
npm run dev
```

Ouvrir → **http://localhost:5175**

---

## 📋 Prérequis

Avant d'utiliser le Client Dashboard, assurez-vous que :

### 1. ✅ Migration SQL exécutée
Vous devez avoir exécuté `supabase-messaging-migration.sql` dans Supabase.

Cela crée la table `client` nécessaire.

### 2. ✅ Client créé dans la base de données

Le compte client est normalement créé automatiquement lors de la soumission du formulaire.

**OU** vous pouvez créer manuellement un client pour tester :

```sql
-- 1. Créer un utilisateur dans Supabase Auth
-- Dashboard > Authentication > Users > Add User
-- Email: test@example.com
-- Copier le User ID

-- 2. Créer l'entrée client
INSERT INTO client (user_id, first_name, last_name, email, phone)
VALUES (
  'USER_ID_ICI', -- Remplacer par le vrai User ID
  'John',
  'Doe',
  'test@example.com',
  '+1234567890'
);
```

### 3. ✅ Submission liée au client

Assurez-vous qu'au moins une submission existe avec le `client_id`:

```sql
-- Mettre à jour une submission existante
UPDATE submission
SET client_id = (SELECT id FROM client WHERE email = 'test@example.com')
WHERE id = 'SUBMISSION_ID_ICI';
```

### 4. ✅ Supabase Auth configuré pour magic links

Voir `MESSAGING_SETUP.md` section "2. Supabase Auth Configuration"

---

## 🔐 Authentification

### Comment se connecter

1. Aller sur **http://localhost:5175**
2. Entrer votre email (celui utilisé pour créer le client)
3. Cliquer "Send Magic Link"
4. Vérifier votre email
5. Cliquer sur le lien dans l'email
6. Vous êtes automatiquement connecté et redirigé vers le dashboard

### Pas de mot de passe !

Le Client Dashboard utilise l'authentification **passwordless** via magic links. C'est plus sécurisé et plus simple pour les clients.

---

## 📱 Pages et fonctionnalités

### 1. Login Page (`/login`)

**Fonctionnalités** :
- Input email avec validation
- Bouton "Send Magic Link"
- Messages de succès/erreur
- Gestion du callback après clic sur le lien
- Redirection automatique si déjà connecté

**États** :
- ⏳ Loading pendant l'envoi
- ✅ Succès : "Check your email"
- ❌ Erreur : Message d'erreur affiché

---

### 2. Dashboard Page (`/dashboard`)

**Fonctionnalités** :
- Message de bienvenue personnalisé
- 4 cartes de statistiques :
  - Total Requests
  - Pending (jaune)
  - Accepted (vert)
  - Rejected (rouge)
- Table des submissions avec :
  - Date de création
  - Date/heure du rendez-vous
  - Notaire assigné
  - Status (badge coloré)
  - Bouton "View Details"
- Bouton "New Request" → redirige vers le formulaire public

**Tri** :
Les submissions sont triées par date de création (plus récent en premier)

---

### 3. Submission Detail Page (`/submission/:id`)

**Sections** :

#### Gauche (2/3) :
- **Appointment Details** :
  - Date, heure, timezone
- **Assigned Notary** :
  - Nom, email, téléphone
- **Services** :
  - Liste des services sélectionnés avec prix
- **Additional Options** :
  - Options supplémentaires avec prix
- **Your Documents** :
  - Liste des documents uploadés
  - Bouton download pour chaque document
- **Additional Notes** :
  - Notes ajoutées lors de la soumission

#### Droite (1/3) :
- **Chat avec le notaire** :
  - Messages en temps réel
  - Auto-scroll au dernier message
  - Input pour envoyer un message
  - Timestamps relatifs (ex: "5m ago", "2h ago")
  - Indicateur de lecture (read/unread)
  - Si pas de notaire assigné : message d'attente

---

## 💬 Messagerie (Chat Component)

### Fonctionnalités

✅ **Temps réel** : Les nouveaux messages apparaissent instantanément
✅ **Auto-scroll** : Scroll automatique vers le bas
✅ **Timestamps** : Affichage relatif du temps (ex: "just now", "5m ago")
✅ **Différenciation** : Messages du client (noirs) vs notaire (gris)
✅ **Mark as read** : Messages marqués comme lus automatiquement
✅ **Notifications email** : *(Nécessite configuration SendGrid)*

### Comment fonctionne le chat

1. **Client envoie un message** :
   ```javascript
   // Inséré dans table 'message'
   {
     submission_id: "...",
     sender_type: "client",
     sender_id: clientId,
     content: "Hello!"
   }
   ```

2. **Notaire reçoit en temps réel** :
   - Via Supabase subscription
   - Message apparaît dans son chat
   - *(Email envoyé via SendGrid si configuré)*

3. **Notaire répond** :
   - Même processus en sens inverse
   - Client reçoit instantanément

### Subscriptions Supabase

Le composant Chat utilise **Supabase Real-time** :
```javascript
supabase
  .channel(`submission:${submissionId}`)
  .on('INSERT', 'message', (payload) => {
    // Nouveau message reçu
    setMessages([...messages, payload.new])
  })
  .subscribe()
```

---

## 📥 Téléchargement de documents

Les clients peuvent télécharger leurs documents depuis la page de détails.

**Fonctionnement** :
1. Cliquer sur "Download" à côté du document
2. Le fichier est téléchargé depuis Supabase Storage
3. Sauvegardé localement avec le nom d'origine

**Storage bucket** : `submission-documents`

---

## 🎨 Design et UX

### Couleurs et style
- Background: `#FFFFFF` (blanc)
- Blocs: `#F3F4F6` (gris clair)
- Boutons: Noir avec effet glassy
- Icons: Heroicons (gris/noir uniquement)
- Font: TASA Orbiter (avec fallbacks)

### Responsive
- **Desktop** : Sidebar fixe à gauche
- **Mobile** : Hamburger menu

### Animations
- Fade-in sur les cartes
- Hover effects sur les boutons
- Smooth transitions

---

## 🔧 Architecture technique

### Structure des fichiers
```
client-dashboard/
└── src/
    ├── components/
    │   ├── ClientLayout.jsx    # Layout avec sidebar
    │   ├── PrivateRoute.jsx    # Protection des routes
    │   └── Chat.jsx            # Composant messagerie réutilisable
    ├── pages/client/
    │   ├── Login.jsx           # Authentification magic link
    │   ├── Dashboard.jsx       # Liste submissions + stats
    │   └── SubmissionDetail.jsx # Détails + chat
    ├── lib/
    │   └── supabase.js         # Client Supabase
    └── App.jsx                 # Routes
```

### Routes
- `/` → Redirect to `/login`
- `/login` → Page de connexion
- `/auth/callback` → Callback magic link (géré par Login)
- `/dashboard` → Dashboard (protégé)
- `/submission/:id` → Détails (protégé)

### Protection des routes

Le composant `PrivateRoute` vérifie l'authentification :
```javascript
const { session } = await supabase.auth.getSession()
if (!session) redirect to /login
```

---

## 🧪 Comment tester

### Test complet du flux

1. **Créer un client de test** (voir section Prérequis)

2. **Se connecter** :
   - Aller sur http://localhost:5175
   - Entrer email du client
   - Recevoir magic link
   - Cliquer sur le lien

3. **Vérifier le Dashboard** :
   - ✅ Stats affichées correctement
   - ✅ Submissions listées
   - ✅ Bouton "New Request" fonctionne

4. **Tester les détails** :
   - Cliquer "View Details" sur une submission
   - ✅ Toutes les infos affichées
   - ✅ Documents downloadables
   - ✅ Chat visible (si notaire assigné)

5. **Tester le chat** :
   - Envoyer un message
   - ✅ Message apparaît immédiatement
   - ✅ Timestamp correct
   - Dans un autre onglet, se connecter comme notaire
   - ✅ Message visible par le notaire
   - Répondre comme notaire
   - ✅ Réponse apparaît chez le client

---

## ⚡ Real-time Testing

Pour tester le temps réel :

1. **Ouvrir 2 fenêtres** :
   - Fenêtre A : Client Dashboard (localhost:5175)
   - Fenêtre B : Notary Panel (localhost:5174)

2. **Dans Client Dashboard** :
   - Ouvrir une submission avec notaire assigné
   - Ouvrir le chat

3. **Dans Notary Panel** :
   - Aller dans Messages (quand implémenté)
   - Ouvrir la même submission

4. **Envoyer des messages** dans les deux directions
   - ✅ Messages apparaissent instantanément des deux côtés

---

## 🐛 Troubleshooting

### Problème : Page blanche après login
**Solution** :
- Vérifier que le client existe dans la DB
- Vérifier que client_id est lié aux submissions
- Check console browser pour erreurs

### Problème : Magic link ne fonctionne pas
**Solution** :
- Vérifier Supabase Auth configuration
- Vérifier redirect URL dans Supabase settings
- Check spam folder

### Problème : Pas de submissions affichées
**Solution** :
```sql
-- Vérifier le client_id
SELECT * FROM submission WHERE client_id = (
  SELECT id FROM client WHERE email = 'test@example.com'
);
```

### Problème : Chat ne se met pas à jour
**Solution** :
- Vérifier Supabase Real-time est activé
- Check console pour erreurs de subscription
- Vérifier RLS policies sur table message

### Problème : Cannot download documents
**Solution** :
- Vérifier Storage bucket existe
- Vérifier bucket est public
- Check policies sur Storage

---

## 📊 Base de données

### Tables utilisées

| Table | Usage |
|-------|-------|
| `client` | Info client |
| `submission` | Demandes |
| `submission_services` | Services sélectionnés |
| `submission_options` | Options sélectionnées |
| `submission_files` | Documents uploadés |
| `message` | Messages chat |
| `notary` | Info notaires |

### Requêtes principales

**Get client submissions** :
```sql
SELECT s.*, n.name as notary_name
FROM submission s
LEFT JOIN notary n ON n.id = s.assigned_notary_id
WHERE s.client_id = ?
ORDER BY s.created_at DESC;
```

**Get messages** :
```sql
SELECT *
FROM message
WHERE submission_id = ?
ORDER BY created_at ASC;
```

---

## 🔜 Prochaines étapes

Le Client Dashboard est **terminé** !

Pour compléter la plateforme :

1. ⏳ **Admin Dashboard** (port 5176)
   - Gestion notaires
   - Assignment submissions
   - Vue globale messages

2. ⏳ **Messagerie Notary Panel** (port 5174)
   - Ajouter onglet Messages
   - Réutiliser composant Chat.jsx

3. ⏳ **SendGrid Integration**
   - Edge Function pour emails
   - Notifications automatiques

Voir `IMPLEMENTATION_PLAN.md` pour les détails.

---

## 📚 Ressources

- **Code source** : `client-dashboard/src/`
- **Plan complet** : `IMPLEMENTATION_PLAN.md`
- **Setup Messaging** : `MESSAGING_SETUP.md`
- **Access Guide** : `ACCESS_GUIDE.md`

---

**🎉 Le Client Dashboard est prêt à être utilisé !**

Pour toute question, consultez les guides ou le code source.

# Plan d'implémentation - Dashboards et Messagerie

Ce document détaille le plan complet pour implémenter les 3 dashboards avec système de messagerie intégré.

## 🎯 Vue d'ensemble

### Applications à créer/modifier

| App | Port | Statut | Priorité |
|-----|------|--------|----------|
| **Client Dashboard** | 5175 | 🟡 En cours | P0 - Critique |
| **Admin Dashboard** | 5176 | 🔴 À créer | P0 - Critique |
| **Notary Panel + Messaging** | 5174 | 🟡 Ajouter messaging | P1 - Importante |

---

## 📋 Phase 1 : Client Dashboard (Port 5175)

### Structure créée
```
client-dashboard/
├── src/
│   ├── lib/
│   │   └── supabase.js ✅
│   ├── components/
│   │   ├── PrivateRoute.jsx ✅
│   │   ├── ClientLayout.jsx ⏳
│   │   └── Chat.jsx ⏳
│   ├── pages/
│   │   └── client/
│   │       ├── Login.jsx ⏳
│   │       ├── Dashboard.jsx ⏳
│   │       └── SubmissionDetail.jsx ⏳
│   ├── App.jsx ✅
│   └── index.css ✅
├── vite.config.js ✅ (port 5175)
├── tailwind.config.js ✅
├── postcss.config.js ✅
└── .env.example ✅
```

### Pages à créer

#### 1. Login.jsx (Magic Link)
**Fonctionnalité** : Authentification sans mot de passe
```javascript
// Utilise supabase.auth.signInWithOtp()
// Gère le callback après clic sur magic link
// Redirige vers /dashboard
```

**Composants**:
- Input email
- Bouton "Send Magic Link"
- Message de confirmation
- Gestion du callback /auth/callback

#### 2. Dashboard.jsx (Liste des demandes)
**Fonctionnalité** : Vue d'ensemble des demandes du client

**Sections**:
- Header avec logo et profil
- Stats cards (Total, Pending, Accepted, Rejected)
- Table des submissions avec:
  - Date
  - Service
  - Status badge
  - Notary assigné
  - Action "View Details"

**Requête Supabase**:
```javascript
const { data: submissions } = await supabase
  .from('submission')
  .select(`
    *,
    notary:assigned_notary_id(name, email)
  `)
  .eq('client_id', clientId)
  .order('created_at', { ascending: false })
```

#### 3. SubmissionDetail.jsx (Détails + Chat)
**Fonctionnalité** : Détails complets + messagerie

**Sections**:
- Informations de la demande
- Services sélectionnés
- Documents uploadés
- Documents signés (si accepted)
- **Chat avec notaire** (composant Chat)
- Bouton download documents

#### 4. ClientLayout.jsx
**Fonctionnalité** : Layout réutilisable

**Éléments**:
- Sidebar fixe gauche avec:
  - Logo
  - Menu items (Dashboard, Profile)
  - Logout button
- Main content area
- Mobile responsive avec hamburger

#### 5. Chat.jsx (Composant réutilisable)
**Fonctionnalité** : Interface de messagerie

**Features**:
- Liste des messages (ordre chronologique)
- Affichage différencié (client vs notary)
- Input pour nouveau message
- Auto-scroll au dernier message
- Indicateur "read/unread"
- Timestamp sur chaque message

**Logique**:
```javascript
// Charger messages
const { data: messages } = await supabase
  .from('message')
  .select('*')
  .eq('submission_id', submissionId)
  .order('created_at', { ascending: true })

// Envoyer message
await supabase.from('message').insert({
  submission_id: submissionId,
  sender_type: 'client',
  sender_id: clientId,
  content: messageText
})

// Temps réel (optionnel)
supabase
  .channel(`submission:${submissionId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'message'
  }, payload => {
    // Ajouter nouveau message à la liste
  })
  .subscribe()
```

---

## 📋 Phase 2 : Admin Dashboard (Port 5176)

### Structure à créer
```
admin-dashboard/
├── src/
│   ├── lib/
│   │   └── supabase.js
│   ├── components/
│   │   ├── AdminLayout.jsx
│   │   ├── PrivateRoute.jsx
│   │   ├── Chat.jsx (copié de client)
│   │   ├── NotaryModal.jsx
│   │   └── AssignNotaryModal.jsx
│   ├── pages/
│   │   └── admin/
│   │       ├── Login.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Notaries.jsx
│   │       ├── Submissions.jsx
│   │       ├── SubmissionDetail.jsx
│   │       ├── Messages.jsx
│   │       └── Profile.jsx
│   ├── App.jsx
│   └── index.css
├── vite.config.js (port 5176)
├── tailwind.config.js
├── postcss.config.js
└── .env.example
```

### Pages à créer

#### 1. Login.jsx
**Fonctionnalité** : Login classique email/password

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})
```

#### 2. Dashboard.jsx (Analytics)
**Fonctionnalité** : Vue d'ensemble globale

**Stats**:
- Total submissions
- Total notaries
- Total clients
- Total revenue
- Pending requests
- Accepted rate

**Charts** (optionnel):
- Revenue par mois
- Submissions par notaire
- Status breakdown

#### 3. Notaries.jsx (Gestion des notaires)
**Fonctionnalité** : CRUD notaires

**Features**:
- Table liste notaires avec:
  - Name, Email, Phone
  - Active/Inactive status
  - # de submissions assignées
  - Actions (Edit, Delete)
- Bouton "Add Notary"
- Modal pour créer/éditer notaire

**Création notaire**:
```javascript
// 1. Créer auth user
const { data: authData } = await supabase.auth.admin.createUser({
  email: notaryEmail,
  password: temporaryPassword,
  email_confirm: true
})

// 2. Créer entrée notary
await supabase.from('notary').insert({
  user_id: authData.user.id,
  name: notaryName,
  email: notaryEmail,
  phone: notaryPhone,
  is_active: true
})
```

#### 4. Submissions.jsx (Vue globale)
**Fonctionnalité** : Toutes les submissions avec filters

**Features**:
- Table avec toutes les submissions
- Filtres:
  - Status (All, Pending, Accepted, Rejected)
  - Notary (dropdown)
  - Date range
- Search par client name/email
- Colonne "Assign Notary" avec dropdown

**Assignment notaire**:
```javascript
await supabase
  .from('submission')
  .update({ assigned_notary_id: notaryId })
  .eq('id', submissionId)
```

#### 5. SubmissionDetail.jsx
**Fonctionnalité** : Détails + Chat complet

**Sections**:
- Informations complètes
- Client info
- Notary assigné
- Documents
- **Chat complet** (tous les messages)
- Actions admin (change status, reassign)

#### 6. Messages.jsx (Vue conversations)
**Fonctionnalité** : Toutes les conversations

**Layout**:
- Liste des conversations (gauche):
  - Client name
  - Notary name
  - Submission ID
  - Last message preview
  - Unread count
- Chat (droite):
  - Messages de la conversation sélectionnée
  - Tous les messages visibles (client + notary)
  - Admin peut intervenir (optionnel)

#### 7. AdminLayout.jsx
**Fonctionnalité** : Layout avec sidebar

**Menu items**:
- Dashboard
- Notaries
- Submissions
- Messages
- Profile
- Logout

---

## 📋 Phase 3 : Messagerie Notary Panel

### Modifications dans notary-admin

#### 1. Ajouter onglet Messages dans AdminLayout
```javascript
const menuItems = [
  { path: '/dashboard', name: 'Dashboard', icon: 'heroicons:chart-bar' },
  { path: '/submissions', name: 'Submissions', icon: 'heroicons:document-text' },
  { path: '/messages', name: 'Messages', icon: 'heroicons:chat-bubble-left-right' }, // NOUVEAU
  { path: '/profile', name: 'Profile', icon: 'heroicons:user' }
];
```

#### 2. Créer Messages.jsx
**Fonctionnalité** : Liste conversations du notaire

**Query**:
```javascript
const { data: conversations } = await supabase
  .from('submission')
  .select(`
    id,
    created_at,
    client:client_id(first_name, last_name, email),
    messages:message(message_id, content, created_at, read, sender_type)
  `)
  .eq('assigned_notary_id', notaryId)
  .order('created_at', { ascending: false })
```

**Layout**:
- Liste conversations (même structure que Admin)
- Chat avec client
- Uniquement SES submissions

#### 3. Copier Chat.jsx du client-dashboard

#### 4. Ajouter badge unread count
Dans AdminLayout, afficher le nombre de messages non lus:
```javascript
const { data: unreadCount } = await supabase
  .rpc('get_unread_message_count', { p_user_id: userId })
```

---

## 🔧 Composants réutilisables

### Chat.jsx (Commun aux 3 apps)
**Props**:
```javascript
<Chat
  submissionId={submissionId}
  currentUserType="client" // ou "notary" ou "admin"
  currentUserId={userId}
/>
```

**Features partagées**:
- Load messages
- Send message
- Real-time updates
- Mark as read
- Scroll to bottom
- Timestamp formatting

**Différences par type**:
- **Client**: Peut seulement voir et envoyer
- **Notary**: Peut seulement voir et envoyer
- **Admin**: Peut voir tout, peut intervenir (optionnel)

### StatusBadge.jsx
Affiche le status avec couleur appropriée:
```javascript
<StatusBadge status="pending" />  // Yellow
<StatusBadge status="accepted" /> // Green
<StatusBadge status="rejected" /> // Red
```

### DocumentList.jsx
Liste des documents avec download:
```javascript
<DocumentList documents={documents} />
```

---

## 📊 API Functions (supabase.js)

### Client Dashboard
```javascript
// Get client by user ID
export const getClientByUserId = async (userId) => {}

// Get client submissions
export const getClientSubmissions = async (clientId) => {}

// Get submission detail
export const getSubmissionDetail = async (submissionId) => {}

// Download document
export const downloadDocument = async (filePath) => {}
```

### Admin Dashboard
```javascript
// Get all notaries
export const getAllNotaries = async () => {}

// Create notary
export const createNotary = async (notaryData) => {}

// Update notary
export const updateNotary = async (notaryId, updates) => {}

// Delete notary
export const deleteNotary = async (notaryId) => {}

// Get all submissions
export const getAllSubmissions = async (filters) => {}

// Assign notary to submission
export const assignNotary = async (submissionId, notaryId) => {}

// Get dashboard stats
export const getAdminStats = async () => {}

// Get all conversations
export const getAllConversations = async () => {}
```

### Messaging (Commun)
```javascript
// Get messages for submission
export const getMessages = async (submissionId) => {}

// Send message
export const sendMessage = async (messageData) => {}

// Mark messages as read
export const markMessagesAsRead = async (submissionId, userType) => {}

// Get unread count
export const getUnreadCount = async (userId) => {}

// Subscribe to new messages (real-time)
export const subscribeToMessages = (submissionId, callback) => {}
```

---

## 🔐 RLS Policies (Déjà créées)

✅ Toutes les policies sont dans `supabase-messaging-migration.sql`:
- Clients peuvent voir leurs submissions
- Notaries peuvent voir leurs submissions assignées
- Admins peuvent tout voir
- Messages: restrictions par sender/recipient

---

## 📧 SendGrid Integration

### Edge Function (À créer)
Voir `MESSAGING_SETUP.md` pour les instructions complètes.

**Trigger**: Chaque fois qu'un message est inséré
**Action**: Envoyer email au destinataire

**Template email**:
```html
<h2>New message from [Sender Name]</h2>
<p>[Message content]</p>
<a href="[Dashboard URL]">View Message</a>
```

---

## ✅ Checklist d'implémentation

### Client Dashboard
- [ ] Login.jsx avec magic link
- [ ] Dashboard.jsx avec liste submissions
- [ ] SubmissionDetail.jsx avec infos complètes
- [ ] Chat.jsx composant
- [ ] ClientLayout.jsx
- [ ] API functions dans supabase.js
- [ ] Tester authentification
- [ ] Tester affichage submissions
- [ ] Tester chat

### Admin Dashboard
- [ ] Structure app complète
- [ ] Login.jsx classique
- [ ] Dashboard.jsx avec analytics
- [ ] Notaries.jsx avec CRUD
- [ ] Submissions.jsx avec assignment
- [ ] Messages.jsx vue globale
- [ ] SubmissionDetail.jsx
- [ ] AdminLayout.jsx
- [ ] API functions
- [ ] Tester création notaire
- [ ] Tester assignment
- [ ] Tester chat admin

### Notary Panel Messaging
- [ ] Ajouter onglet Messages dans menu
- [ ] Créer Messages.jsx
- [ ] Copier Chat.jsx
- [ ] Afficher unread count
- [ ] Tester chat notary

### SendGrid
- [ ] Créer Edge Function
- [ ] Configurer trigger
- [ ] Tester envoi email
- [ ] Customize templates

### Tests finaux
- [ ] Client peut voir ses submissions
- [ ] Client peut chatter avec notary
- [ ] Notary peut voir submissions assignées
- [ ] Notary peut chatter avec clients
- [ ] Admin peut assigner notaries
- [ ] Admin peut voir tous les chats
- [ ] Emails envoyés correctement
- [ ] Real-time updates fonctionnent

---

## 📈 Ordre d'implémentation recommandé

1. **Client Dashboard basique** (sans chat) - 2-3h
2. **Admin Dashboard basique** (sans chat) - 3-4h
3. **Composant Chat.jsx** - 1-2h
4. **Intégrer Chat dans Client** - 30min
5. **Intégrer Chat dans Admin** - 30min
6. **Ajouter Messages dans Notary** - 1h
7. **SendGrid + Edge Function** - 1-2h
8. **Tests et polish** - 1-2h

**Total estimé**: 10-15 heures de développement

---

## 🚀 Prochaine session

Dans la prochaine session, commencer par:
1. Terminer Client Dashboard (Login + Dashboard + Detail)
2. Puis Admin Dashboard
3. Puis Messaging

Fichiers prioritaires:
- `/client-dashboard/src/pages/client/Login.jsx`
- `/client-dashboard/src/pages/client/Dashboard.jsx`
- `/client-dashboard/src/pages/client/SubmissionDetail.jsx`
- `/client-dashboard/src/components/ClientLayout.jsx`
- `/client-dashboard/src/components/Chat.jsx`


# Guide complet de la Messagerie

La messagerie est maintenant **100% fonctionnelle** dans le Client Dashboard et le Notary Panel ! 🎉

## 🎯 Vue d'ensemble

La messagerie permet aux **clients** et aux **notaires** de communiquer en temps réel sur chaque demande de service.

### Flux de communication

```
Client (Client Dashboard)
    ↕️ Messages en temps réel
Notary (Notary Panel)
    ↕️ Visible par (futur)
Admin (Admin Dashboard - à venir)
```

---

## ✅ Ce qui est terminé

### **Client Dashboard** (Port 5175)
✅ Chat intégré dans la page de détails de soumission
✅ Envoi de messages au notaire assigné
✅ Réception en temps réel des réponses
✅ Auto-scroll vers le dernier message
✅ Mark as read automatique

### **Notary Panel** (Port 5174)
✅ Page Messages avec liste des conversations
✅ Badge avec compteur de messages non lus
✅ Chat en temps réel avec clients
✅ Layout 2 panneaux (conversations + chat)
✅ Preview du dernier message
✅ Tri par message le plus récent
✅ Mise à jour automatique du badge

---

## 📱 Utilisation - Client Dashboard

### Accéder au chat

1. Se connecter au **Client Dashboard** (http://localhost:5175)
2. Aller sur **Dashboard**
3. Cliquer sur **"View Details"** d'une demande
4. Scroll vers la droite → **Chat visible**

### Chat disponible si:
✅ Un notaire est assigné à la demande
❌ Si pas de notaire : Message "Messaging will be available once a notary is assigned"

### Envoyer un message

1. **Taper** votre message dans l'input en bas
2. **Cliquer** sur le bouton d'envoi (avion en papier)
3. ✅ Message envoyé instantanément
4. ✅ Apparaît dans le chat en noir (vos messages)

### Recevoir une réponse

- Les messages du notaire apparaissent **automatiquement**
- En gris clair
- Sans rafraîchir la page
- Scroll automatique vers le bas

### Fonctionnalités

- ✅ **Timestamps** : "Just now", "5m ago", "2h ago", etc.
- ✅ **Real-time** : Pas besoin de refresh
- ✅ **Auto-scroll** : Toujours au dernier message
- ✅ **Read status** : Messages marqués comme lus
- ✅ **Sender name** : "You" vs nom du notaire

---

## 📱 Utilisation - Notary Panel

### Accéder aux messages

1. Se connecter au **Notary Panel** (http://localhost:5174)
2. Cliquer sur **"Messages"** dans le menu
3. ✅ Page Messages s'affiche

### Badge de notifications

Le menu **Messages** affiche un badge avec le nombre de messages non lus:

- **Badge noir** sur fond blanc (menu normal)
- **Badge blanc** sur fond noir (menu actif)
- **Mise à jour automatique** en temps réel
- **Visible** desktop + mobile

### Page Messages

**Layout 2 colonnes** :

#### Gauche : Liste des conversations
- Tous les clients avec demandes assignées
- Nom du client + email
- Status de la demande (badge coloré)
- Preview du dernier message
- Timestamp ("5m ago")
- Badge unread count par conversation
- Tri par message le plus récent en haut

#### Droite : Chat
- Header avec info client + status
- Date et heure du rendez-vous
- Chat complet avec le client
- Input pour envoyer des messages

### Utilisation

1. **Cliquer** sur une conversation dans la liste (gauche)
2. **Chat** s'affiche à droite
3. **Lire** l'historique des messages
4. **Répondre** au client
5. ✅ Client reçoit instantanément

### Conversation header

Affiche :
- Nom complet du client
- Email du client
- Status de la demande (badge)
- Date du rendez-vous
- Heure du rendez-vous

---

## 🔄 Real-time et Synchronisation

### Comment ça fonctionne

Le système utilise **Supabase Real-time** pour les updates instantanées.

#### Subscriptions actives

1. **Chat component** (client-dashboard + notary-admin)
```javascript
supabase
  .channel(`submission:${submissionId}`)
  .on('INSERT', 'message', (payload) => {
    // Nouveau message reçu
    setMessages([...messages, payload.new])
  })
  .subscribe()
```

2. **Badge unread count** (notary-admin)
```javascript
supabase
  .channel('message-changes')
  .on('*', 'message', () => {
    // Re-fetch unread count
    fetchUnreadCount()
  })
  .subscribe()
```

### Ce qui se passe en temps réel

✅ **Nouveau message** → Apparaît instantanément des deux côtés
✅ **Mark as read** → Count badge se met à jour
✅ **Multiple tabs** → Synchronisé partout

---

## 📊 Base de données

### Table `message`

| Colonne | Type | Description |
|---------|------|-------------|
| message_id | UUID | ID unique |
| submission_id | UUID | Référence submission |
| sender_type | TEXT | 'client', 'notary', ou 'admin' |
| sender_id | UUID | ID du sender |
| content | TEXT | Contenu du message |
| created_at | TIMESTAMP | Date/heure |
| read | BOOLEAN | Lu ou non |
| read_at | TIMESTAMP | Quand lu |
| email_sent | BOOLEAN | Email envoyé (SendGrid) |
| email_sent_at | TIMESTAMP | Quand email envoyé |

### RLS Policies

✅ **Clients** : Peuvent voir/envoyer messages de leurs submissions
✅ **Notaries** : Peuvent voir/envoyer messages de leurs submissions assignées
✅ **Admins** : Peuvent tout voir (futur)

### Queries utilisées

**Get messages pour une submission** :
```sql
SELECT *
FROM message
WHERE submission_id = ?
ORDER BY created_at ASC;
```

**Count unread pour notary** :
```sql
SELECT COUNT(*)
FROM message m
INNER JOIN submission s ON s.id = m.submission_id
WHERE s.assigned_notary_id = ?
AND m.read = false
AND m.sender_type != 'notary';
```

**Mark as read** :
```sql
UPDATE message
SET read = true, read_at = NOW()
WHERE submission_id = ?
AND read = false
AND sender_type != 'client'; -- ou 'notary'
```

---

## 🧪 Comment tester

### Test bout-en-bout

1. **Setup** :
   - Client Dashboard sur http://localhost:5175
   - Notary Panel sur http://localhost:5174
   - 1 submission avec client_id et assigned_notary_id

2. **Côté Client** :
   - Se connecter au Client Dashboard
   - Aller dans une submission
   - Envoyer un message : "Hello, I have a question"

3. **Côté Notary** :
   - Rafraîchir le Notary Panel
   - ✅ Badge Messages affiche "1"
   - Cliquer sur Messages
   - ✅ Conversation avec badge "1" unread
   - Cliquer sur la conversation
   - ✅ Message du client visible
   - Répondre : "Hello! How can I help?"

4. **Retour côté Client** :
   - ✅ Réponse apparaît automatiquement
   - Répondre à nouveau

5. **Vérifier temps réel** :
   - ✅ Messages apparaissent des deux côtés
   - ✅ Badge se met à jour
   - ✅ Timestamps corrects
   - ✅ Auto-scroll fonctionne

### Test avec 2 fenêtres

**Fenêtre A** : Client Dashboard
- Login client
- Ouvrir submission
- Garder ouvert

**Fenêtre B** : Notary Panel
- Login notaire
- Aller dans Messages
- Sélectionner conversation
- Garder ouvert

**Envoyer des messages** des deux côtés :
- ✅ Apparaissent instantanément
- ✅ Pas de refresh nécessaire
- ✅ Badge updates automatiques

---

## 📧 Notifications Email (SendGrid)

### Status : ⏳ À configurer

Les bases sont en place, mais SendGrid n'est pas encore configuré.

### Ce qu'il faut faire

1. **Créer compte SendGrid**
2. **Obtenir API key**
3. **Vérifier sender email**
4. **Créer Edge Function** (voir `MESSAGING_SETUP.md`)
5. **Configurer trigger database**

### Quand configuré

✅ Email envoyé à chaque nouveau message
✅ Template personnalisable
✅ Lien direct vers le chat
✅ Notifications push

---

## 🎨 Design et UX

### Layout Chat

**Header** :
- Icon chat
- "Chat with [Name]"
- Message count

**Messages** :
- Alignés à gauche (autres) ou droite (vous)
- Fond noir pour vos messages
- Fond gris pour les autres
- Timestamps en relatif
- Sender name en haut

**Input** :
- Input text pleine largeur
- Bouton send avec icon
- Disabled pendant envoi
- Focus automatique

### Couleurs

- **Vos messages** : `bg-black text-white`
- **Autres messages** : `bg-[#F3F4F6] text-gray-900`
- **Badge unread** : `bg-black text-white` (ou inverse si actif)
- **Timestamps** : `text-gray-400` ou `text-gray-600`

### Animations

- ✅ Smooth scroll vers le bas
- ✅ Fade in des nouveaux messages
- ✅ Hover effects sur conversations
- ✅ Loading spinner pendant envoi

---

## 🐛 Troubleshooting

### Messages ne s'affichent pas

**Solution** :
1. Vérifier RLS policies activées
2. Check console pour erreurs
3. Vérifier submission_id correct
4. Vérifier assigned_notary_id existe

### Badge ne se met pas à jour

**Solution** :
1. Vérifier Supabase Real-time activé
2. Check subscription dans console
3. Vérifier notary_id dans query
4. Rafraîchir la page

### Chat ne montre rien

**Solution** :
1. Vérifier notaire assigné
2. Check client_id dans submission
3. Vérifier permissions DB
4. Console errors

### Messages n'arrivent pas en temps réel

**Solution** :
1. Activer Supabase Real-time dans dashboard
2. Vérifier subscription channel
3. Check network tab
4. Tester avec refresh manuel

---

## 📈 Statistiques

### Ce qui est implémenté

| Feature | Client Dashboard | Notary Panel | Admin Dashboard |
|---------|-----------------|--------------|-----------------|
| Envoyer messages | ✅ | ✅ | ⏳ |
| Recevoir messages | ✅ | ✅ | ⏳ |
| Real-time updates | ✅ | ✅ | ⏳ |
| Unread count | ❌ | ✅ | ⏳ |
| Badge notifications | ❌ | ✅ | ⏳ |
| Conversation list | ❌ | ✅ | ⏳ |
| Mark as read | ✅ | ✅ | ⏳ |
| Email notifications | ⏳ | ⏳ | ⏳ |

### Lignes de code

- **Chat.jsx** : 228 lignes (réutilisable)
- **Messages.jsx** (Notary) : 220 lignes
- **AdminLayout updates** : +65 lignes
- **Total messagerie** : ~513 lignes

---

## 🔜 Prochaines étapes

### Pour compléter la messagerie

1. ⏳ **Admin Dashboard**
   - Créer Admin Dashboard (port 5176)
   - Vue globale de toutes les conversations
   - Copier Chat.jsx
   - Possibilité d'intervenir

2. ⏳ **SendGrid Integration**
   - Edge Function
   - Trigger database
   - Templates email
   - Tester envoi

3. ⏳ **Améliorations**
   - Upload fichiers dans chat
   - Emoji picker
   - Typing indicator
   - Message reactions

---

## 📚 Fichiers de référence

### Client Dashboard
- `client-dashboard/src/components/Chat.jsx`
- `client-dashboard/src/pages/client/SubmissionDetail.jsx`

### Notary Panel
- `notary-admin/src/components/admin/Chat.jsx`
- `notary-admin/src/pages/admin/Messages.jsx`
- `notary-admin/src/components/admin/AdminLayout.jsx`

### Documentation
- `CLIENT_DASHBOARD_GUIDE.md`
- `MESSAGING_SETUP.md`
- `IMPLEMENTATION_PLAN.md`

---

## 🎉 Conclusion

La messagerie est **100% fonctionnelle** pour :
- ✅ Client Dashboard
- ✅ Notary Panel

Il reste seulement :
- ⏳ Admin Dashboard (application à créer)
- ⏳ SendGrid (configuration)

**La base est solide et prête à être utilisée !** 🚀

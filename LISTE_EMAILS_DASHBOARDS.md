# Liste complète des emails envoyés depuis les dashboards

## Types d'emails disponibles

Le système utilise la fonction Edge `send-transactional-email` qui supporte les types suivants :

1. **`payment_success`** - Confirmation de paiement réussi
2. **`payment_failed`** - Échec de paiement
3. **`notary_assigned`** - Notaire assigné à une soumission
4. **`notarized_file_uploaded`** - Document notarié téléchargé
5. **`message_received`** - Nouveau message reçu
6. **`new_submission_available`** - Nouvelle soumission disponible (pour les notaires)
7. **`appointment_reminder_day_before`** - Rappel de rendez-vous (1 jour avant)
8. **`appointment_reminder_one_hour_before`** - Rappel de rendez-vous (1 heure avant)
9. **`submission_updated`** - Soumission mise à jour

---

## Emails envoyés depuis le Dashboard Notaire (`notary-dashboard`)

### 1. **notarized_file_uploaded**
**Fichier:** `notary-dashboard/src/pages/notary/SubmissionDetail.jsx`  
**Ligne:** ~418  
**Déclencheur:** Quand un notaire télécharge un document notarié  
**Destinataire:** Client  
**Données envoyées:**
- `submission_id`
- `submission_number`
- `file_name`
- `file_url`

### 2. **message_received**
**Fichier:** `notary-dashboard/src/components/Chat.jsx`  
**Ligne:** ~157  
**Déclencheur:** Quand un notaire envoie un message au client  
**Destinataire:** Client  
**Données envoyées:**
- `submission_id`
- `submission_number`
- `message_preview`

---

## Emails envoyés depuis le Dashboard Admin (`notary-admin`)

### 1. **notary_assigned**
**Fichier:** `notary-admin/src/pages/admin/SubmissionDetail.jsx`  
**Ligne:** ~910  
**Déclencheur:** Quand un admin assigne un notaire à une soumission depuis la page de détails  
**Destinataire:** Client  
**Données envoyées:**
- `submission_id`
- `submission_number`
- `notary_name`

**Fichier:** `notary-admin/src/pages/admin/Submissions.jsx`  
**Ligne:** ~252  
**Déclencheur:** Quand un admin assigne un notaire à une soumission depuis la liste des soumissions  
**Destinataire:** Client  
**Données envoyées:**
- `submission_id`
- `submission_number`
- `notary_name`

### 2. **Invitation Notaire (via Supabase Auth)**
**Fichier:** `notary-admin/src/pages/admin/NotariesList.jsx`  
**Ligne:** ~194  
**Déclencheur:** Quand un admin envoie une invitation à un notaire  
**Destinataire:** Notaire  
**Type:** Email d'invitation Supabase Auth (pas via send-transactional-email)  
**Note:** Utilise `supabase.auth.admin.inviteUserByEmail()` - email standard de Supabase avec lien de configuration de mot de passe

### 3. **submission_updated**
**Fichier:** `notary-admin/src/pages/admin/SubmissionDetail.jsx`  
**Ligne:** ~1562  
**Déclencheur:** Quand un admin met à jour une soumission (informations personnelles, adresse, services, rendez-vous, prix)  
**Destinataire:** Client  
**Données envoyées:**
- `submission_id`
- `submission_number`
- `old_price`
- `new_price`
- `price_changed`
- `services`
- `appointment_date`
- `appointment_time`
- `timezone`
- `updated_fields` (personal_info, address, services, appointment)

### 4. **message_received**
**Fichier:** `notary-admin/src/components/admin/Chat.jsx`  
**Ligne:** ~279  
**Déclencheur:** Quand un admin envoie un message (au client ou au notaire)  
**Destinataire:** Client ou Notaire  
**Données envoyées:**
- `submission_id`
- `submission_number`
- `message_preview`

---

## Emails envoyés depuis le Dashboard Client (`client-dashboard`)

### 1. **message_received**
**Fichier:** `client-dashboard/src/components/Chat.jsx`  
**Ligne:** ~244  
**Déclencheur:** Quand un client envoie un message au notaire  
**Destinataire:** Notaire  
**Données envoyées:**
- `submission_id`
- `submission_number`
- `message_preview`

---

## Emails envoyés depuis les Edge Functions (automatiques)

### 1. **payment_success**
**Fichier:** `supabase/functions/verify-payment/index.ts`  
**Ligne:** ~402  
**Déclencheur:** Automatique après vérification réussie d'un paiement Stripe  
**Destinataire:** Client  
**Données envoyées:**
- `submission_id`
- `submission_number`
- `payment_amount`
- `payment_date`
- `invoice_url`

**Fichier:** `supabase/functions/verify-payment/index.ts`  
**Ligne:** ~461  
**Déclencheur:** Automatique après vérification réussie d'un paiement - notification aux notaires  
**Destinataire:** Notaires assignés  
**Données envoyées:**
- `submission_id`
- `submission_number`
- `client_name`
- `appointment_date`
- `appointment_time`

### 2. **payment_failed**
**Fichier:** `supabase/functions/stripe-webhook/index.ts`  
**Ligne:** ~79  
**Déclencheur:** Automatique quand un paiement échoue via webhook Stripe  
**Destinataire:** Client  
**Données envoyées:**
- `submission_id`
- `submission_number`
- `error_message`

### 3. **new_submission_available**
**Fichier:** `supabase/functions/verify-payment/index.ts`  
**Ligne:** ~463  
**Déclencheur:** Automatique après vérification réussie d'un paiement - notification aux notaires actifs compétents  
**Destinataire:** Tous les notaires actifs compétents pour les services de la soumission  
**Données envoyées:**
- `submission_id`
- `submission_number`
- `client_name`
- `appointment_date`
- `appointment_time`
- `timezone`
- `address`
- `city`
- `country`

### 4. **appointment_reminder_day_before**
**Fichier:** `supabase/functions/send-appointment-reminders/index.ts`  
**Ligne:** ~107  
**Déclencheur:** Automatique via cron job - 1 jour avant le rendez-vous  
**Destinataire:** Notaire uniquement  
**Données envoyées:**
- `submission_id`
- `submission_number`
- `client_name`
- `appointment_date`
- `appointment_time`
- `timezone`
- `address`
- `city`
- `country`

**Note:** Actuellement, seul le notaire reçoit ce rappel. Le client ne reçoit pas de rappel 1 jour avant.

### 5. **appointment_reminder_one_hour_before**
**Fichier:** `supabase/functions/send-appointment-reminders/index.ts`  
**Ligne:** ~245  
**Déclencheur:** Automatique via cron job - 1 heure avant le rendez-vous  
**Destinataire:** Notaire uniquement  
**Données envoyées:**
- `submission_id`
- `submission_number`
- `client_name`
- `appointment_date`
- `appointment_time`
- `timezone`
- `address`
- `city`
- `country`

**Note:** Actuellement, seul le notaire reçoit ce rappel. Le client ne reçoit pas de rappel 1 heure avant.

---

## Résumé par dashboard

### Dashboard Notaire
- ✅ `notarized_file_uploaded` → Client
- ✅ `message_received` → Client
- ✅ **Réinitialisation mot de passe** → Notaire (via Supabase Auth, pas send-transactional-email)

### Dashboard Admin
- ✅ `notary_assigned` → Client (2 endroits)
- ✅ `submission_updated` → Client
- ✅ `message_received` → Client ou Notaire
- ✅ **Invitation notaire** → Notaire (via Supabase Auth, pas send-transactional-email)

### Dashboard Client
- ✅ `message_received` → Notaire
- ✅ **Réinitialisation mot de passe** → Client (via Supabase Auth, pas send-transactional-email)

### Edge Functions (Automatiques)
- ✅ `payment_success` → Client + Notaires assignés
- ✅ `payment_failed` → Client
- ✅ `new_submission_available` → Notaires actifs compétents
- ✅ `appointment_reminder_day_before` → Notaire uniquement
- ✅ `appointment_reminder_one_hour_before` → Notaire uniquement

---

## Emails via Supabase Auth (non personnalisés)

Ces emails sont envoyés via les fonctions natives de Supabase Auth et ne passent pas par `send-transactional-email` :

### 1. **Réinitialisation mot de passe - Client**
**Fichier:** `client-dashboard/src/pages/client/Login.jsx`  
**Ligne:** ~60  
**Déclencheur:** Quand un client demande une réinitialisation de mot de passe  
**Destinataire:** Client  
**Type:** Email standard Supabase Auth  
**Note:** Utilise `supabase.auth.resetPasswordForEmail()` - email standard de Supabase avec lien de réinitialisation

### 2. **Réinitialisation mot de passe - Notaire**
**Fichier:** `notary-dashboard/src/pages/notary/Login.jsx`  
**Ligne:** ~79  
**Déclencheur:** Quand un notaire demande une réinitialisation de mot de passe  
**Destinataire:** Notaire  
**Type:** Email standard Supabase Auth  
**Note:** Utilise `supabase.auth.resetPasswordForEmail()` - email standard de Supabase avec lien de réinitialisation

---

## Format des heures dans les emails

**Tous les emails personnalisés utilisent maintenant le format AM/PM** grâce à la fonction `formatTime12h()` ajoutée dans `supabase/functions/send-transactional-email/index.ts`.

Les emails suivants affichent des heures :
- `new_submission_available` - Affiche l'heure du rendez-vous
- `appointment_reminder_day_before` - Affiche l'heure du rendez-vous dans le sujet et le corps
- `appointment_reminder_one_hour_before` - Affiche l'heure du rendez-vous
- `submission_updated` - Affiche l'heure du rendez-vous si l'appointment a été mis à jour

**Note:** Les emails Supabase Auth (réinitialisation mot de passe, invitations) utilisent les templates par défaut de Supabase et ne sont pas personnalisés.


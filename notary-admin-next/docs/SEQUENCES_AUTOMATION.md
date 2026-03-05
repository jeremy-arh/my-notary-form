# Séquences d'automatisation (Email + SMS)

Ce document décrit le système de séquences d'automatisation géré par les API Next.js du back-office, avec **Inngest** pour l'exécution planifiée.

## Vue d'ensemble

Les séquences permettent d'envoyer automatiquement des emails et/ou SMS aux clients selon des règles (déclencheur, délai, fenêtre d'envoi). Les séquences peuvent être :

- **Email uniquement** : toutes les étapes envoient des emails
- **SMS uniquement** : toutes les étapes envoient des SMS
- **Mixte** : chaque étape peut être email ou SMS (ex : email J+1, SMS J+2, email J+3)

## Déclenchement (Inngest)

1. **Webhook Supabase** : à chaque INSERT dans `submission`, Supabase appelle l'API du back-office
2. **Planification** : le back-office planifie des événements Inngest avec un timestamp (`ts`) pour chaque étape
3. **Exécution** : Inngest exécute chaque étape au moment prévu (précision exacte)

**URL stable** : déployez le back-office sur Vercel — l'URL ne change jamais.

## API

### Lister les séquences
```
GET /api/admin/sequences
```
Authentification : utilisateur connecté (session Supabase).

### Créer une séquence
```
POST /api/admin/sequences
Content-Type: application/json

{
  "name": "Relance panier abandonné",
  "description": "Optionnel",
  "trigger_event": "submission_created",
  "trigger_status": "pending_payment",
  "channel": "email" | "sms" | "mixed"
}
```

### Modifier / Supprimer une séquence
```
PUT /api/admin/sequences/[id]
DELETE /api/admin/sequences/[id]
```

### Gérer les étapes
```
POST   /api/admin/sequences/[id]/steps
PUT    /api/admin/sequences/[id]/steps/[stepId]
DELETE /api/admin/sequences/[id]/steps/[stepId]
```

### Exécution manuelle (rattrapage)
```
GET  /api/admin/sequences/run
POST /api/admin/sequences/run
```

Utile pour rattraper les soumissions créées avant la mise en place du webhook. Authentification : admin ou `Authorization: Bearer <CRON_SECRET>`.

### Planifier les séquences pour une soumission (sans webhook)
```
POST /api/admin/submissions/[id]/schedule-sequences
```

Planifie manuellement les étapes Inngest pour une soumission. Utile pour tester sans webhook ou rattraper. Un bouton **« Planifier les séquences »** est disponible sur chaque fiche de soumission dans le back-office.

## Variables de template

| Variable | Description |
|----------|-------------|
| `{{first_name}}` | Prénom du client |
| `{{last_name}}` | Nom du client |
| `{{email}}` | Email du client |
| `{{form_link}}` | Lien vers le formulaire client |
| `{{support_email}}` | Email de support |
| `{{company_name}}` | Nom de l'entreprise |

## Configuration

### Variables d'environnement

| Variable | Description |
|----------|-------------|
| `INNGEST_EVENT_KEY` | Clé pour envoyer des événements (prod) |
| `INNGEST_SIGNING_KEY` | Clé de signature (prod, fournie par Inngest) |
| `CRON_SECRET` | Secret pour le webhook Supabase |
| `SENDGRID_API_KEY` | Clé API SendGrid |
| `SENDGRID_FROM_EMAIL` | Email expéditeur |
| `SENDGRID_FROM_NAME` | Nom expéditeur |
| `TWILIO_ACCOUNT_SID` | Compte Twilio |
| `TWILIO_AUTH_TOKEN` | Token Twilio |
| `TWILIO_PHONE_NUMBER` | Numéro Twilio |
| `NEXT_PUBLIC_CLIENT_FORM_URL` | URL du formulaire client |

### 1. Inngest Cloud

1. Créez un compte sur [app.inngest.com](https://app.inngest.com)
2. Installez l'intégration Vercel ou synchronisez manuellement : `PUT https://votre-domaine.com/api/inngest`
3. Ajoutez `INNGEST_EVENT_KEY` et `INNGEST_SIGNING_KEY` dans les variables d'environnement

### 2. Webhook Supabase (obligatoire)

1. **Déployez** le back-office sur Vercel (URL stable, ex: `https://notary-admin.vercel.app`)
2. Supabase → **Database** → **Webhooks** → **Create a new hook**
3. **Table** : `submission` | **Events** : `Insert`
4. **URL** : `https://votre-domaine.vercel.app/api/webhooks/submission-created`
5. **Headers** : `Authorization` = `Bearer <CRON_SECRET>`

### 3. Développement local

Le webhook ne peut pas atteindre localhost. Pour tester en local, utilisez le bouton « Planifier les séquences » sur chaque fiche de soumission. En production (déployé), le webhook fonctionne automatiquement.

**Windows** : utilisez `npm run dev:inngest` (le script gère la variable INNGEST_DEV).  
Ou manuellement en PowerShell : `$env:INNGEST_DEV="1"; npm run dev`

Ouvrez http://localhost:8288 pour voir les événements et exécutions.

**En cas d'erreur "Module not found: inngest/next"** : supprimez `node_modules` et `.next`, puis réinstallez :
```bash
Remove-Item -Recurse -Force node_modules, .next
npm install
```

## Migration base de données

Exécutez la migration pour activer le canal `mixed` :

```bash
supabase db push
```

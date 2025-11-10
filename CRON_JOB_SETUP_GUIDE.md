# Guide de configuration du cron job pour les rappels de rendez-vous

## ⚠️ Important

**Supabase ne supporte PAS nativement les cron jobs pour les Edge Functions.** Vous devez configurer un service externe pour appeler périodiquement l'Edge Function `send-appointment-reminders`.

## Options de configuration

### Option 1 : Service externe (Recommandé)

Utilisez un service de cron job gratuit ou payant pour appeler l'Edge Function toutes les heures.

#### Services recommandés :

1. **cron-job.org** (Gratuit)
   - URL : https://cron-job.org
   - Gratuit jusqu'à 3 cron jobs
   - Interface simple

2. **EasyCron** (Gratuit/Payant)
   - URL : https://www.easycron.com
   - Gratuit avec limitations
   - Interface intuitive

3. **UptimeRobot** (Gratuit)
   - URL : https://uptimerobot.com
   - Gratuit jusqu'à 50 monitors
   - Peut aussi monitorer votre site

#### Configuration avec cron-job.org :

1. **Créer un compte** sur https://cron-job.org
2. **Ajouter un nouveau cron job** :
   - **Title** : `Appointment Reminders`
   - **Address (URL)** : `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders`
   - **Request method** : `POST`
   - **Request headers** :
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```
   - **Request body** : `{}`
   - **Schedule** : `0 * * * *` (toutes les heures à minute 0)
   - **Timeout** : `300` secondes (5 minutes)
3. **Activer le cron job**

#### Configuration avec EasyCron :

1. **Créer un compte** sur https://www.easycron.com
2. **Ajouter un nouveau cron job** :
   - **Cron Job Name** : `Appointment Reminders`
   - **URL** : `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders`
   - **HTTP Method** : `POST`
   - **HTTP Headers** :
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```
   - **HTTP Body** : `{}`
   - **Cron Expression** : `0 * * * *` (toutes les heures)
   - **Timeout** : `300` secondes
3. **Activer le cron job**

### Option 2 : Utiliser GitHub Actions (Gratuit)

Si votre code est sur GitHub, vous pouvez utiliser GitHub Actions pour créer un workflow cron.

1. **Créer un fichier** `.github/workflows/appointment-reminders.yml` :

```yaml
name: Send Appointment Reminders

on:
  schedule:
    # Toutes les heures à minute 0
    - cron: '0 * * * *'
  workflow_dispatch: # Permet de déclencher manuellement

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{}'
```

2. **Ajouter le secret** `SUPABASE_SERVICE_ROLE_KEY` dans les paramètres GitHub :
   - Allez dans **Settings** > **Secrets and variables** > **Actions**
   - Ajoutez `SUPABASE_SERVICE_ROLE_KEY` avec votre clé de service Supabase

### Option 3 : Utiliser Vercel Cron (si vous utilisez Vercel)

Si vous déployez votre application sur Vercel, vous pouvez utiliser Vercel Cron Jobs.

1. **Créer un fichier** `vercel.json` :

```json
{
  "crons": [
    {
      "path": "/api/cron/appointment-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

2. **Créer une route API** qui appelle l'Edge Function Supabase

### Option 4 : Utiliser un serveur dédié (Avancé)

Si vous avez un serveur dédié, vous pouvez configurer un cron job système :

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne (toutes les heures)
0 * * * * curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" -H "Content-Type: application/json" -d '{}'
```

## Configuration requise

### Variables nécessaires

- **URL de l'Edge Function** : `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders`
- **Service Role Key** : Votre clé de service Supabase (trouvable dans **Settings** > **API** > **service_role key**)

### Fréquence recommandée

- **Fréquence** : Toutes les heures (`0 * * * *`)
- **Raison** : 
  - Les rappels "la veille" peuvent être envoyés à n'importe quelle heure de la journée (ils sont envoyés la veille du rendez-vous)
  - Les rappels "1 heure avant" doivent être envoyés fréquemment pour capturer les rendez-vous dans la fenêtre de ±5 minutes

### Alternative : Plus fréquent

Si vous voulez être plus précis pour les rappels "1 heure avant", vous pouvez exécuter le cron job toutes les 15 minutes :

- **Fréquence** : Toutes les 15 minutes (`*/15 * * * *`)
- **Avantage** : Plus de précision pour les rappels 1 heure avant
- **Inconvénient** : Plus d'appels à l'API (mais la fonction évite les doublons grâce à `appointment_reminder_log`)

## Vérification

### Tester manuellement

Pour tester que l'Edge Function fonctionne, appelez-la manuellement :

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Vérifier les logs

1. Allez dans le dashboard Supabase
2. **Edge Functions** > **send-appointment-reminders** > **Logs**
3. Vérifiez que les rappels sont envoyés correctement

### Vérifier les emails

1. Créez un rendez-vous pour demain avec un notaire
2. Attendez que le cron job s'exécute (ou appelez manuellement)
3. Vérifiez que le notaire a reçu l'email de rappel

## Protection contre les doublons

La fonction `send-appointment-reminders` utilise la table `appointment_reminder_log` pour éviter d'envoyer des rappels en double :

- Un rappel "la veille" ne sera envoyé qu'une fois par jour pour chaque rendez-vous
- Un rappel "1 heure avant" ne sera envoyé qu'une fois par jour pour chaque rendez-vous

Même si le cron job s'exécute plusieurs fois dans la même journée, les rappels ne seront pas dupliqués.

## Dépannage

### Le cron job ne s'exécute pas

1. Vérifiez que le cron job est activé dans le service externe
2. Vérifiez que l'URL est correcte
3. Vérifiez que les en-têtes (Authorization) sont corrects
4. Vérifiez les logs du service de cron job

### Les rappels ne sont pas envoyés

1. Vérifiez les logs de l'Edge Function dans Supabase
2. Vérifiez que les rendez-vous ont le statut `confirmed` ou `accepted`
3. Vérifiez que les rendez-vous ont un `assigned_notary_id`
4. Vérifiez que les notaires ont un email valide
5. Vérifiez que `SENDGRID_API_KEY` est configurée

### Les rappels sont envoyés en double

1. Vérifiez que la table `appointment_reminder_log` existe
2. Vérifiez que les contraintes UNIQUE fonctionnent
3. Vérifiez les logs pour voir si des rappels sont ignorés (message "already sent today")

## Recommandation finale

**Utilisez cron-job.org** (option 1) pour commencer :
- Gratuit
- Simple à configurer
- Fiable
- Pas besoin de code supplémentaire

Une fois que vous avez validé que tout fonctionne, vous pouvez migrer vers une solution plus permanente si nécessaire.


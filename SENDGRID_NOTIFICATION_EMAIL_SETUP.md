# Configuration des emails de notification avec SendGrid

Ce guide explique comment configurer SendGrid pour envoyer des emails de notification aux clients et aux notaires.

## 📋 Table des matières

1. [Création du template SendGrid](#1-création-du-template-sendgrid)
2. [Configuration de l'Edge Function](#2-configuration-de-ledge-function)
3. [Configuration des variables d'environnement](#3-configuration-des-variables-denvironnement)
4. [Intégration avec les notifications](#4-intégration-avec-les-notifications)
5. [Test et dépannage](#5-test-et-dépannage)

---

## 1. Création du template SendGrid

### Étape 1 : Créer un Dynamic Template

1. Connectez-vous à votre compte SendGrid : https://app.sendgrid.com
2. Allez dans **Email API** > **Dynamic Templates**
3. Cliquez sur **Create a Dynamic Template**
4. Nommez le template : `Notification Email Template`
5. Cliquez sur **Add Version**
6. Choisissez **Code Editor** (recommandé pour plus de contrôle)

### Étape 2 : Créer le design du template

Voici un exemple de template HTML pour les notifications :

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 2px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #111827;">MY NOTARY</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Notification Icon based on type -->
              {{#if (eq notification_type "success")}}
                <div style="font-size: 48px; text-align: center; margin-bottom: 20px;">✅</div>
              {{else if (eq notification_type "warning")}}
                <div style="font-size: 48px; text-align: center; margin-bottom: 20px;">⚠️</div>
              {{else if (eq notification_type "error")}}
                <div style="font-size: 48px; text-align: center; margin-bottom: 20px;">❌</div>
              {{else}}
                <div style="font-size: 48px; text-align: center; margin-bottom: 20px;">📢</div>
              {{/if}}
              
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #111827;">
                {{notification_title}}
              </h2>
              
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Bonjour {{user_name}},
              </p>
              
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                {{notification_message}}
              </p>
              
              <!-- Action Button -->
              {{#if action_url}}
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{action_url}}" style="display: inline-block; padding: 14px 28px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Voir les détails
                    </a>
                  </td>
                </tr>
              </table>
              {{/if}}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
                Ceci est une notification automatique de MY NOTARY.<br>
                Veuillez ne pas répondre à cet email.
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
                <a href="{{dashboard_url}}" style="color: #6b7280; text-decoration: none;">Visiter le tableau de bord</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### Étape 3 : Variables dynamiques disponibles

Le template peut utiliser ces variables :

- `{{notification_title}}` - Titre de la notification
- `{{notification_message}}` - Message de la notification
- `{{notification_type}}` - Type (info, success, warning, error)
- `{{user_name}}` - Nom de l'utilisateur
- `{{action_url}}` - URL pour voir les détails (si disponible)
- `{{dashboard_url}}` - URL du tableau de bord
- `{{submission_id}}` - ID de la soumission (si disponible)
- `{{file_name}}` - Nom du fichier (pour les notifications de fichiers)

### Étape 4 : Enregistrer et activer le template

1. Cliquez sur **Save** pour enregistrer le template
2. Cliquez sur **Activate** pour activer cette version
3. **Copiez le Template ID** (vous en aurez besoin pour la configuration)

---

## 2. Configuration de l'Edge Function

### Étape 1 : Déployer l'Edge Function

```bash
# Depuis la racine du projet
cd supabase/functions/send-notification-email
supabase functions deploy send-notification-email
```

### Étape 2 : Vérifier le déploiement

Vérifiez que la fonction est déployée dans Supabase Dashboard > **Edge Functions**.

---

## 3. Configuration des variables d'environnement

### Étape 1 : Ajouter les secrets dans Supabase Vault

1. Allez dans Supabase Dashboard > **Project Settings** > **Vault**
2. Ajoutez les secrets suivants :

| Nom du secret | Valeur | Description |
|---------------|--------|-------------|
| `SENDGRID_API_KEY` | `SG.xxx...` | Votre clé API SendGrid |
| `SENDGRID_TEMPLATE_ID` | `d-xxxxx` | ID de votre template SendGrid |
| `SENDGRID_FROM_EMAIL` | `support@mynotary.io` | Adresse email expéditrice |
| `SENDGRID_FROM_NAME` | `MY NOTARY` | Nom de l'expéditeur |
| `CLIENT_DASHBOARD_URL` | `https://client.mynotary.io` | URL du dashboard client |
| `NOTARY_DASHBOARD_URL` | `https://notary.mynotary.io` | URL du dashboard notaire |
| `ADMIN_DASHBOARD_URL` | `https://admin.mynotary.io` | URL du dashboard admin |

### Étape 2 : Configurer les secrets pour l'Edge Function

1. Allez dans Supabase Dashboard > **Edge Functions** > **send-notification-email**
2. Cliquez sur **Settings** > **Secrets**
3. Ajoutez tous les secrets listés ci-dessus

**OU** utilisez la CLI :

```bash
# Ajouter les secrets
supabase secrets set SENDGRID_API_KEY=SG.xxx...
supabase secrets set SENDGRID_TEMPLATE_ID=d-xxxxx
supabase secrets set SENDGRID_FROM_EMAIL=support@mynotary.io
supabase secrets set SENDGRID_FROM_NAME="MY NOTARY"
supabase secrets set CLIENT_DASHBOARD_URL=https://client.mynotary.io
supabase secrets set NOTARY_DASHBOARD_URL=https://notary.mynotary.io
supabase secrets set ADMIN_DASHBOARD_URL=https://admin.mynotary.io
```

---

## 4. Intégration avec les notifications

### Option 1 : Envoyer les emails depuis l'application (RECOMMANDÉ)

Modifiez votre code pour appeler l'Edge Function après avoir créé une notification :

```javascript
// Exemple dans votre code JavaScript/TypeScript
const createNotificationAndSendEmail = async (
  userId,
  userType,
  title,
  message,
  type = 'info',
  actionType = null,
  actionData = null
) => {
  // Créer la notification
  const { data: notification, error } = await supabase.rpc('create_notification', {
    p_user_id: userId,
    p_user_type: userType,
    p_title: title,
    p_message: message,
    p_type: type,
    p_action_type: actionType,
    p_action_data: actionData,
    p_send_email: false // Ne pas envoyer d'email depuis la fonction SQL
  });

  if (error) throw error;

  // Envoyer l'email via Edge Function (sauf pour les admins)
  if (userType !== 'admin' && notification) {
    try {
      const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
        body: { notification_id: notification }
      });

      if (emailError) {
        console.error('Error sending notification email:', emailError);
        // Ne pas bloquer si l'email échoue
      }
    } catch (emailError) {
      console.error('Error calling email function:', emailError);
    }
  }

  return notification;
};
```

### Option 2 : Utiliser un trigger database (ALTERNATIVE)

Exécutez la migration SQL :

```sql
-- Voir le fichier supabase-notification-email-integration.sql
```

**Note :** Cette approche nécessite l'extension `pg_net` ou `http` qui peut ne pas être disponible dans tous les projets Supabase.

### Option 3 : Utiliser un webhook Supabase (ALTERNATIVE)

1. Allez dans Supabase Dashboard > **Database** > **Webhooks**
2. Créez un nouveau webhook qui se déclenche sur `INSERT` dans la table `notifications`
3. Configurez l'URL de l'Edge Function comme endpoint

---

## 5. Test et dépannage

### Tester l'Edge Function

```bash
# Tester avec un ID de notification
supabase functions invoke send-notification-email \
  --data '{"notification_id": "your-notification-id-here"}'
```

### Vérifier les logs

```bash
# Voir les logs de l'Edge Function
supabase functions logs send-notification-email
```

### Vérifier SendGrid Activity

1. Allez dans SendGrid Dashboard > **Email API** > **Activity**
2. Vérifiez que les emails sont envoyés
3. Vérifiez les statuts (delivered, bounced, etc.)

### Dépannage

#### Les emails ne sont pas envoyés

1. Vérifiez que `SENDGRID_API_KEY` est correct
2. Vérifiez que `SENDGRID_TEMPLATE_ID` est correct (si vous utilisez un template)
3. Vérifiez les logs de l'Edge Function
4. Vérifiez SendGrid Activity pour voir les erreurs

#### L'email arrive mais le template ne fonctionne pas

1. Vérifiez que toutes les variables dynamiques sont correctement nommées
2. Vérifiez que le template est activé dans SendGrid
3. Testez le template dans SendGrid avec des données de test

#### L'URL de redirection ne fonctionne pas

1. Vérifiez que `CLIENT_DASHBOARD_URL`, `NOTARY_DASHBOARD_URL`, etc. sont corrects
2. Vérifiez que les URLs sont accessibles
3. Vérifiez que l'`action_url` est correctement construite dans l'Edge Function

---

## 6. Types de notifications supportés

L'Edge Function gère automatiquement les redirections pour ces types de notifications :

- `notarized_file_uploaded` → Redirige vers `/submission/:id?tab=notarized`
- `status_changed` → Redirige vers `/submission/:id`
- `submission_modified` → Redirige vers `/submission/:id`
- `appointment_updated` → Redirige vers `/submission/:id`
- `payout_created` → Redirige vers `/payouts` (notary) ou `/submission/:id` (client/admin)
- `message_received` → Redirige vers `/messages`
- `notary_assigned` → Redirige vers `/submission/:id`

---

## 7. Personnalisation

### Modifier le template SendGrid

1. Allez dans SendGrid Dashboard > **Dynamic Templates**
2. Modifiez votre template
3. Enregistrez et activez la nouvelle version
4. Le nouveau template sera utilisé automatiquement

### Modifier le template HTML de fallback

Modifiez la fonction `generatePlainEmailHTML` dans `supabase/functions/send-notification-email/index.ts`.

---

## 8. Production

### Checklist de déploiement

- [ ] Template SendGrid créé et activé
- [ ] Template ID copié et ajouté aux secrets
- [ ] Clé API SendGrid ajoutée aux secrets
- [ ] URLs des dashboards configurées correctement
- [ ] Edge Function déployée
- [ ] Secrets configurés pour l'Edge Function
- [ ] Test d'envoi d'email réussi
- [ ] Vérification que les emails arrivent bien
- [ ] Vérification que les liens de redirection fonctionnent

### Monitoring

- Surveillez les logs de l'Edge Function
- Surveillez SendGrid Activity pour les erreurs
- Surveillez les taux de livraison dans SendGrid

---

## Support

Pour plus d'aide :
- Documentation SendGrid : https://docs.sendgrid.com/
- Documentation Supabase Edge Functions : https://supabase.com/docs/guides/functions
- Vérifiez les logs dans Supabase Dashboard > **Edge Functions** > **Logs**


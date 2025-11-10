# Guide de création du template SendGrid pour les notifications

Ce guide détaille la création d'un template SendGrid Dynamic Template pour les emails de notification.

## 📋 Étape 1 : Créer un Dynamic Template

1. **Connectez-vous à SendGrid** : https://app.sendgrid.com
2. **Allez dans** : Email API > Dynamic Templates
3. **Cliquez sur** : "Create a Dynamic Template"
4. **Nommez le template** : "MY NOTARY - Notification Email"
5. **Cliquez sur** : "Add Version"
6. **Choisissez** : "Code Editor" (pour avoir le contrôle total)

## 📋 Étape 2 : Créer le design du template

### Template HTML complet

Copiez ce code dans l'éditeur de code SendGrid :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{{notification_title}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 2px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #111827; letter-spacing: -0.5px;">
                MY NOTARY
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              
              <!-- Notification Icon -->
              <div style="text-align: center; margin-bottom: 24px;">
                {{#if (eq notification_type "success")}}
                  <div style="font-size: 64px; line-height: 1;">✅</div>
                {{else if (eq notification_type "warning")}}
                  <div style="font-size: 64px; line-height: 1;">⚠️</div>
                {{else if (eq notification_type "error")}}
                  <div style="font-size: 64px; line-height: 1;">❌</div>
                {{else}}
                  <div style="font-size: 64px; line-height: 1;">📢</div>
                {{/if}}
              </div>
              
              <!-- Title -->
              <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.3;">
                {{notification_title}}
              </h2>
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Bonjour {{user_name}},
              </p>
              
              <!-- Message -->
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                {{notification_message}}
              </p>
              
              <!-- Additional Info (if file_name exists) -->
              {{#if file_name}}
              <div style="background-color: #f9fafb; border-left: 4px solid #000; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 600;">
                  Fichier : {{file_name}}
                </p>
              </div>
              {{/if}}
              
              <!-- Action Button -->
              {{#if action_url}}
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{action_url}}" style="display: inline-block; padding: 14px 28px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">
                      Voir les détails
                    </a>
                  </td>
                </tr>
              </table>
              {{/if}}
              
              <!-- Alternative Link -->
              <p style="margin: 20px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
                ou <a href="{{dashboard_url}}" style="color: #000000; text-decoration: underline; font-weight: 500;">visitez votre tableau de bord</a>
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.5;">
                Ceci est une notification automatique de <strong>MY NOTARY</strong>.<br>
                Veuillez ne pas répondre à cet email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                <a href="{{dashboard_url}}" style="color: #6b7280; text-decoration: none;">Tableau de bord</a>
                <span style="margin: 0 8px;">•</span>
                <a href="{{dashboard_url}}/profile" style="color: #6b7280; text-decoration: none;">Paramètres</a>
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

## 📋 Étape 3 : Variables dynamiques

Le template utilise ces variables (automatiquement fournies par l'Edge Function) :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{notification_title}}` | Titre de la notification | "New Notarized Document" |
| `{{notification_message}}` | Message de la notification | "A new notarized document has been uploaded..." |
| `{{notification_type}}` | Type (info, success, warning, error) | "success" |
| `{{user_name}}` | Nom de l'utilisateur | "John Doe" |
| `{{action_url}}` | URL pour voir les détails | "https://client.mynotary.io/submission/123?tab=notarized" |
| `{{dashboard_url}}` | URL du tableau de bord | "https://client.mynotary.io" |
| `{{submission_id}}` | ID de la soumission (si disponible) | "abc123..." |
| `{{file_name}}` | Nom du fichier (si disponible) | "document.pdf" |

## 📋 Étape 4 : Personnalisation avec Handlebars

SendGrid utilise Handlebars pour les templates. Exemples :

### Conditionnelles

```handlebars
{{#if action_url}}
  <a href="{{action_url}}">Voir les détails</a>
{{/if}}

{{#if file_name}}
  <p>Fichier : {{file_name}}</p>
{{/if}}
```

### Comparaisons

```handlebars
{{#if (eq notification_type "success")}}
  ✅ Succès
{{else if (eq notification_type "error")}}
  ❌ Erreur
{{else}}
  📢 Information
{{/if}}
```

## 📋 Étape 5 : Version texte brut (Plain Text)

Créez aussi une version texte brut pour les clients email qui ne supportent pas HTML :

```
MY NOTARY
=========

{{notification_title}}

Bonjour {{user_name}},

{{notification_message}}

{{#if action_url}}
Voir les détails : {{action_url}}
{{/if}}

Visitez votre tableau de bord : {{dashboard_url}}

---
Ceci est une notification automatique de MY NOTARY.
Veuillez ne pas répondre à cet email.
```

## 📋 Étape 6 : Tester le template

1. Dans SendGrid, cliquez sur **"Test"** dans l'éditeur de template
2. Entrez des données de test :

```json
{
  "notification_title": "New Notarized Document",
  "notification_message": "A new notarized document has been uploaded for your submission.",
  "notification_type": "success",
  "user_name": "John Doe",
  "action_url": "https://client.mynotary.io/submission/123?tab=notarized",
  "dashboard_url": "https://client.mynotary.io",
  "file_name": "document.pdf"
}
```

3. Cliquez sur **"Send Test Email"**
4. Vérifiez que l'email s'affiche correctement

## 📋 Étape 7 : Activer et obtenir le Template ID

1. Cliquez sur **"Save"** pour enregistrer le template
2. Cliquez sur **"Activate"** pour activer cette version
3. **Copiez le Template ID** (format: `d-xxxxx`)
4. Ajoutez-le aux secrets Supabase (voir `SENDGRID_NOTIFICATION_EMAIL_SETUP.md`)

## 📋 Étape 8 : Personnalisation avancée

### Ajouter votre logo

```html
<img src="https://votre-domaine.com/logo.png" alt="MY NOTARY" style="max-width: 200px; height: auto;">
```

### Changer les couleurs

Modifiez les couleurs dans le template :
- Couleur principale : `#000000` (noir)
- Couleur de texte : `#111827` (gris foncé)
- Couleur de fond : `#f3f4f6` (gris clair)

### Ajouter des images

Vous pouvez ajouter des images dans SendGrid :
1. Allez dans **Email API** > **Settings** > **Tracking**
2. Uploadez vos images
3. Utilisez les URLs fournies dans votre template

## 📋 Dépannage

### Le template ne s'affiche pas correctement

1. Vérifiez que toutes les variables sont correctement nommées
2. Vérifiez que le template est activé
3. Testez avec des données de test

### Les variables ne sont pas remplacées

1. Vérifiez que les noms de variables correspondent exactement
2. Vérifiez que l'Edge Function envoie les bonnes données
3. Vérifiez les logs de l'Edge Function

### L'email arrive mais le style est cassé

1. Vérifiez que vous utilisez des styles inline (SendGrid recommande cela)
2. Testez sur différents clients email (Gmail, Outlook, etc.)
3. Utilisez des tableaux pour la mise en page (meilleure compatibilité)

## 📋 Ressources

- Documentation SendGrid Dynamic Templates : https://docs.sendgrid.com/ui/sending-email/how-to-send-an-email-with-dynamic-templates
- Handlebars Helpers : https://docs.sendgrid.com/for-developers/sending-email/using-handlebars
- Email Template Best Practices : https://docs.sendgrid.com/for-developers/sending-email/getting-started-email-design


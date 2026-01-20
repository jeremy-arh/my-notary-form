# Intégration API Google Ads pour récupérer les coûts

## Vue d'ensemble

Oui, il est possible de récupérer automatiquement les coûts Google Ads via l'API Google Ads. Cette intégration permet de synchroniser automatiquement les dépenses quotidiennes de vos campagnes publicitaires.

## Prérequis

1. **Compte Google Ads** avec un compte client (Customer ID)
2. **Clé API Google Ads** (Developer Token)
3. **Authentification OAuth 2.0** configurée
4. **Client ID et Client Secret** pour OAuth 2.0

## Configuration

### 1. Obtenir les credentials Google Ads

1. Créer un compte développeur Google Ads : https://ads.google.com/aw/apicenter
2. Obtenir un Developer Token
3. Créer un projet dans Google Cloud Console
4. Activer l'API Google Ads
5. Configurer OAuth 2.0 et obtenir Client ID / Client Secret

### 2. Variables d'environnement

Ajoutez ces variables dans votre fichier `.env` :

```env
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
GOOGLE_ADS_CUSTOMER_ID=your_customer_id
```

## Implémentation

### Option 1 : Supabase Edge Function (Recommandé)

Créez une Edge Function Supabase qui récupère les coûts quotidiennement via un cron job.

### Option 2 : API Route Backend

Créez un endpoint API qui peut être appelé périodiquement pour synchroniser les données.

### Option 3 : Google Ads Script + Webhook

Utilisez Google Ads Script pour envoyer les données vers votre API via webhook.

## Structure de données

L'API Google Ads retourne des données au format suivant :

```json
{
  "date": "2025-12-01",
  "cost": 30.90,
  "currency": "EUR",
  "campaign_id": "123456789",
  "campaign_name": "Campagne principale"
}
```

## Synchronisation automatique

Il est recommandé de configurer un cron job qui :
1. Récupère les coûts du jour précédent chaque matin
2. Vérifie si les données existent déjà dans la base
3. Insère ou met à jour les enregistrements dans `google_ads_costs`

## Documentation officielle

- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs/start)
- [Google Ads API - Reporting](https://developers.google.com/google-ads/api/docs/reporting/overview)
- [OAuth 2.0 Setup](https://developers.google.com/google-ads/api/docs/oauth/overview)

## Notes importantes

- L'API Google Ads a des limites de quota (requêtes par jour)
- Les données peuvent avoir un délai de 24-48h pour être finalisées
- Il faut gérer les erreurs et les retry en cas d'échec
- Les coûts sont en micros (diviser par 1,000,000 pour obtenir l'euro)




# Mise à jour Analytics - IP et Langue

## Modifications apportées

### 1. Récupération des données géographiques via IP

La fonction `getGeoInfo()` dans `client-dashboard/src/utils/analytics.js` a été améliorée pour :
- Utiliser l'API **ipapi.co** (gratuite, 1000 requêtes/jour) pour récupérer les données géographiques basées sur l'IP
- Fallback sur **ip-api.com** (gratuite, 45 requêtes/minute) si ipapi.co échoue
- Récupérer : pays, ville, région, et adresse IP

### 2. Tracking de la langue du navigateur

- Ajout de la fonction `getBrowserLanguage()` qui récupère la langue du navigateur
- La langue est stockée dans la colonne `language` de la table `analytics_events`

### 3. Migration SQL

Un nouveau fichier de migration `supabase-analytics-add-ip-language.sql` a été créé pour :
- Ajouter la colonne `ip_address` (VARCHAR(45)) pour stocker l'adresse IP
- Ajouter la colonne `language` (VARCHAR(10)) pour stocker le code langue (ex: 'en', 'fr')
- Créer des index sur ces colonnes pour optimiser les requêtes

### 4. Nouvelle vue "Langues" dans le dashboard

- Ajout d'un nouvel onglet "Langues" dans le dashboard Analytics
- Affichage des langues avec :
  - Nom complet de la langue (ex: "Français", "English")
  - Code langue (ex: "fr", "en")
  - Nombre de visiteurs uniques par langue
  - Pourcentage de visiteurs par langue
  - Barre de progression visuelle

## Instructions d'installation

### 1. Exécuter la migration SQL

Dans Supabase SQL Editor, exécutez le fichier `supabase-analytics-add-ip-language.sql` :

```sql
-- Ajouter les colonnes IP et langue
ALTER TABLE public.analytics_events 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

ALTER TABLE public.analytics_events 
ADD COLUMN IF NOT EXISTS language VARCHAR(10);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_analytics_events_language ON public.analytics_events(language);
CREATE INDEX IF NOT EXISTS idx_analytics_events_ip_address ON public.analytics_events(ip_address);
```

### 2. Vérifier que les données sont trackées

1. Ouvrez le formulaire (`/form`)
2. Ouvrez la console du navigateur (F12)
3. Naviguez dans le formulaire
4. Vérifiez les logs : `✅ Analytics event tracked: [event_type] [id]`

### 3. Vérifier les données dans Supabase

Dans Supabase Dashboard > Table Editor > analytics_events :
- Vérifiez que les colonnes `ip_address` et `language` sont remplies
- Vérifiez que `country_code`, `country_name`, `city`, `region` sont remplies

### 4. Vérifier le dashboard Analytics

1. Allez dans le dashboard admin > Analytics
2. Cliquez sur l'onglet "Langues"
3. Vérifiez que les langues s'affichent avec les données

## Langues supportées

Le dashboard affiche automatiquement le nom complet pour les langues suivantes :
- English (en)
- Français (fr)
- Español (es)
- Deutsch (de)
- Italiano (it)
- Português (pt)
- Et plus de 20 autres langues...

Pour les langues non listées, le code langue est affiché en majuscules.

## Notes importantes

- Les services de géolocalisation IP sont gratuits mais ont des limites :
  - **ipapi.co** : 1000 requêtes/jour
  - **ip-api.com** : 45 requêtes/minute
- Si les deux services échouent, les données géographiques seront `null` mais le tracking continuera de fonctionner
- La langue est récupérée depuis `navigator.language` du navigateur
- Les données sont comptées par visiteur unique (pas de doublons)

## Dépannage

### Aucune donnée géographique ne remonte

1. Vérifiez la console du navigateur pour les erreurs
2. Vérifiez que les services de géolocalisation sont accessibles
3. Vérifiez que la migration SQL a été exécutée

### La langue n'est pas correcte

1. Vérifiez la langue de votre navigateur dans les paramètres
2. La langue est basée sur `navigator.language` du navigateur
3. Seul le code langue principal est stocké (ex: 'fr' et non 'fr-CA')

### Les données ne s'affichent pas dans le dashboard

1. Vérifiez que la migration SQL a été exécutée
2. Vérifiez que des événements ont été trackés avec les nouvelles colonnes
3. Vérifiez les logs dans la console du dashboard admin


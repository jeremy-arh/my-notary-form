# Configuration des Coûts Récurrents avec Cron

## Vue d'ensemble

Les coûts webservice peuvent maintenant être configurés comme récurrents. Un cron job génère automatiquement une ligne chaque mois à la date sélectionnée.

## Étapes de configuration

### 1. Exécuter la migration SQL

Exécutez le fichier `supabase-webservice-recurring-migration.sql` dans le Supabase SQL Editor pour :
- Ajouter les colonnes `is_recurring`, `is_active`, `recurring_template_id`, `parent_cost_id`
- Créer la fonction `generate_recurring_webservice_costs()`

### 2. Déployer l'Edge Function

```bash
cd supabase
supabase functions deploy generate-recurring-costs
```

### 3. Configurer le Cron Job

#### Option A : Via Supabase Dashboard (recommandé)

1. Allez dans **Database > Cron Jobs** (ou utilisez pg_cron)
2. Créez un nouveau cron job avec :
   - **Schedule**: `0 2 * * *` (tous les jours à 2h du matin)
   - **Function**: `generate-recurring-costs`
   - **Payload**: `{}`

#### Option B : Via SQL (pg_cron)

```sql
-- Activer l'extension pg_cron si nécessaire
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Créer le cron job
SELECT cron.schedule(
  'generate-recurring-webservice-costs',
  '0 2 * * *',  -- Tous les jours à 2h du matin
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/generate-recurring-costs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Note**: Remplacez `YOUR_PROJECT` et `YOUR_ANON_KEY` par vos valeurs réelles.

## Fonctionnement

1. **Création d'un template récurrent** :
   - Lors de la création d'un coût webservice mensuel, cochez "Activer la récurrence automatique"
   - Le champ `is_recurring` sera défini à `true`
   - Le champ `is_active` contrôle si le cron génère de nouvelles lignes

2. **Génération automatique** :
   - Le cron s'exécute tous les jours à 2h du matin
   - Il vérifie tous les templates récurrents actifs (`is_recurring = true`, `is_active = true`)
   - Pour chaque template, il vérifie si une ligne existe déjà pour le mois en cours
   - Si aucune ligne n'existe et que la date cible est passée, il crée une nouvelle ligne

3. **Désactivation** :
   - Cliquez sur le bouton "Actif/Inactif" dans le tableau pour désactiver un template
   - Quand `is_active = false`, le cron ne génère plus de nouvelles lignes pour ce template
   - Les lignes déjà générées restent dans la base de données

## Structure des données

- **Template** : Ligne avec `is_recurring = true`, `recurring_template_id = NULL`
- **Occurrence** : Ligne générée avec `is_recurring = false`, `recurring_template_id = ID_DU_TEMPLATE`

## Interface utilisateur

- Dans la modale de création/édition, pour les coûts mensuels :
  - Checkbox "Activer la récurrence automatique" pour activer le cron
  - Checkbox "Actif" pour contrôler si le cron génère des lignes (visible uniquement si récurrence activée)

- Dans le tableau de liste :
  - Colonne "Récurrent" : Affiche si c'est un template récurrent
  - Colonne "Statut" : Bouton cliquable pour activer/désactiver (uniquement pour les templates récurrents)


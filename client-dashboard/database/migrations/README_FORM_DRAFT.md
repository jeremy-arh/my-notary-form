# Form Draft Auto-Save System

## 📋 Vue d'ensemble

Ce système sauvegarde automatiquement les données du formulaire dans Supabase à chaque étape, avec :
- **Données structurées** : Colonnes claires dans la table (pas de JSONB opaque)
- **Documents en dur** : Fichiers stockés dans Supabase Storage (pas en base64)
- **Sauvegarde automatique** : Auto-save toutes les 2 secondes après modification
- **Session tracking** : Identification par session_id ou email

## 🗄️ Structure de la table `form_draft`

### Colonnes principales

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `email` | TEXT | Email de l'utilisateur (si rempli) |
| `session_id` | TEXT | ID de session pour visiteurs anonymes |
| `user_id` | UUID | ID utilisateur (si authentifié) |
| `selected_services` | JSONB | IDs des services sélectionnés |
| `documents` | JSONB | Métadonnées des documents (paths, non base64) |
| `delivery_method` | TEXT | 'email' ou 'postal' |
| `first_name` | TEXT | Prénom |
| `last_name` | TEXT | Nom |
| `phone` | TEXT | Téléphone |
| `address` | TEXT | Adresse |
| `city` | TEXT | Ville |
| `postal_code` | TEXT | Code postal |
| `country` | TEXT | Pays |
| `signatories` | JSONB | Liste des signataires |
| `is_signatory` | BOOLEAN | Est signataire |
| `currency` | TEXT | Devise (EUR, USD, etc.) |
| `gclid` | TEXT | Google Click ID |
| `current_step` | INTEGER | Étape actuelle (1-6) |
| `completed_steps` | INTEGER[] | Étapes complétées |
| `created_at` | TIMESTAMPTZ | Date de création |
| `updated_at` | TIMESTAMPTZ | Dernière modification |
| `last_activity_at` | TIMESTAMPTZ | Dernière activité |

## 📁 Storage des documents

Les documents sont stockés dans le bucket `form-documents` :
```
form-documents/
  └── {session_id}/
      └── {service_id}/
          └── {timestamp}_{filename}
```

**Exemple** :
```
form-documents/
  └── session_1704123456789_abc123/
      └── 473fb677-4dd3-4766-8221-0250ea3440cd/
          └── 1704123789000_passport.pdf
```

## 🚀 Installation

### 1. Appliquer la migration

```bash
# Se connecter à Supabase
supabase login

# Appliquer la migration
psql -h [YOUR_DB_HOST] -U postgres -d postgres -f database/migrations/restructure_form_draft_table.sql
```

Ou via l'interface Supabase :
1. Aller dans **SQL Editor**
2. Copier le contenu de `restructure_form_draft_table.sql`
3. Exécuter

### 2. Vérifier le Storage

Dans Supabase Dashboard :
1. Aller dans **Storage**
2. Vérifier que le bucket `form-documents` existe
3. Vérifier les policies (INSERT, SELECT, UPDATE, DELETE)

## 🔧 Fonctionnement

### Sauvegarde automatique

Le système sauvegarde automatiquement :
- **Toutes les 2 secondes** après une modification
- **À chaque changement d'étape**
- **Débounce** pour éviter trop de requêtes

### Upload de documents

```javascript
// Avant (base64) :
{
  name: "file.pdf",
  dataUrl: "data:application/pdf;base64,JVBERi0xLjQK..."  // ❌ Lourd
}

// Maintenant (Storage) :
{
  name: "file.pdf",
  path: "session_123/service_456/1704123789_file.pdf",  // ✅ Léger
  url: "https://[PROJECT].supabase.co/storage/v1/object/public/...",
  size: 102400,
  uploadedAt: "2024-01-01T12:00:00Z"
}
```

### API Utilities

#### Sauvegarder le draft
```javascript
import { saveFormDraft } from './utils/formDraft';

await saveFormDraft(formData, currentStep, completedSteps);
```

#### Uploader un document
```javascript
import { uploadDocument } from './utils/formDraft';

const result = await uploadDocument(file, serviceId, sessionId);
// Returns: { path, url, name, size, uploadedAt }
```

#### Supprimer un document
```javascript
import { deleteDocument } from './utils/formDraft';

await deleteDocument(documentPath);
```

#### Charger un draft
```javascript
import { loadFormDraft } from './utils/formDraft';

const draft = await loadFormDraft();
```

## 📊 Visualiser les données

### Dans Supabase Dashboard

1. **Table Editor** → `form_draft`
   - Toutes les colonnes sont visibles
   - Facile à filtrer et trier
   - Export en CSV possible

2. **Storage** → `form-documents`
   - Voir tous les fichiers uploadés
   - Télécharger/supprimer manuellement si besoin

### Requêtes SQL utiles

```sql
-- Voir tous les drafts récents
SELECT 
  id, 
  email, 
  first_name, 
  last_name, 
  current_step,
  array_length(completed_steps, 1) as steps_completed,
  updated_at
FROM form_draft
ORDER BY updated_at DESC
LIMIT 20;

-- Voir les drafts abandonnés (> 24h sans activité)
SELECT 
  email,
  first_name,
  last_name,
  current_step,
  last_activity_at
FROM form_draft
WHERE last_activity_at < NOW() - INTERVAL '24 hours'
ORDER BY last_activity_at DESC;

-- Compter les documents par service
SELECT 
  jsonb_object_keys(documents) as service_id,
  COUNT(*) as draft_count
FROM form_draft
WHERE documents IS NOT NULL
GROUP BY service_id;
```

## 🔐 Sécurité

- **RLS activé** : Row Level Security
- **Policies** : Accès uniquement à ses propres données
- **Storage privé** : Fichiers non accessibles publiquement sans auth
- **Session ID** : Unique par navigateur/appareil

## 🧹 Nettoyage

Pour supprimer les vieux drafts automatiquement :

```sql
-- Créer une fonction de nettoyage
CREATE OR REPLACE FUNCTION cleanup_old_drafts()
RETURNS void AS $$
BEGIN
  DELETE FROM form_draft
  WHERE last_activity_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Scheduler (à configurer dans Supabase)
-- SELECT cron.schedule('cleanup-drafts', '0 2 * * *', 'SELECT cleanup_old_drafts()');
```

## ✅ Avantages

✅ **Données claires** : Colonnes SQL visibles  
✅ **Performance** : Pas de base64 lourd  
✅ **Storage séparé** : Documents dans Storage  
✅ **Auto-save** : Aucune perte de données  
✅ **Analytics** : Facile à analyser  
✅ **Recovery** : Reprendre où on s'est arrêté  

## 📝 Notes

- Le `session_id` est stocké dans `localStorage`
- Les documents sont automatiquement supprimés avec le draft
- Le système fonctionne même pour les visiteurs non connectés
- Compatible avec l'ancien système localStorage (fallback)










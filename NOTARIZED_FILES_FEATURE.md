# Fonctionnalités des Fichiers Notarisés

## 📋 Vue d'ensemble

Ce document décrit les nouvelles fonctionnalités ajoutées au dashboard notaire :
1. Onglet Payouts
2. Upload de fichiers notarisés
3. Système de commentaires sur les fichiers
4. Notifications pour les clients

## 🗄️ Base de données

### Migration SQL

Exécutez le fichier `supabase-notarized-files-migration.sql` dans votre Supabase SQL Editor pour créer les tables nécessaires :

- **notarized_files** : Stocke les fichiers uploadés par les notaires
- **file_comments** : Stocke les commentaires sur les fichiers (visibles par client, admin et notaire)

### Tables créées

#### notarized_files
- `id` : UUID (primary key)
- `submission_id` : UUID (référence à submission)
- `notary_id` : UUID (référence à notary)
- `file_name` : VARCHAR(255)
- `file_url` : TEXT
- `file_type` : VARCHAR(100)
- `file_size` : BIGINT
- `storage_path` : TEXT
- `uploaded_at` : TIMESTAMP

#### file_comments
- `id` : UUID (primary key)
- `file_id` : UUID (référence à notarized_files)
- `submission_id` : UUID (référence à submission)
- `commenter_type` : VARCHAR(50) ('notary', 'client', 'admin')
- `commenter_id` : UUID
- `comment` : TEXT
- `created_at` : TIMESTAMP

## 🚀 Fonctionnalités

### 1. Onglet Payouts

**Localisation** : Menu principal du dashboard notaire

**Fonctionnalités** :
- Affichage de tous les payouts du notaire
- Filtrage par statut (All, Paid, Pending, Canceled)
- Recherche par description, submission ID, ou montant
- Statistiques : Total Payouts, Paid, Pending
- Pagination pour les grandes listes

**Accès** : `/payouts` dans le dashboard notaire

### 2. Upload de Fichiers Notarisés

**Localisation** : Onglet "Notarized Files" dans SubmissionDetail

**Fonctionnalités** :
- Upload de multiples fichiers
- Stockage dans Supabase Storage (bucket: `submission-documents`)
- Métadonnées stockées dans la table `notarized_files`
- Notification automatique au client lors de l'upload
- Affichage de la taille et de la date d'upload
- Téléchargement des fichiers

**Utilisation** :
1. Ouvrir une soumission
2. Cliquer sur l'onglet "Notarized Files"
3. Sélectionner les fichiers à uploader
4. Les fichiers sont automatiquement uploadés et le client est notifié

### 3. Commentaires sur les Fichiers

**Fonctionnalités** :
- Ajout de commentaires sur chaque fichier
- Visibilité : Client, Admin, Notaire
- Affichage du type de commentateur (notary, client, admin)
- Affichage de la date de création
- Mise à jour en temps réel

**Utilisation** :
1. Ouvrir l'onglet "Notarized Files"
2. Faire défiler jusqu'au fichier souhaité
3. Saisir un commentaire dans le champ de texte
4. Cliquer sur "Add" ou appuyer sur Entrée

### 4. Notifications

**Fonctionnalités** :
- Notification automatique au client lors de l'upload d'un fichier notarisé
- Type de notification : `notarized_file_uploaded`
- Message personnalisé avec le nom du fichier
- Action data contenant : `submission_id`, `file_id`, `file_name`

## 🔐 Sécurité (RLS Policies)

### notarized_files

- **Notaries** : Peuvent voir et uploader des fichiers pour leurs soumissions assignées
- **Clients** : Peuvent voir les fichiers pour leurs soumissions
- **Admins** : Peuvent voir tous les fichiers

### file_comments

- **Notaries** : Peuvent voir et ajouter des commentaires pour leurs soumissions assignées
- **Clients** : Peuvent voir et ajouter des commentaires pour leurs soumissions
- **Admins** : Peuvent voir et ajouter des commentaires pour toutes les soumissions

## 📝 Notes importantes

1. **Storage Bucket** : Les fichiers sont stockés dans le bucket `submission-documents` de Supabase Storage
2. **Notifications** : Les notifications utilisent la fonction `create_notification` existante
3. **Permissions** : Seuls les notaires assignés à une soumission peuvent uploader des fichiers
4. **Commentaires** : Tous les commentaires sont visibles par le client, l'admin et le notaire

## 🔄 Prochaines étapes

Pour utiliser ces fonctionnalités :

1. **Exécuter la migration SQL** :
   ```sql
   -- Exécuter supabase-notarized-files-migration.sql dans Supabase SQL Editor
   ```

2. **Vérifier le bucket Storage** :
   - S'assurer que le bucket `submission-documents` existe
   - Vérifier les permissions d'upload pour les notaires

3. **Tester les fonctionnalités** :
   - Upload de fichiers
   - Ajout de commentaires
   - Vérification des notifications

## 🐛 Dépannage

### Les fichiers ne s'uploadent pas
- Vérifier que le bucket `submission-documents` existe
- Vérifier les permissions RLS sur `notarized_files`
- Vérifier que le notaire est assigné à la soumission

### Les notifications ne sont pas créées
- Vérifier que la fonction `create_notification` existe
- Vérifier que `client_id` est présent dans la soumission
- Vérifier les logs de la console pour les erreurs

### Les commentaires ne s'affichent pas
- Vérifier les permissions RLS sur `file_comments`
- Vérifier que les commentaires sont bien insérés dans la base de données
- Vérifier les logs de la console pour les erreurs


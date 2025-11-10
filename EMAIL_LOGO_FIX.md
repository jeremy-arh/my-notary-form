# Solution pour l'affichage du logo dans les emails

## Problème

Les logos SVG ne s'affichent pas toujours dans les clients email (notamment Outlook, Gmail, etc.) car tous les clients ne supportent pas le format SVG.

## Solutions

### Option 1 : Convertir le logo SVG en PNG (RECOMMANDÉ)

1. **Télécharger le logo SVG** depuis : https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/logo-blanc.svg

2. **Convertir en PNG** :
   - Utiliser un outil en ligne (ex: https://cloudconvert.com/svg-to-png)
   - Ou utiliser un logiciel comme Inkscape, Adobe Illustrator, etc.
   - Dimensions recommandées : 400x72px (2x pour les écrans haute résolution)
   - Fond transparent

3. **Uploader le PNG sur Supabase Storage** :
   - Allez dans Supabase Dashboard > **Storage** > **assets** > **logo**
   - Uploader `logo-blanc.png`
   - Rendre le fichier public

4. **Mettre à jour l'URL dans l'Edge Function** :
   - Remplacer `logo-blanc.svg` par `logo-blanc.png` dans `supabase/functions/send-transactional-email/index.ts`

### Option 2 : Utiliser le texte comme fallback

Le template actuel utilise déjà le logo SVG avec les attributs appropriés. Si le logo ne s'affiche pas, l'attribut `alt="MY NOTARY"` devrait afficher le texte.

### Option 3 : Héberger le logo sur un CDN

1. Uploader le logo (PNG) sur un CDN fiable (Cloudflare, AWS S3, etc.)
2. Utiliser l'URL du CDN dans les emails
3. S'assurer que le CORS est configuré correctement

## Vérification

Pour vérifier si le logo s'affiche :

1. **Tester l'URL du logo** :
   - Ouvrir l'URL dans un navigateur
   - Vérifier que l'image s'affiche correctement

2. **Tester l'email** :
   - Envoyer un email de test
   - Vérifier dans différents clients email (Gmail, Outlook, Apple Mail, etc.)

3. **Vérifier les logs SendGrid** :
   - Aller dans SendGrid Dashboard > **Activity**
   - Vérifier que l'email a été envoyé
   - Vérifier les erreurs éventuelles

## Configuration actuelle

Le template utilise actuellement :
- URL du logo : `https://jlizwheftlnhoifbqeex.supabase.co/storage/v1/object/public/assets/logo/logo-blanc.svg`
- Attributs : `width="200" height="auto"` avec styles inline
- Alt text : `MY NOTARY` (affiché si l'image ne charge pas)

## Recommandation

**Convertir le logo en PNG** est la meilleure solution car :
- ✅ Supporté par tous les clients email
- ✅ Affichage fiable
- ✅ Meilleure compatibilité
- ✅ Pas de problèmes de rendu

Après conversion, mettre à jour l'URL dans l'Edge Function pour utiliser `logo-blanc.png` au lieu de `logo-blanc.svg`.


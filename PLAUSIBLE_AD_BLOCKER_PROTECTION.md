# 🛡️ Protection contre le Blocage de Plausible par les Ad Blockers

## 📋 Problème

**Oui, Plausible peut être bloqué par les bloqueurs de publicité** (ad blockers) comme uBlock Origin, AdBlock Plus, etc.

### Taux de Blocage Estimé
- **5-15%** des utilisateurs selon l'audience
- Plus élevé chez les utilisateurs techniques (développeurs, marketeurs)
- Variable selon les listes de blocage utilisées

## 🔍 Comment ça fonctionne ?

Les bloqueurs de publicité utilisent des listes de domaines connus pour bloquer :
- Scripts de tracking (`plausible.io/js/script.js`)
- Requêtes API (`plausible.io/api/event`)
- Cookies de tracking

## ✅ Solutions Implémentées

### 1. Détection Automatique + Fallback Supabase

**Fichier modifié** : `client-dashboard/src/utils/plausible.js`

**Fonctionnalités** :
- ✅ Détection automatique si Plausible est bloqué
- ✅ Fallback automatique vers Supabase Analytics
- ✅ Double tracking : Plausible + Supabase (même si Plausible fonctionne)
- ✅ Mapping automatique des événements Plausible vers Supabase

**Comment ça marche** :
1. Vérifie si le script Plausible est chargé
2. Vérifie si la fonction `window.plausible` existe
3. Si bloqué → Envoie automatiquement à Supabase
4. Si disponible → Envoie aux deux (Plausible + Supabase)

### 2. Système de Tracking Dual

Même si Plausible fonctionne, tous les événements sont **également** envoyés à Supabase pour :
- ✅ Redondance des données
- ✅ Analyse dans le dashboard admin
- ✅ Protection contre les pertes de données

## 📊 Événements Mappés

| Plausible Event | Supabase Event Type |
|----------------|---------------------|
| `form_started` | `form_start` |
| `services_selected` | `service_selected` |
| `documents_uploaded` | `document_uploaded` |
| `signatories_added` | `signatory_added` |
| `appointment_booked` | `appointment_booked` |
| `personal_info_completed` | `personal_info_completed` |
| `summary_viewed` | `summary_viewed` |
| `payment_initiated` | `payment_initiated` |
| `payment_completed` | `payment_completed` |
| `form_abandoned` | `form_abandoned` |
| `step_navigation` | `step_navigation` |

## 🚀 Solutions Avancées (Optionnelles)

### Option 1 : Proxy Plausible (Recommandé pour Production)

**Avantage** : Réduit le blocage à < 1%

**Comment faire** :
1. Héberger le script Plausible sur votre propre domaine
2. Exemple : `analytics.mynotary.io` au lieu de `plausible.io`
3. Configuration dans Plausible Dashboard → Settings → Proxy

**Documentation** : https://plausible.io/docs/proxy/introduction

### Option 2 : Self-Hosted Plausible

**Avantage** : Contrôle total, 0% de blocage

**Inconvénient** : Maintenance serveur requise

**Documentation** : https://plausible.io/docs/self-hosting

## 🔧 Configuration Actuelle

### Client Dashboard (`client-dashboard/`)

✅ **Implémenté** :
- Détection automatique du blocage
- Fallback Supabase automatique
- Double tracking (Plausible + Supabase)

### Site Principal (`new-site/notary-site/`)

⚠️ **À faire** :
- Le script Plausible est chargé dans `index.html`
- Pas de fallback automatique actuellement
- Les événements sont trackés via Supabase uniquement

**Recommandation** : Ajouter le même système de fallback si vous utilisez des événements Plausible personnalisés sur le site principal.

## 📈 Monitoring

### Comment Vérifier si Plausible est Bloqué ?

1. **Console du navigateur** :
   ```
   ⚠️ [Plausible] Script not loaded - may be blocked by ad blocker
   📊 [Plausible] Using Supabase fallback for event: form_started
   ```

2. **Network Tab** :
   - Cherchez les requêtes vers `plausible.io`
   - Si bloquées → Vous verrez `(blocked:other)` ou `ERR_BLOCKED_BY_CLIENT`

3. **Dashboard Supabase** :
   - Vérifiez la table `analytics_events`
   - Les événements doivent être présents même si Plausible est bloqué

## 🎯 Recommandations

### Pour le Développement
✅ **Actuel** : Système de fallback automatique suffisant

### Pour la Production
1. **Court terme** : Le système actuel fonctionne bien (5-15% de perte acceptable)
2. **Moyen terme** : Configurer le proxy Plausible (`analytics.mynotary.io`)
3. **Long terme** : Considérer self-hosting si le volume augmente

## 📝 Notes Techniques

- Le système de détection utilise un cache pour éviter les vérifications répétées
- Les événements sont envoyés de manière asynchrone (non-bloquant)
- Le fallback Supabase est toujours disponible, même si Plausible fonctionne
- Les métadonnées incluent `plausible_event` pour tracer l'origine

## 🔗 Ressources

- [Plausible Proxy Documentation](https://plausible.io/docs/proxy/introduction)
- [Plausible Self-Hosting](https://plausible.io/docs/self-hosting)
- [Ad Blocker Detection](https://plausible.io/docs/proxy/introduction#how-it-works)





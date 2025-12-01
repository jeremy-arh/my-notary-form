# Checklist d'intégration Analytics

## ✅ Événements trackés

### 1. Ouverture du formulaire
- ✅ `form_opened` - Tracké au premier chargement du formulaire (sessionStorage)

### 2. Démarrage du formulaire
- ✅ `form_start` - Tracké quand l'utilisateur arrive sur l'étape 1 pour la première fois
- ✅ `screen_opened` - Tracké pour chaque écran ouvert

### 3. Sélection de services
- ✅ `service_selected` - Tracké à chaque sélection de service individuelle
- ✅ `services_selection_completed` - Tracké quand l'utilisateur clique sur Continue après avoir sélectionné des services

### 4. Upload de documents
- ✅ `document_screen_opened` - Tracké quand l'écran documents s'ouvre
- ✅ `document_uploaded` - Tracké à chaque upload de document
- ✅ `documents_upload_completed` - Tracké quand l'utilisateur clique sur Continue après avoir uploadé les documents

### 5. Signataires
- ✅ `signatory_screen_opened` - Tracké quand l'écran signataires s'ouvre
- ✅ `signatories_added` - Tracké à chaque ajout de signataire
- ✅ `signatories_completed` - Tracké quand l'utilisateur clique sur Continue après avoir complété les signataires

### 6. Rendez-vous
- ✅ `appointment_screen_opened` - Tracké quand l'écran rendez-vous s'ouvre
- ✅ `appointment_booked` - Tracké quand date ET heure sont sélectionnés

### 7. Infos personnelles
- ✅ `personal_info_screen_opened` - Tracké quand l'écran infos personnelles s'ouvre
- ✅ `personal_info_completed` - Tracké quand l'utilisateur clique sur Continue après avoir complété ses infos

### 8. Résumé
- ✅ `summary_screen_opened` - Tracké quand l'écran résumé s'ouvre
- ✅ `summary_viewed` - Tracké quand l'utilisateur arrive sur le résumé

### 9. Paiement
- ✅ `payment_initiated` - Tracké quand l'utilisateur clique sur "Confirm & Pay"
- ✅ `purchase` - Tracké quand le paiement est complété avec succès

## 🔍 Vérifications à faire

### 1. Migration SQL
- [ ] Exécuter `supabase-analytics-migration.sql` dans Supabase SQL Editor
- [ ] Vérifier que la table `analytics_events` existe
- [ ] Vérifier que les politiques RLS sont correctes

### 2. Test du tracking
1. Ouvrir le formulaire (`/form`)
2. Ouvrir la console du navigateur
3. Vérifier les logs :
   ```
   ✅ Analytics event tracked: form_opened [id]
   ✅ Analytics event tracked: form_start [id]
   ✅ Analytics event tracked: screen_opened [id]
   ```
4. Naviguer dans le formulaire et vérifier que chaque action génère un événement

### 3. Vérification dans Supabase
Dans Supabase Dashboard > Table Editor > analytics_events :
- [ ] Vérifier que des événements apparaissent après navigation
- [ ] Vérifier que les événements ont les bons `event_type`
- [ ] Vérifier que `visitor_id` et `session_id` sont remplis
- [ ] Vérifier que `device_type`, `browser_name`, `os_name` sont remplis

### 4. Vérification dans le Dashboard Admin
Dans le dashboard admin > Analytics :
- [ ] Vérifier que les métriques s'affichent
- [ ] Vérifier que le graphique des visiteurs fonctionne
- [ ] Vérifier que le funnel de conversion s'affiche avec des données
- [ ] Vérifier que les vues Pays, Appareils et Pages fonctionnent

## 🐛 Problèmes courants et solutions

### Aucune donnée ne remonte
1. **Vérifier la migration** : Exécutez `supabase-analytics-migration.sql`
2. **Vérifier les logs** : Ouvrez la console du navigateur et cherchez les erreurs
3. **Tester l'insertion** : Utilisez le script de test dans `ANALYTICS_DEBUG.md`

### Les données sont incomplètes
1. **Vérifier les événements trackés** : Regardez dans Supabase quels événements sont présents
2. **Vérifier les logs** : Cherchez les erreurs `❌ Analytics tracking error` dans la console
3. **Vérifier la plage de dates** : Le dashboard filtre par défaut sur les dernières 14 heures

### Le funnel ne s'affiche pas correctement
1. **Vérifier les types d'événements** : Les types doivent correspondre exactement à ceux définis dans le funnel
2. **Vérifier les logs** : Regardez les logs `📊 [ANALYTICS]` dans la console du dashboard admin

## 📝 Notes importantes

- Les événements sont trackés de manière asynchrone et n'affectent pas les performances
- Les erreurs de tracking sont loggées mais n'interrompent pas le flux utilisateur
- Le `visitor_id` est stocké dans localStorage et persiste entre les sessions
- Le `session_id` est stocké dans sessionStorage et change à chaque nouvelle session
- Les données géographiques nécessitent un service de géolocalisation pour être complètes (actuellement simplifié)


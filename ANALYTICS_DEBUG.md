# Guide de débogage Analytics

## Vérifications à faire

### 1. Vérifier que la migration a été exécutée

Exécutez cette requête dans Supabase SQL Editor :

```sql
-- Vérifier que la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'analytics_events'
);

-- Vérifier les politiques RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'analytics_events';

-- Vérifier les données (devrait retourner des événements si le tracking fonctionne)
SELECT 
  event_type,
  COUNT(*) as count,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM analytics_events
GROUP BY event_type
ORDER BY count DESC;
```

### 2. Vérifier les logs dans la console du navigateur

Quand vous naviguez sur le formulaire, vous devriez voir dans la console :

```
✅ Analytics event tracked: form_opened [id]
✅ Analytics event tracked: form_start [id]
✅ Analytics event tracked: screen_opened [id]
✅ Analytics event tracked: service_selected [id]
...
```

Si vous voyez des erreurs `❌ Analytics tracking error:`, cela signifie que :
- La table n'existe pas (migration non exécutée)
- Les politiques RLS bloquent l'insertion
- Il y a un problème de connexion Supabase

### 3. Tester manuellement l'insertion

Dans la console du navigateur sur le formulaire, exécutez :

```javascript
// Tester l'insertion d'un événement
const { supabase } = await import('./lib/supabase');
const { data, error } = await supabase
  .from('analytics_events')
  .insert([{
    event_type: 'test_event',
    page_path: '/form/test',
    visitor_id: 'test_visitor',
    session_id: 'test_session'
  }])
  .select();

console.log('Test insert:', { data, error });
```

Si cela fonctionne, vous devriez voir l'événement dans le dashboard après quelques secondes.

### 4. Vérifier les événements trackés

Dans le dashboard admin Analytics, ouvrez la console du navigateur et vérifiez les logs :

```
📊 [ANALYTICS] Fetching events from: [date]
📊 [ANALYTICS] Events fetched: [nombre]
📊 [ANALYTICS] Event types: [liste des types]
```

### 5. Problèmes courants

#### Aucune donnée ne remonte

**Cause possible :** La migration n'a pas été exécutée
**Solution :** Exécutez `supabase-analytics-migration.sql` dans Supabase SQL Editor

#### Erreur "relation does not exist"

**Cause :** La table `analytics_events` n'existe pas
**Solution :** Exécutez la migration SQL

#### Erreur "new row violates row-level security policy"

**Cause :** Les politiques RLS bloquent l'insertion
**Solution :** Vérifiez que la politique "Allow public insert for analytics" existe et est active

#### Les événements sont trackés mais n'apparaissent pas dans le dashboard

**Cause possible :** 
- La plage de dates est trop restrictive
- Les événements sont trop récents
- Problème avec les requêtes de calcul

**Solution :** 
- Vérifiez la plage de dates sélectionnée dans le dashboard
- Vérifiez les logs dans la console du navigateur
- Vérifiez que les événements existent dans la base de données

### 6. Vérifier les événements dans Supabase

Dans Supabase Dashboard > Table Editor > analytics_events, vous devriez voir les événements trackés.

Si la table est vide, le problème vient du tracking côté frontend.
Si la table contient des données mais le dashboard ne les affiche pas, le problème vient des requêtes côté dashboard.


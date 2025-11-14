# Checklist : GTM Server-Side Configuration

## ✅ Vérifications à faire dans GTM Web (GTM-MR7JDNSD)

### 1. Balise "Google Tag"
- [ ] La balise "Google Tag" existe
- [ ] Le paramètre `server_container_url` est configuré
- [ ] La valeur de `server_container_url` est : `https://server-side-tagging-5wlhofq67q-uc.a.run.app`
- [ ] Le déclencheur est "Initialization - All Pages"
- [ ] La balise est publiée

### 2. ID du conteneur interne
- [ ] Aller dans **Admin** → **Paramètres du conteneur**
- [ ] Noter l'ID du conteneur (format : `gtm-xxxxxxx`)
- [ ] Cet ID sera utilisé dans GTM Server-Side

## ✅ Vérifications à faire dans GTM Server-Side

### 1. Client Container Web
- [ ] Le client "Client Container Web" existe
- [ ] L'ID des conteneurs autorisés contient l'ID INTERNE du conteneur Web
- [ ] L'ID est au format `gtm-xxxxxxx` (ex: `gtm-mx6g457s`)
- [ ] **PAS** l'ID public `GTM-MR7JDNSD`

### 2. Balise Google Ads Conversion Tracking
- [ ] La balise "Google Ads Conversion Tracking" existe
- [ ] Le Conversion ID est : `AW-17719745439`
- [ ] Le Conversion Label est configuré
- [ ] Les variables `{{Transaction Value}}` et `{{Currency}}` sont utilisées
- [ ] Le déclencheur est "Event - Purchase"

### 3. Variables
- [ ] Variable "Transaction Value" existe (Type : Données d'événement, Chemin : `value`)
- [ ] Variable "Currency" existe (Type : Données d'événement, Chemin : `currency`)
- [ ] Variable "Transaction ID" existe (Type : Données d'événement, Chemin : `transaction_id`)

### 4. Déclencheur
- [ ] Le déclencheur "Event - Purchase" existe
- [ ] Le type est "Événement personnalisé"
- [ ] Le nom de l'événement est : `purchase`

## ✅ Vérifications dans le navigateur

### 1. GTM Preview Mode
- [ ] Ouvrir GTM Web en mode Preview
- [ ] Naviguer sur le site
- [ ] Vérifier que les événements apparaissent dans le dataLayer
- [ ] Vérifier que les événements ont `event` et `event_name`

### 2. Network Tab
- [ ] Ouvrir les DevTools (F12)
- [ ] Aller dans l'onglet "Network"
- [ ] Filtrer par `server-side-tagging` ou `5wlhofq67q-uc.a.run.app`
- [ ] Vérifier que des requêtes sont envoyées vers le serveur server-side
- [ ] Vérifier que les requêtes retournent un code 200 (succès)

### 3. Console
- [ ] Vérifier qu'il n'y a pas d'erreurs dans la console
- [ ] Vérifier que `window.dataLayer` contient les événements
- [ ] Vérifier que les événements ont `event_name` pour server-side

## ✅ Vérifications dans GTM Server-Side Debug Mode

### 1. Debug Mode
- [ ] Ouvrir GTM Server-Side
- [ ] Activer le mode Debug
- [ ] Naviguer sur le site
- [ ] Vérifier que les événements arrivent dans le serveur
- [ ] Vérifier que les données sont correctes

### 2. Events Monitoring
- [ ] Vérifier les événements dans "Events Monitoring"
- [ ] Vérifier que les événements `purchase` arrivent
- [ ] Vérifier que les variables `value`, `currency`, `transaction_id` sont présentes

## ✅ Vérifications du code

### 1. Format des événements
- [ ] Les événements ont `event` et `event_name`
- [ ] Les événements `purchase` ont `transaction_id`, `value`, `currency`
- [ ] Les valeurs sont au bon format (nombres pour `value`, strings pour `currency`)

### 2. Logs de debug
- [ ] Les logs de debug sont activés en développement
- [ ] Les événements sont loggés dans la console en développement

## 🔧 Actions correctives

### Si `server_container_url` n'est pas configuré :
1. Ouvrir GTM Web
2. Aller dans **Balises** → **Google Tag**
3. Ajouter le paramètre `server_container_url`
4. Valeur : `https://server-side-tagging-5wlhofq67q-uc.a.run.app`
5. Sauvegarder et publier

### Si l'ID du conteneur autorisé est incorrect :
1. Ouvrir GTM Web
2. Aller dans **Admin** → **Paramètres du conteneur**
3. Noter l'ID du conteneur (format : `gtm-xxxxxxx`)
4. Ouvrir GTM Server-Side
5. Aller dans **Clients** → **Client Container Web**
6. Modifier l'ID des conteneurs autorisés
7. Ajouter l'ID interne (pas l'ID public)
8. Sauvegarder

### Si les requêtes ne sont pas envoyées :
1. Vérifier que `server_container_url` est bien configuré
2. Vérifier que la balise "Google Tag" est publiée
3. Vérifier que le déclencheur est "Initialization - All Pages"
4. Vider le cache du navigateur
5. Recharger la page (Ctrl+F5)

### Si les événements n'arrivent pas dans le serveur :
1. Vérifier que l'ID du conteneur autorisé est correct
2. Vérifier que le Client Container Web est actif
3. Vérifier les logs du serveur server-side
4. Vérifier les permissions CORS

## 📊 Format des données attendues

### Événement `purchase` :
```javascript
{
  event: "purchase",
  event_name: "purchase",
  transaction_id: "cs_test_...",
  value: 150.00,
  currency: "EUR",
  submission_id: "...",
  services_count: 0
}
```

### Variables GTM Server-Side :
- `{{Transaction Value}}` → `value` (nombre)
- `{{Currency}}` → `currency` (string, ex: "EUR")
- `{{Transaction ID}}` → `transaction_id` (string)

## 🎯 Résultat attendu

Après toutes ces vérifications :
1. ✅ Les événements sont envoyés au serveur server-side
2. ✅ Les événements `purchase` déclenchent la balise Google Ads
3. ✅ Les conversions sont enregistrées dans Google Ads
4. ✅ Les données sont correctes (transaction_id, value, currency)


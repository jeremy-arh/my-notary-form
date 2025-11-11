# Correction : GTM Server-Side ne reçoit pas les données

## Problème identifié

GTM Web (GTM-MR7JDNSD) reçoit bien les données, mais GTM Server-Side ne les reçoit pas.

## Causes possibles

1. **La balise "Google Tag" n'a pas `server_container_url` configuré**
2. **L'ID du conteneur autorisé dans "Client Container Web" est incorrect**
3. **Les requêtes ne sont pas envoyées au serveur server-side**

## Solution : Vérifications dans GTM

### Étape 1 : Vérifier la balise "Google Tag" dans GTM Web

1. **Ouvrir GTM Web** (GTM-MR7JDNSD)
2. Aller dans **Balises** → **Google Tag**
3. **Vérifier que le paramètre `server_container_url` existe** :
   - Si **OUI** : Vérifier que la valeur est `https://server-side-tagging-5wlhofq67q-uc.a.run.app`
   - Si **NON** : Ajouter le paramètre :
     - Cliquer sur "Ajouter un paramètre de configuration"
     - Nom : `server_container_url`
     - Valeur : `https://server-side-tagging-5wlhofq67q-uc.a.run.app`
     - Sauvegarder

4. **Vérifier le déclencheur** :
   - Le déclencheur doit être "Initialization - All Pages"
   - Cela garantit que la balise est chargée sur toutes les pages

5. **Publier les modifications** :
   - Cliquer sur "Soumettre"
   - Créer une nouvelle version
   - Publier

### Étape 2 : Vérifier le Client Container Web dans GTM Server-Side

1. **Ouvrir GTM Server-Side**
2. Aller dans **Clients** → **Client Container Web**
3. **Vérifier l'ID des conteneurs autorisés** :
   - L'ID doit être l'**ID INTERNE** du conteneur Web, pas l'ID public
   - Format : `gtm-xxxxxxx` (ex: `gtm-mx6g457s`)
   - **PAS** : `GTM-MR7JDNSD` (c'est l'ID public)

4. **Pour trouver l'ID interne** :
   - Dans GTM Web, aller dans **Admin** → **Paramètres du conteneur**
   - L'ID du conteneur est affiché (format : `gtm-xxxxxxx`)
   - Copier cet ID

5. **Configurer l'ID autorisé** :
   - Dans GTM Server-Side, éditer "Client Container Web"
   - Dans "ID des conteneurs autorisés", ajouter l'ID interne (ex: `gtm-mx6g457s`)
   - Sauvegarder

### Étape 3 : Vérifier dans GTM Preview Mode

1. **Ouvrir GTM Web en mode Preview** :
   - Cliquer sur "Aperçu" dans GTM Web
   - Entrer l'URL du site
   - Ouvrir le site dans un nouvel onglet

2. **Vérifier les événements dans le dataLayer** :
   - Dans GTM Preview, vérifier que les événements apparaissent
   - Vérifier que les données sont correctes

3. **Vérifier les requêtes réseau** :
   - Ouvrir les DevTools du navigateur (F12)
   - Aller dans l'onglet "Network"
   - Filtrer par `server-side-tagging` ou `5wlhofq67q-uc.a.run.app`
   - **Vérifier que des requêtes sont envoyées vers le serveur server-side**
   - Si **aucune requête** : La configuration `server_container_url` n'est pas correcte

### Étape 4 : Vérifier dans GTM Server-Side Debug Mode

1. **Ouvrir GTM Server-Side**
2. Activer le mode Debug :
   - Aller dans **Aperçu** ou utiliser l'URL de debug
   - Entrer l'URL du site

3. **Vérifier que les événements arrivent** :
   - Dans GTM Server-Side Debug, vérifier que les événements sont reçus
   - Vérifier que les données sont correctes

## Solution alternative : Vérifier le format des données

Si les requêtes sont envoyées mais les données ne sont pas reçues, vérifier le format :

### Format attendu par GTM Server-Side

Les événements doivent être envoyés avec cette structure :
```javascript
window.dataLayer.push({
  event: "event_name",        // Pour GTM client-side
  event_name: "event_name",   // Pour GTM server-side (IMPORTANT)
  ...eventData
});
```

✅ **Le code actuel envoie déjà `event_name`**, donc le format est correct.

### Vérifier dans la console du navigateur

1. Ouvrir les DevTools (F12)
2. Aller dans l'onglet "Console"
3. Taper : `window.dataLayer`
4. Vérifier que les événements ont bien `event` et `event_name`

## Vérifications supplémentaires

### 1. Vérifier les permissions CORS

Le serveur server-side doit accepter les requêtes depuis vos domaines :
- `app.mynotary.io`
- `mynotary.io`
- Autres domaines utilisés

### 2. Vérifier que le serveur server-side est actif

1. Tester l'URL du serveur server-side :
   ```
   https://server-side-tagging-5wlhofq67q-uc.a.run.app
   ```
2. Vérifier que le serveur répond (ne doit pas retourner d'erreur 404 ou 500)

### 3. Vérifier les logs du serveur server-side

1. Dans GTM Server-Side, aller dans **Admin** → **Conteneurs**
2. Vérifier les logs du serveur
3. Chercher des erreurs ou des avertissements

## Solution de contournement : Envoyer directement au serveur server-side

Si la configuration via `server_container_url` ne fonctionne pas, on peut envoyer les événements directement au serveur server-side via une requête HTTP. Mais cela nécessite une configuration différente et n'est pas recommandé si `server_container_url` peut être configuré correctement.

## Résumé des actions à faire

1. ✅ Vérifier que `server_container_url` est configuré dans la balise "Google Tag"
2. ✅ Vérifier que l'ID du conteneur autorisé est correct (ID interne, pas public)
3. ✅ Vérifier dans GTM Preview Mode que les requêtes sont envoyées au serveur
4. ✅ Vérifier dans GTM Server-Side Debug Mode que les événements arrivent
5. ✅ Vérifier les permissions CORS
6. ✅ Vérifier que le serveur server-side est actif

## Prochaines étapes

Après avoir effectué ces vérifications, si le problème persiste :

1. Vérifier les logs du serveur server-side dans GTM
2. Vérifier les erreurs dans la console du navigateur
3. Vérifier les requêtes réseau dans les DevTools
4. Contacter le support GTM si nécessaire


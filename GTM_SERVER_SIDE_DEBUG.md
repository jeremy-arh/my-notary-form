# Guide de Debug GTM Server-Side

## Problème : GTM Server-Side ne reçoit pas les données

### Vérifications à faire dans GTM

#### 1. Vérifier la balise "Google Tag" dans GTM Web (GTM-MR7JDNSD)

**Étapes** :
1. Ouvrir GTM Web (GTM-MR7JDNSD)
2. Aller dans **Balises** → **Google Tag**
3. Vérifier que le paramètre `server_container_url` est bien configuré :
   - Nom : `server_container_url`
   - Valeur : `https://server-side-tagging-5wlhofq67q-uc.a.run.app`

**Si le paramètre n'existe pas** :
1. Cliquer sur "Ajouter un paramètre de configuration"
2. Nom : `server_container_url`
3. Valeur : `https://server-side-tagging-5wlhofq67q-uc.a.run.app`
4. Sauvegarder et publier

#### 2. Vérifier le Client Container Web dans GTM Server-Side

**Étapes** :
1. Ouvrir GTM Server-Side
2. Aller dans **Clients** → **Client Container Web**
3. Vérifier que l'ID du conteneur autorisé est correct :
   - ID des conteneurs autorisés : `gtm-mx6g457s` (ou l'ID interne de GTM-MR7JDNSD)

**Important** : L'ID doit être l'ID INTERNE du conteneur Web, pas l'ID public (GTM-MR7JDNSD).

**Pour trouver l'ID interne** :
1. Dans GTM Web, aller dans **Admin** → **Paramètres du conteneur**
2. L'ID du conteneur est affiché (format : `gtm-xxxxxxx`)

#### 3. Vérifier que les événements sont bien formatés

Les événements doivent avoir à la fois `event` et `event_name` :
```javascript
window.dataLayer.push({
  event: "purchase",        // Pour GTM client-side
  event_name: "purchase",   // Pour GTM server-side
  transaction_id: "...",
  value: 150.00,
  currency: "EUR"
});
```

✅ **Le code actuel fait déjà cela correctement.**

#### 4. Vérifier dans GTM Preview Mode

**Étapes** :
1. Ouvrir GTM Web en mode Preview
2. Naviguer sur le site
3. Vérifier que les événements apparaissent dans le dataLayer
4. Vérifier que les requêtes sont envoyées au serveur server-side

**Dans la console du navigateur** :
- Ouvrir les DevTools → Network
- Filtrer par `server-side-tagging`
- Vérifier que des requêtes sont envoyées vers `https://server-side-tagging-5wlhofq67q-uc.a.run.app`

#### 5. Vérifier dans GTM Server-Side Debug Mode

**Étapes** :
1. Ouvrir GTM Server-Side
2. Activer le mode Debug
3. Naviguer sur le site
4. Vérifier que les événements arrivent dans le serveur server-side

### Solutions possibles

#### Solution 1 : Vérifier que server_container_url est bien configuré

Si `server_container_url` n'est pas configuré dans la balise "Google Tag", GTM n'enverra pas les données au serveur server-side.

#### Solution 2 : Vérifier l'ID du conteneur autorisé

L'ID dans "Client Container Web" doit correspondre à l'ID INTERNE du conteneur Web, pas à l'ID public.

#### Solution 3 : Vérifier les permissions CORS

Le serveur server-side doit accepter les requêtes depuis les domaines du site.

#### Solution 4 : Utiliser la configuration GTM Server-Side directement

Si la configuration via `server_container_url` ne fonctionne pas, on peut utiliser directement le script GTM server-side, mais cela nécessite une configuration différente.

### Format des données pour GTM Server-Side

GTM Server-Side attend les données dans un format spécifique. Les événements doivent être envoyés avec :
- `event` : Pour GTM client-side
- `event_name` : Pour GTM server-side (c'est ce qui est utilisé côté serveur)

**Le code actuel envoie déjà les deux**, donc le problème vient probablement de la configuration GTM.

### Vérification dans le code

Le code envoie correctement les événements :
```javascript
window.dataLayer.push({
  event: "purchase",
  event_name: "purchase",  // ✅ Présent pour server-side
  transaction_id: "...",
  value: 150.00,
  currency: "EUR"
});
```

### Prochaines étapes

1. ✅ Vérifier que `server_container_url` est configuré dans la balise "Google Tag"
2. ✅ Vérifier que l'ID du conteneur autorisé est correct dans "Client Container Web"
3. ✅ Vérifier dans GTM Preview Mode que les requêtes sont envoyées au serveur
4. ✅ Vérifier dans GTM Server-Side Debug Mode que les événements arrivent


# 🔍 Guide de Débogage GTM Server-Side

## ⚠️ Problème : Aucun événement ne remonte dans GTM Debug Mode

### Étape 1 : Vérifier le Container ID

**Problème détecté** : Dans votre debug mode, le Container ID est `GTM-KRSNRSJ3`, mais dans le code, on utilise `GTM-TG3V3SNR`.

**Solution** : Utilisez le **même Container ID** partout.

#### Option A : Utiliser `GTM-KRSNRSJ3` (celui dans votre debug mode)

1. Mettez à jour les fichiers `index.html` :
   - Remplacez `GTM-TG3V3SNR` par `GTM-KRSNRSJ3`
   - Dans le site : `new-site/notary-site/index.html`
   - Dans le formulaire : `my-notary-form/index.html`

2. Mettez à jour l'URL du serveur de taggage si nécessaire :
   - Vérifiez dans GTM → Admin → Container Settings → Server Container URL
   - Utilisez cette URL dans le code

#### Option B : Utiliser `GTM-TG3V3SNR` (celui dans le code)

1. Dans GTM, vérifiez que vous êtes dans le bon conteneur
2. Le Container ID doit être `GTM-TG3V3SNR`

---

### Étape 2 : Vérifier que le script GTM se charge

1. Ouvrez la **Console du navigateur** (F12)
2. Allez sur votre site
3. Tapez dans la console :
```javascript
window.dataLayer
```

**Résultat attendu** : Vous devriez voir un tableau avec des événements.

**Si `undefined` ou vide** : Le script GTM ne se charge pas.

**Vérifications** :
- Ouvrez l'onglet **Network** (Réseau) dans les DevTools
- Filtrez par `gtm.js` ou `server-side-tagging`
- Vérifiez qu'une requête est envoyée vers votre serveur de taggage
- Vérifiez le **Status Code** (doit être `200` ou `204`)

---

### Étape 3 : Vérifier que les événements sont envoyés

1. Dans la console, tapez :
```javascript
window.dataLayer.push({event: 'test_event', event_name: 'test_event'});
```

2. Vérifiez dans GTM Debug Mode si l'événement apparaît

**Si l'événement n'apparaît pas** :
- Vérifiez l'URL du serveur de taggage dans le code
- Vérifiez que le serveur de taggage est bien déployé et accessible

---

### Étape 4 : Vérifier le format des événements

Votre code doit envoyer :
```javascript
window.dataLayer.push({
  event: 'page_view',
  event_name: 'page_view',  // ⚠️ IMPORTANT pour GTM server-side
  page_location: window.location.href,
  page_referrer: document.referrer || '',
  screen_resolution: window.screen ? window.screen.width : null
});
```

**Vérification** :
1. Dans la console, tapez :
```javascript
console.log(window.dataLayer);
```

2. Vérifiez que chaque événement contient `event_name`

---

### Étape 5 : Vérifier le serveur de taggage

1. Vérifiez que le serveur de taggage est accessible :
   - URL : `https://server-side-tagging-ov64j5aixa-uc.a.run.app`
   - Testez dans le navigateur (doit retourner quelque chose, pas une erreur 404)

2. Vérifiez les permissions :
   - Dans GTM → Admin → Container Settings
   - Vérifiez que l'URL du serveur de taggage est correcte
   - Vérifiez les permissions IAM dans Google Cloud Platform

---

### Étape 6 : Vérifier les déclencheurs dans GTM

1. Dans GTM, allez dans **Déclencheurs**
2. Vérifiez que le déclencheur `Page View Events` existe
3. Vérifiez qu'il est configuré pour l'événement `page_view`
4. Vérifiez que la variable `{{_event}}` est utilisée (variable intégrée GTM)

---

### Étape 7 : Vérifier les balises

1. Dans GTM, allez dans **Balises**
2. Vérifiez que la balise `Plausible - HTTP Request` existe
3. Vérifiez qu'elle est liée au déclencheur `Page View Events`
4. Vérifiez que l'URL est correcte : `https://plausible.io/api/event`

---

## 🐛 Checklist de Débogage Rapide

- [ ] Container ID identique dans le code et GTM
- [ ] Script GTM se charge (vérifier Network tab)
- [ ] `window.dataLayer` existe et contient des événements
- [ ] Chaque événement contient `event_name`
- [ ] Serveur de taggage accessible (pas d'erreur 404)
- [ ] Déclencheur configuré pour `page_view`
- [ ] Balise liée au déclencheur
- [ ] Version GTM publiée (ou en mode Preview)

---

## 🔧 Commandes de Test dans la Console

### Test 1 : Vérifier dataLayer
```javascript
console.log('DataLayer:', window.dataLayer);
console.log('DataLayer length:', window.dataLayer?.length);
```

### Test 2 : Envoyer un événement de test
```javascript
window.dataLayer.push({
  event: 'test_event',
  event_name: 'test_event',
  page_location: window.location.href,
  page_referrer: document.referrer || '',
  screen_resolution: window.screen ? window.screen.width : null
});
```

### Test 3 : Vérifier les requêtes réseau
1. Ouvrez l'onglet **Network**
2. Filtrez par `server-side-tagging` ou `gtm.js`
3. Rechargez la page
4. Vérifiez qu'une requête est envoyée

---

## 📝 Notes Importantes

1. **Container ID** : Doit être identique partout (code, GTM, serveur de taggage)
2. **event_name** : Obligatoire pour GTM server-side (en plus de `event`)
3. **Mode Preview** : Assurez-vous d'être en mode Preview dans GTM pour voir les événements
4. **Version publiée** : Si vous n'êtes pas en Preview, la version doit être publiée

---

## 🚨 Erreurs Courantes

### Erreur : "No tag has been evaluated"
- **Cause** : Aucun événement n'arrive au serveur de taggage
- **Solution** : Vérifiez que le script GTM se charge et que les événements sont envoyés

### Erreur : "Container ID mismatch"
- **Cause** : Le Container ID dans le code ne correspond pas à celui dans GTM
- **Solution** : Utilisez le même Container ID partout

### Erreur : "Server-side tagging endpoint not found"
- **Cause** : L'URL du serveur de taggage est incorrecte
- **Solution** : Vérifiez l'URL dans GTM Admin → Container Settings

---

## ✅ Solution Rapide

Si rien ne fonctionne, essayez cette commande dans la console pour forcer un événement :

```javascript
// Forcer un événement page_view avec toutes les données nécessaires
window.dataLayer.push({
  event: 'page_view',
  event_name: 'page_view',
  page_location: window.location.href,
  page_referrer: document.referrer || '',
  screen_resolution: window.screen ? window.screen.width : null,
  page_name: document.title,
  page_path: window.location.pathname
});
```

Ensuite, vérifiez dans GTM Debug Mode si l'événement apparaît.


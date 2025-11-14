# 🧪 Script de Test GTM

## Test Rapide dans la Console

Après avoir rechargé la page avec les nouvelles URLs, testez dans la console du navigateur :

### 1. Vérifier que dataLayer existe
```javascript
console.log('DataLayer:', window.dataLayer);
console.log('DataLayer length:', window.dataLayer?.length);
```

### 2. Vérifier que le script GTM se charge
```javascript
// Vérifier dans l'onglet Network
// Filtrez par "gtm.js" ou "server-side-tagging-5wlhofq67q"
// Vous devriez voir une requête avec status 200
```

### 3. Forcer un événement de test
```javascript
window.dataLayer.push({
  event: 'page_view',
  event_name: 'page_view',
  page_location: window.location.href,
  page_referrer: document.referrer || '',
  screen_resolution: window.screen ? window.screen.width : null,
  page_name: document.title,
  page_path: window.location.pathname
});

console.log('Événement envoyé ! Vérifiez dans GTM Debug Mode.');
```

### 4. Vérifier les requêtes réseau
1. Ouvrez l'onglet **Network** (Réseau)
2. Filtrez par `server-side-tagging-5wlhofq67q`
3. Rechargez la page
4. Vous devriez voir des requêtes vers le serveur de taggage

---

## 🔧 Correction de l'erreur JavaScript

L'erreur `closest is not a function` peut être causée par :
- Un élément DOM qui n'a pas la méthode `closest` (ancien navigateur)
- Un problème dans le code React

**Solution temporaire** : Ajoutez cette vérification dans votre code si nécessaire :
```javascript
if (element && typeof element.closest === 'function') {
  element.closest(selector);
}
```

Mais cette erreur ne devrait pas empêcher GTM de fonctionner.

---

## ✅ Vérifications Finales

1. **URL du serveur** : `server-side-tagging-5wlhofq67q-uc.a.run.app` ✅
2. **Container ID** : `GTM-KRSNRSJ3` ✅
3. **Script GTM chargé** : Vérifiez dans Network tab
4. **Événements envoyés** : Vérifiez dans dataLayer
5. **GTM Debug Mode** : Les événements devraient apparaître

---

## 🚨 Si ça ne fonctionne toujours pas

1. **Vérifiez dans GTM Admin** :
   - Allez dans **Admin** → **Container Settings**
   - Vérifiez l'URL du serveur de taggage
   - Elle doit correspondre à `server-side-tagging-5wlhofq67q-uc.a.run.app`

2. **Vérifiez les permissions** :
   - Le serveur Cloud Run doit être accessible
   - Vérifiez dans Google Cloud Platform que le service est actif

3. **Mode Preview** :
   - Assurez-vous d'être en mode Preview dans GTM
   - La version doit être en "QUICK_PREVIEW" ou publiée


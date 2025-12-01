# 🔧 Fix : Plausible ignore localhost

## ❌ Problème

Plausible bloque automatiquement les événements depuis `localhost` pour éviter de polluer les statistiques avec des données de développement.

Message d'erreur : `Ignoring Event: localhost`

## ✅ Solution 1 : Désactiver la protection localhost (Recommandé)

1. Allez dans **Plausible Dashboard** → **Settings** → **General**
2. Cherchez l'option **"Ignore localhost"** ou **"Development domains"**
3. **Désactivez** cette option OU ajoutez `localhost` aux domaines autorisés
4. Sauvegardez

## ✅ Solution 2 : Utiliser un domaine de développement

1. Dans Plausible Dashboard → **Settings** → **General**
2. Ajoutez un domaine de développement (ex: `dev.mynotary.io`)
3. Modifiez `index.html` pour utiliser ce domaine en développement :

```html
<!-- En développement -->
<script defer data-domain="dev.mynotary.io" src="https://plausible.io/js/script.js"></script>

<!-- En production -->
<script defer data-domain="mynotary.io" src="https://plausible.io/js/script.js"></script>
```

## ✅ Solution 3 : Utiliser une variable d'environnement

Modifiez `index.html` pour utiliser une variable d'environnement :

```html
<script defer data-domain="%VITE_PLAUSIBLE_DOMAIN%" src="https://plausible.io/js/script.js"></script>
```

Puis dans `.env` :
```env
VITE_PLAUSIBLE_DOMAIN=mynotary.io
```

## ✅ Solution 4 : Tester uniquement en production

Les événements fonctionneront automatiquement une fois déployés en production sur votre domaine réel (`mynotary.io`).

## 🔍 Vérification

Après avoir appliqué la solution :

1. Rechargez la page
2. Dans la console, tapez : `window.plausible('test_event')`
3. Vous ne devriez **PAS** voir `Ignoring Event: localhost`
4. Vérifiez dans Plausible → Goals → `test_event` si l'événement apparaît

## 📝 Note

En production, ce problème n'existera pas car vous ne serez pas sur `localhost` mais sur votre vrai domaine (`mynotary.io`).



# 📦 Migration vers Plausible NPM Package

## ✅ Migration Complétée

Le tracking Plausible Analytics a été migré de GTM server-side vers le paquet NPM `plausible-tracker`.

## 📋 Changements Effectués

### 1. Installation du Paquet NPM

```bash
npm install plausible-tracker
```

Installé dans :
- ✅ `my-notary-form` (formulaire)
- ✅ `new-site/notary-site` (site)

### 2. Création des Utilitaires Plausible

- ✅ `src/utils/plausible.js` (formulaire)
- ✅ `new-site/notary-site/src/utils/plausible.js` (site)

### 3. Remplacement des Imports

Tous les imports `from '../utils/gtm'` ont été remplacés par `from '../utils/plausible'` dans :

**Formulaire** :
- ✅ `src/components/NotaryForm.jsx`

**Site** :
- ✅ `src/App.jsx`
- ✅ `src/components/Hero.jsx`
- ✅ `src/components/HowItWorks.jsx`
- ✅ `src/components/MobileCTA.jsx`
- ✅ `src/components/Navbar.jsx`
- ✅ `src/components/Services.jsx`
- ✅ `src/pages/BlogPost.jsx`
- ✅ `src/pages/ServiceDetail.jsx`

## 🎯 Configuration

Le domaine configuré est : **`mynotary.io`**

Si vous devez changer le domaine, modifiez dans :
- `src/utils/plausible.js` (formulaire)
- `new-site/notary-site/src/utils/plausible.js` (site)

```javascript
const plausible = Plausible({
  domain: 'mynotary.io',  // ← Changez ici
  apiHost: 'https://plausible.io'
});
```

## 📊 Événements Trackés

### Formulaire
- ✅ Page views
- ✅ Form step completed
- ✅ Form submission start
- ✅ Payment success
- ✅ Payment failure
- ✅ Service selection
- ✅ Document upload
- ✅ Appointment booking

### Site
- ✅ Page views
- ✅ CTA clicks
- ✅ Service clicks
- ✅ Login clicks
- ✅ Navigation clicks
- ✅ Blog post views

## 🔍 Vérification

1. **Rechargez votre site** (Ctrl+F5)
2. **Ouvrez la console du navigateur** (F12)
3. **Vérifiez dans l'onglet Network** :
   - Filtrez par `plausible.io`
   - Vous devriez voir des requêtes POST vers `https://plausible.io/api/event`
4. **Vérifiez dans votre dashboard Plausible** :
   - Les visites devraient apparaître dans quelques minutes

## 📝 Notes

- **GTM reste actif** : Le script GTM reste dans `index.html` pour Google Ads (si vous l'utilisez)
- **Plausible est maintenant direct** : Plus besoin de passer par GTM server-side pour Plausible
- **Plus simple** : Le paquet NPM est plus simple et direct que via GTM

## 🔗 Documentation

- [Plausible Tracker NPM](https://plausible.io/docs/plausible-tracker)
- [Plausible Events API](https://plausible.io/docs/events-api)


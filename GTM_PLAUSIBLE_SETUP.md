# 📊 Configuration Plausible Analytics - GTM Server-Side

Guide simplifié pour configurer uniquement Plausible Analytics avec Google Tag Manager Server-Side.

## 🎯 Objectif

Configurer Plausible Analytics pour qu'il fonctionne via votre serveur de taggage GTM (`https://server-side-tagging-ov64j5aixa-uc.a.run.app`).

---

## 📋 Étape 1 : Créer les Variables

### 1.1 Page URL (Request Path)

1. Allez dans **Variables** → **Nouvelle variable**
2. **Nom** : `Page URL`
3. **Type** : **Chemin de la requête** (Request Path)
   - Dans un conteneur server-side, cherchez "Request Path" ou "Chemin de la requête"
4. Cliquez sur **Enregistrer**

### 1.2 Page Referrer (Request Header)

1. Allez dans **Variables** → **Nouvelle variable**
2. **Nom** : `Page Referrer`
3. **Type** : **En-tête de requête** (Request Header)
4. **Nom de l'en-tête** : `Referer`
   - ⚠️ Note : C'est bien "Referer" (sans le double 'r'), c'est la norme HTTP
5. Cliquez sur **Enregistrer**

### 1.3 User Agent (Request Header)

1. Allez dans **Variables** → **Nouvelle variable**
2. **Nom** : `User Agent`
3. **Type** : **En-tête de requête** (Request Header)
4. **Nom de l'en-tête** : `User-Agent`
5. Cliquez sur **Enregistrer**

### 1.4 Event Name (Event Data)

1. Allez dans **Variables** → **Nouvelle variable**
2. **Nom** : `Event Name`
3. **Type** : **Données d'événement** (Event Data)
4. **Clé** : `event`
   - Cette variable récupère la valeur de `event` depuis le dataLayer
5. Cliquez sur **Enregistrer**

### 1.5 Screen Width (JavaScript Variable)

1. Allez dans **Variables** → **Nouvelle variable**
2. **Nom** : `Screen Width`
3. **Type** : **Variable JavaScript personnalisée** (Custom JavaScript Variable)
4. **Code JavaScript** :
```javascript
function() {
  return window.screen ? window.screen.width : null;
}
```
5. Cliquez sur **Enregistrer**

---

## 🎯 Étape 2 : Créer les Déclencheurs

### 2.1 All Pages

1. Allez dans **Déclencheurs** → **Nouveau**
2. **Nom** : `All Pages`
3. **Type** : **Visibilité de page** (Page View)
   - Dans un conteneur server-side, cela peut être "Page View" ou "All Pages"
4. **Configuration** : Laissez par défaut (toutes les pages)
5. Cliquez sur **Enregistrer**

### 2.2 Page View

1. Allez dans **Déclencheurs** → **Nouveau**
2. **Nom** : `Page View`
3. **Type** : **Événement personnalisé** (Custom Event)
4. **Nom de l'événement** : `page_view`
   - Cet événement est envoyé automatiquement par votre code React
5. Cliquez sur **Enregistrer**

---

## 🏷️ Étape 3 : Créer la Balise Plausible Analytics

1. Allez dans **Balises** → **Nouvelle balise**
2. **Nom** : `Plausible Analytics - Server-Side`
3. **Type** : **Requête HTTP** (HTTP Request)
   - Cherchez "HTTP Request" dans la liste des types de balises

### Configuration de la balise :

#### URL
- **URL** : `https://plausible.io/api/event`

#### Méthode HTTP
- **Méthode HTTP** : `POST`

#### Corps de la requête (Request Body)
- **Type** : JSON
- **Contenu** :
```json
{
  "domain": "mynotary.io",
  "name": "{{Event Name}}",
  "url": "{{Page URL}}",
  "referrer": "{{Page Referrer}}",
  "screen_width": {{Screen Width}}
}
```

**⚠️ Important** : 
- Utilisez les variables avec la syntaxe `{{Variable Name}}`
- Pour `screen_width`, n'utilisez PAS de guillemets (c'est un nombre)

#### En-têtes (Headers)
- **Type** : JSON
- **Contenu** :
```json
{
  "Content-Type": "application/json",
  "User-Agent": "{{User Agent}}"
}
```

#### Déclencheurs
- Sélectionnez **`All Pages`** et **`Page View`**
  - Cela permet d'envoyer les événements à chaque chargement de page ET à chaque événement `page_view` personnalisé

4. Cliquez sur **Enregistrer**

---

## ✅ Étape 4 : Tester la Configuration

### 4.1 Créer une Version

1. Allez dans **Versions** → **Créer une version**
2. **Nom** : `Plausible Analytics - Configuration initiale`
3. **Description** : `Configuration Plausible Analytics avec server-side tagging`
4. Cliquez sur **Enregistrer**

### 4.2 Tester en Mode Aperçu

1. Cliquez sur **Prévisualiser** dans GTM
2. Entrez l'URL de votre site :
   - Site principal : `https://mynotary.io` (ou votre URL de production)
   - Formulaire : `https://app.mynotary.io` (ou votre URL de formulaire)
3. Dans le panneau de débogage GTM, vérifiez :
   - ✅ Les variables se remplissent correctement
   - ✅ Le déclencheur `Page View` se déclenche
   - ✅ La balise `Plausible Analytics - Server-Side` s'envoie

### 4.3 Vérifier les Requêtes Network

1. Ouvrez les outils de développement (F12)
2. Allez dans l'onglet **Network**
3. Filtrez par `server-side-tagging-ov64j5aixa-uc.a.run.app`
4. Vérifiez qu'une requête est envoyée vers votre serveur de taggage
5. Cliquez sur la requête et vérifiez :
   - **Request URL** : `https://server-side-tagging-ov64j5aixa-uc.a.run.app/...`
   - **Status** : `200` ou `204` (succès)

### 4.4 Vérifier dans Plausible

1. Allez dans votre dashboard Plausible : `https://plausible.io/mynotary.io`
2. Attendez quelques minutes (les données peuvent prendre 1-2 minutes à apparaître)
3. Vérifiez que les visites apparaissent dans le dashboard

---

## 🚀 Étape 5 : Publier

Une fois les tests validés :

1. Allez dans **Versions**
2. Cliquez sur **Publier** sur la version que vous avez créée
3. Ajoutez un nom de version (ex: `v1.0 - Plausible Analytics`)
4. Cliquez sur **Publier**

---

## 📊 Résumé des Éléments Créés

### Variables (5)
- ✅ Page URL (Request Path)
- ✅ Page Referrer (Request Header - Referer)
- ✅ User Agent (Request Header - User-Agent)
- ✅ Event Name (Event Data - event)
- ✅ Screen Width (JavaScript Variable)

### Déclencheurs (2)
- ✅ All Pages (Page View)
- ✅ Page View (Custom Event - page_view)

### Balises (1)
- ✅ Plausible Analytics - Server-Side (HTTP Request)

---

## 🔧 Dépannage

### Les variables ne se remplissent pas

**Problème** : Les variables retournent `undefined` ou sont vides.

**Solutions** :
1. Vérifiez que vous utilisez les bons types de variables pour un conteneur server-side
2. Pour `Page URL`, utilisez "Request Path" et non "Page URL" (qui est pour les conteneurs web)
3. Pour `Page Referrer` et `User Agent`, utilisez "Request Header" avec les noms d'en-têtes exacts : `Referer` et `User-Agent`

### La balise ne s'envoie pas

**Problème** : La balise ne se déclenche pas dans le mode Aperçu.

**Solutions** :
1. Vérifiez que les déclencheurs sont bien sélectionnés dans la balise
2. Vérifiez que l'événement `page_view` est bien envoyé depuis votre code React
3. Vérifiez la syntaxe JSON du corps de la requête (pas d'erreurs de syntaxe)

### Erreur 403 ou 404 dans Network

**Problème** : Les requêtes vers le serveur de taggage retournent une erreur.

**Solutions** :
1. Vérifiez que l'URL du serveur de taggage est correcte : `https://server-side-tagging-ov64j5aixa-uc.a.run.app`
2. Vérifiez que le conteneur GTM est bien configuré pour utiliser ce serveur
3. Vérifiez les permissions IAM dans Google Cloud Platform

### Les données n'apparaissent pas dans Plausible

**Problème** : Les requêtes sont envoyées mais rien n'apparaît dans Plausible.

**Solutions** :
1. Vérifiez que le domaine dans le JSON est correct : `"domain": "mynotary.io"`
2. Attendez 1-2 minutes (les données peuvent prendre du temps à apparaître)
3. Vérifiez que le domaine est bien configuré dans votre compte Plausible
4. Vérifiez les logs du serveur de taggage dans Google Cloud Platform

---

## 📝 Notes Importantes

1. **Domaine** : Assurez-vous que le domaine dans le JSON (`"domain": "mynotary.io"`) correspond exactement au domaine configuré dans votre compte Plausible.

2. **Variables Server-Side** : Dans un conteneur server-side, les variables sont différentes des conteneurs web. Utilisez :
   - **Request Path** pour l'URL de la page
   - **Request Header** pour les en-têtes HTTP
   - **Event Data** pour les données du dataLayer

3. **Event Name** : La variable `Event Name` récupère la valeur de `event` depuis le dataLayer. Si votre code envoie `{ event: 'page_view' }`, la variable retournera `page_view`.

4. **Screen Width** : Cette variable JavaScript fonctionne côté client. Si elle retourne `null`, c'est normal si `window.screen` n'est pas disponible.

---

## 🎉 C'est Terminé !

Une fois publié, Plausible Analytics fonctionnera via votre serveur de taggage GTM. Toutes les visites et événements seront trackés de manière privée et conforme au RGPD.

---

## 📚 Ressources

- [Documentation Plausible API](https://plausible.io/docs/events-api)
- [Documentation GTM Server-Side](https://developers.google.com/tag-platform/tag-manager/server-side)


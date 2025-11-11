# ⚡ Configuration Plausible - Guide Rapide (5 minutes)

## 🎯 Objectif
Configurer Plausible Analytics dans votre conteneur GTM server-side en 5 minutes.

---

## 📋 Étape 1 : Variables (5 minutes)

### 1. Page URL
- **Variables** → **Nouvelle variable**
- **Nom** : `Page URL`
- **Type** : **Chemin de la requête** (Request Path)
- ✅ **Enregistrer**

### 2. Page Referrer
- **Variables** → **Nouvelle variable**
- **Nom** : `Page Referrer`
- **Type** : **En-tête de requête** (Request Header)
- **Nom de l'en-tête** : `Referer`
- ✅ **Enregistrer**

### 3. User Agent
- **Variables** → **Nouvelle variable**
- **Nom** : `User Agent`
- **Type** : **En-tête de requête** (Request Header)
- **Nom de l'en-tête** : `User-Agent`
- ✅ **Enregistrer**

### 4. Event Name
- **Variables** → **Nouvelle variable**
- **Nom** : `Event Name`
- **Type** : **Données d'événement** (Event Data)
- **Clé** : `event`
- ✅ **Enregistrer**

### 5. Screen Width
- **Variables** → **Nouvelle variable**
- **Nom** : `Screen Width`
- **Type** : **Variable JavaScript personnalisée**
- **Code** :
```javascript
function() {
  return window.screen ? window.screen.width : null;
}
```
- ✅ **Enregistrer**

---

## 🎯 Étape 2 : Déclencheurs (2 minutes)

### 1. All Pages
- **Déclencheurs** → **Nouveau**
- **Nom** : `All Pages`
- **Type** : **Visibilité de page** (Page View)
- ✅ **Enregistrer**

### 2. Page View
- **Déclencheurs** → **Nouveau**
- **Nom** : `Page View`
- **Type** : **Événement personnalisé**
- **Nom de l'événement** : `page_view`
- ✅ **Enregistrer**

---

## 🏷️ Étape 3 : Balise Plausible (3 minutes)

1. **Balises** → **Nouvelle balise**
2. **Nom** : `Plausible Analytics - Server-Side`
3. **Type** : **Requête HTTP** (HTTP Request)

### Configuration :

**URL** :
```
https://plausible.io/api/event
```

**Méthode HTTP** : `POST`

**Corps de la requête** (JSON) :
```json
{
  "domain": "mynotary.io",
  "name": "{{Event Name}}",
  "url": "{{Page URL}}",
  "referrer": "{{Page Referrer}}",
  "screen_width": {{Screen Width}}
}
```

**En-têtes** (JSON) :
```json
{
  "Content-Type": "application/json",
  "User-Agent": "{{User Agent}}"
}
```

**Déclencheurs** : Sélectionnez `All Pages` et `Page View`

4. ✅ **Enregistrer**

---

## ✅ Étape 4 : Tester et Publier

1. **Versions** → **Créer une version**
2. **Nom** : `Plausible Analytics`
3. ✅ **Enregistrer**
4. **Prévisualiser** pour tester
5. **Publier** une fois validé

---

## 🎉 C'est Terminé !

Votre configuration Plausible est prête. Les données apparaîtront dans votre dashboard Plausible dans quelques minutes.

---

## ⚠️ Note Importante

**L'import JSON ne fonctionne pas pour les conteneurs server-side GTM.** C'est pourquoi ce guide manuel est nécessaire. C'est rapide (5-10 minutes) et plus fiable !


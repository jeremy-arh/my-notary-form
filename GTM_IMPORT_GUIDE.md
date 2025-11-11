# 📥 Guide d'Import GTM - Configuration Server-Side

## ⚠️ Note Importante

**GTM ne permet pas d'importer directement un fichier JSON dans un conteneur server-side via l'interface web.** Cependant, ce fichier JSON vous sert de **référence complète** pour créer manuellement tous les éléments dans GTM.

## 🎯 Deux Options Disponibles

### Option 1 : Création Manuelle (Recommandée)
Suivez ce guide pour créer chaque élément manuellement dans l'interface GTM. C'est la méthode la plus fiable.

### Option 2 : Import via l'API GTM (Avancée)
Si vous avez accès à l'API GTM, vous pouvez utiliser le fichier JSON avec l'API pour créer les éléments programmatiquement.

---

## 📋 Étape 1 : Créer les Variables

### 1.1 Page URL (Request Path)
1. Allez dans **Variables** → **Nouvelle variable**
2. **Nom** : `Page URL`
3. **Type** : **Chemin de la requête** (Request Path)
4. Cliquez sur **Enregistrer**

### 1.2 Page Referrer (Request Header)
1. Allez dans **Variables** → **Nouvelle variable**
2. **Nom** : `Page Referrer`
3. **Type** : **En-tête de requête** (Request Header)
4. **Nom de l'en-tête** : `Referer`
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
5. Cliquez sur **Enregistrer**

### 1.5 Conversion Value (Event Data)
1. Allez dans **Variables** → **Nouvelle variable**
2. **Nom** : `Conversion Value`
3. **Type** : **Données d'événement** (Event Data)
4. **Clé** : `value`
5. Cliquez sur **Enregistrer**

### 1.6 Conversion Currency (Event Data)
1. Allez dans **Variables** → **Nouvelle variable**
2. **Nom** : `Conversion Currency`
3. **Type** : **Données d'événement** (Event Data)
4. **Clé** : `currency`
5. Cliquez sur **Enregistrer**

### 1.7 Transaction ID (Event Data)
1. Allez dans **Variables** → **Nouvelle variable**
2. **Nom** : `Transaction ID`
3. **Type** : **Données d'événement** (Event Data)
4. **Clé** : `transaction_id`
5. Cliquez sur **Enregistrer**

### 1.8 Page Name (Event Data)
1. Allez dans **Variables** → **Nouvelle variable**
2. **Nom** : `Page Name`
3. **Type** : **Données d'événement** (Event Data)
4. **Clé** : `page_name`
5. Cliquez sur **Enregistrer**

### 1.9 Page Path (Event Data)
1. Allez dans **Variables** → **Nouvelle variable**
2. **Nom** : `Page Path`
3. **Type** : **Données d'événement** (Event Data)
4. **Clé** : `page_path`
5. Cliquez sur **Enregistrer**

### 1.10 Form Type (Event Data)
1. Allez dans **Variables** → **Nouvelle variable**
2. **Nom** : `Form Type`
3. **Type** : **Données d'événement** (Event Data)
4. **Clé** : `form_type`
5. Cliquez sur **Enregistrer**

### 1.11 Screen Width (JavaScript Variable)
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
4. **Configuration** : Toutes les pages
5. Cliquez sur **Enregistrer**

### 2.2 Page View
1. Allez dans **Déclencheurs** → **Nouveau**
2. **Nom** : `Page View`
3. **Type** : **Événement personnalisé** (Custom Event)
4. **Nom de l'événement** : `page_view`
5. Cliquez sur **Enregistrer**

### 2.3 Form Submit
1. Allez dans **Déclencheurs** → **Nouveau**
2. **Nom** : `Form Submit`
3. **Type** : **Événement personnalisé** (Custom Event)
4. **Nom de l'événement** : `form_submit`
5. Cliquez sur **Enregistrer**

### 2.4 Form Step Completed
1. Allez dans **Déclencheurs** → **Nouveau**
2. **Nom** : `Form Step Completed`
3. **Type** : **Événement personnalisé** (Custom Event)
4. **Nom de l'événement** : `form_step_completed`
5. Cliquez sur **Enregistrer**

### 2.5 Form Submission Start
1. Allez dans **Déclencheurs** → **Nouveau**
2. **Nom** : `Form Submission Start`
3. **Type** : **Événement personnalisé** (Custom Event)
4. **Nom de l'événement** : `form_submission_start`
5. Cliquez sur **Enregistrer**

### 2.6 Payment Success
1. Allez dans **Déclencheurs** → **Nouveau**
2. **Nom** : `Payment Success`
3. **Type** : **Événement personnalisé** (Custom Event)
4. **Nom de l'événement** : `payment_success`
5. Cliquez sur **Enregistrer**

### 2.7 Payment Failure
1. Allez dans **Déclencheurs** → **Nouveau**
2. **Nom** : `Payment Failure`
3. **Type** : **Événement personnalisé** (Custom Event)
4. **Nom de l'événement** : `payment_failure`
5. Cliquez sur **Enregistrer**

### 2.8 CTA Click
1. Allez dans **Déclencheurs** → **Nouveau**
2. **Nom** : `CTA Click`
3. **Type** : **Événement personnalisé** (Custom Event)
4. **Nom de l'événement** : `cta_click`
5. Cliquez sur **Enregistrer**

### 2.9 Service Click
1. Allez dans **Déclencheurs** → **Nouveau**
2. **Nom** : `Service Click`
3. **Type** : **Événement personnalisé** (Custom Event)
4. **Nom de l'événement** : `service_click`
5. Cliquez sur **Enregistrer**

### 2.10 Login Click
1. Allez dans **Déclencheurs** → **Nouveau**
2. **Nom** : `Login Click`
3. **Type** : **Événement personnalisé** (Custom Event)
4. **Nom de l'événement** : `login_click`
5. Cliquez sur **Enregistrer**

### 2.11 Navigation Click
1. Allez dans **Déclencheurs** → **Nouveau**
2. **Nom** : `Navigation Click`
3. **Type** : **Événement personnalisé** (Custom Event)
4. **Nom de l'événement** : `navigation_click`
5. Cliquez sur **Enregistrer**

### 2.12 Blog Post View
1. Allez dans **Déclencheurs** → **Nouveau**
2. **Nom** : `Blog Post View`
3. **Type** : **Événement personnalisé** (Custom Event)
4. **Nom de l'événement** : `blog_post_view`
5. Cliquez sur **Enregistrer**

---

## 🏷️ Étape 3 : Créer les Balises

### 3.1 Plausible Analytics - Server-Side

1. Allez dans **Balises** → **Nouvelle balise**
2. **Nom** : `Plausible Analytics - Server-Side`
3. **Type** : **Requête HTTP** (HTTP Request)
4. **Configuration** :
   - **URL** : `https://plausible.io/api/event`
   - **Méthode HTTP** : `POST`
   - **Corps de la requête** :
```json
{
  "domain": "mynotary.io",
  "name": "{{Event Name}}",
  "url": "{{Page URL}}",
  "referrer": "{{Page Referrer}}",
  "screen_width": {{Screen Width}}
}
```
   - **En-têtes** :
```json
{
  "Content-Type": "application/json",
  "User-Agent": "{{User Agent}}"
}
```
5. **Déclencheurs** : Sélectionnez `All Pages` et `Page View`
6. Cliquez sur **Enregistrer**

### 3.2 Google Ads - Conversion Tracking

1. Allez dans **Balises** → **Nouvelle balise**
2. **Nom** : `Google Ads - Conversion Tracking`
3. **Type** : **Google Ads : Suivi des conversions** (Google Ads Conversion Tracking)
4. **Configuration** :
   - **ID de conversion** : `REMPLACER_PAR_VOTRE_ID_CONVERSION` (ex: `AW-123456789`)
   - **Libellé de conversion** : `REMPLACER_PAR_VOTRE_LIBELLE` (ex: `abc123`)
   - **Valeur de conversion** : `{{Conversion Value}}`
   - **Devise** : `{{Conversion Currency}}` (ou `EUR` en dur)
   - **ID de transaction** : `{{Transaction ID}}`
5. **Déclencheurs** : Sélectionnez `Payment Success`
6. Cliquez sur **Enregistrer**

**⚠️ IMPORTANT** : Remplacez `REMPLACER_PAR_VOTRE_ID_CONVERSION` et `REMPLACER_PAR_VOTRE_LIBELLE` par vos vraies valeurs depuis Google Ads.

### 3.3 Google Ads - Remarketing

1. Allez dans **Balises** → **Nouvelle balise**
2. **Nom** : `Google Ads - Remarketing`
3. **Type** : **Google Ads : Remarketing** (Google Ads Remarketing)
4. **Configuration** :
   - **ID de conversion** : `REMPLACER_PAR_VOTRE_ID_CONVERSION` (ex: `AW-123456789`)
   - **Libellé de conversion** : `REMPLACER_PAR_VOTRE_LIBELLE` (ex: `abc123`)
5. **Déclencheurs** : Sélectionnez `All Pages` et `Page View`
6. Cliquez sur **Enregistrer**

**⚠️ IMPORTANT** : Remplacez `REMPLACER_PAR_VOTRE_ID_CONVERSION` et `REMPLACER_PAR_VOTRE_LIBELLE` par vos vraies valeurs depuis Google Ads.

### 3.4 Google Ads - Enhanced Conversions

1. Allez dans **Balises** → **Nouvelle balise**
2. **Nom** : `Google Ads - Enhanced Conversions`
3. **Type** : **Google Ads : Suivi des conversions** (Google Ads Conversion Tracking)
4. **Configuration** :
   - **ID de conversion** : `REMPLACER_PAR_VOTRE_ID_CONVERSION` (ex: `AW-123456789`)
   - **Libellé de conversion** : `REMPLACER_PAR_VOTRE_LIBELLE` (ex: `abc123`)
   - **Valeur de conversion** : `{{Conversion Value}}`
   - **Devise** : `{{Conversion Currency}}` (ou `EUR` en dur)
   - **ID de transaction** : `{{Transaction ID}}`
   - **Conversions améliorées** : ✅ Activé
5. **Déclencheurs** : Sélectionnez `Payment Success`
6. Cliquez sur **Enregistrer**

**⚠️ IMPORTANT** : Remplacez `REMPLACER_PAR_VOTRE_ID_CONVERSION` et `REMPLACER_PAR_VOTRE_LIBELLE` par vos vraies valeurs depuis Google Ads.

---

## ✅ Étape 4 : Vérification et Test

### 4.1 Vérifier la Configuration

1. Allez dans **Versions** → **Créer une version**
2. Donnez un nom à la version (ex: "Configuration initiale")
3. Ajoutez une description
4. Cliquez sur **Enregistrer**

### 4.2 Tester en Mode Aperçu

1. Cliquez sur **Prévisualiser** dans GTM
2. Entrez l'URL de votre site (ex: `https://app.mynotary.io`)
3. Vérifiez que :
   - Les variables se remplissent correctement
   - Les déclencheurs se déclenchent
   - Les balises s'envoient vers le serveur de taggage

### 4.3 Vérifier les Requêtes

1. Ouvrez les outils de développement (F12)
2. Allez dans l'onglet **Network**
3. Filtrez par `server-side-tagging-ov64j5aixa-uc.a.run.app`
4. Vérifiez que les requêtes sont envoyées vers le serveur de taggage

### 4.4 Publier la Version

1. Une fois les tests validés, allez dans **Versions**
2. Cliquez sur **Publier** sur la version que vous avez créée
3. Confirmez la publication

---

## 🔧 Modifications Nécessaires Après Import

### ⚠️ À Faire OBLIGATOIREMENT :

1. **Google Ads - Conversion Tracking** :
   - Remplacez `REMPLACER_PAR_VOTRE_ID_CONVERSION` par votre ID de conversion (ex: `AW-123456789`)
   - Remplacez `REMPLACER_PAR_VOTRE_LIBELLE` par votre libellé de conversion

2. **Google Ads - Remarketing** :
   - Remplacez `REMPLACER_PAR_VOTRE_ID_CONVERSION` par votre ID de conversion
   - Remplacez `REMPLACER_PAR_VOTRE_LIBELLE` par votre libellé de conversion

3. **Google Ads - Enhanced Conversions** :
   - Remplacez `REMPLACER_PAR_VOTRE_ID_CONVERSION` par votre ID de conversion
   - Remplacez `REMPLACER_PAR_VOTRE_LIBELLE` par votre libellé de conversion

### 📝 Comment Obtenir vos IDs Google Ads :

1. Allez dans **Google Ads** → **Outils et paramètres** → **Conversions**
2. Cliquez sur votre action de conversion
3. Cliquez sur **Balises** → **Utiliser Google Tag Manager**
4. Copiez l'**ID de conversion** (format: `AW-123456789`)
5. Copiez le **Libellé de conversion** (format: `abc123`)

---

## 📊 Résumé des Éléments Créés

### Variables (11)
- Page URL
- Page Referrer
- User Agent
- Event Name
- Conversion Value
- Conversion Currency
- Transaction ID
- Page Name
- Page Path
- Form Type
- Screen Width

### Déclencheurs (12)
- All Pages
- Page View
- Form Submit
- Form Step Completed
- Form Submission Start
- Payment Success
- Payment Failure
- CTA Click
- Service Click
- Login Click
- Navigation Click
- Blog Post View

### Balises (4)
- Plausible Analytics - Server-Side
- Google Ads - Conversion Tracking
- Google Ads - Remarketing
- Google Ads - Enhanced Conversions

---

## 🚀 Prochaines Étapes

1. ✅ Créer toutes les variables
2. ✅ Créer tous les déclencheurs
3. ✅ Créer toutes les balises
4. ✅ Remplacer les placeholders Google Ads
5. ✅ Tester en mode Aperçu
6. ✅ Publier la version

---

## 📚 Ressources

- [Documentation GTM Server-Side](https://developers.google.com/tag-platform/tag-manager/server-side)
- [Documentation Plausible API](https://plausible.io/docs/events-api)
- [Documentation Google Ads Conversions](https://support.google.com/google-ads/answer/1722054)


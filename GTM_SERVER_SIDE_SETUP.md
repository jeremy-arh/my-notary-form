# 🎯 Configuration GTM Server-Side Tagging

Guide complet pour configurer Google Tag Manager avec server-side tagging pour Plausible Analytics et Google Ads.

## ✅ Intégration Complétée

Le code GTM server-side a été intégré dans le formulaire principal (`index.html`). Tous les appels passent désormais par votre serveur de taggage.

## 📋 Informations de Configuration

- **Container ID**: `GTM-TG3V3SNR`
- **URL du serveur de taggage**: `https://server-side-tagging-ov64j5aixa-uc.a.run.app`
- **Configuration du conteneur**: `aWQ9R1RNLVRHM1YzU05SJmVudj0xJmF1dGg9VmNuWnRrMGgzMjJyVmFSVExnLWh5UQ==`

## 🔧 Configuration dans Google Tag Manager

### Étape 1 : Vérifier le Client Container Web

1. Allez dans **GTM** → **Clients**
2. Vérifiez que le client "Client Container Web" existe
3. Si nécessaire, créez un nouveau client :
   - **Nom**: "Client Container Web"
   - **Type**: Web
   - **Configuration**:
     - Tag Server URL: `https://server-side-tagging-ov64j5aixa-uc.a.run.app`
     - Container ID: `GTM-TG3V3SNR`

### Étape 2 : Configurer Plausible Analytics

1. Allez dans **Balises** → **Nouvelle balise**
2. **Nom**: "Plausible Analytics - Server-Side"
3. **Type**: HTTP Request
4. **Configuration**:
   - **URL**: `https://plausible.io/api/event`
   - **Méthode**: POST
   - **Requête Body**:
     ```
     {
       "domain": "mynotary.io",
       "name": "{{Event Name}}",
       "url": "{{Page URL}}",
       "referrer": "{{Page Referrer}}",
       "screen_width": "{{Screen Width}}"
     }
     ```
5. **Déclencheur**: Toutes les pages
6. **Paramètres avancés**:
   - **Headers**:
     - `Content-Type`: `application/json`
     - `User-Agent`: `{{User Agent}}`

**Note**: Vous devrez peut-être créer des variables personnalisées pour les données de page.

### Étape 3 : Configurer Google Ads (Conversion Tracking)

1. Allez dans **Balises** → **Nouvelle balise**
2. **Nom**: "Google Ads - Conversion Tracking"
3. **Type**: Google Ads : Suivi des conversions
4. **Configuration**:
   - **ID de conversion**: (votre ID de conversion Google Ads)
   - **Libellé de conversion**: (votre libellé)
   - **Valeur de conversion**: (variable ou valeur fixe)
   - **Devise**: EUR
5. **Déclencheur**: Créez un déclencheur personnalisé pour les conversions (ex: paiement réussi)

### Étape 4 : Configurer Google Ads (Remarketing)

1. Allez dans **Balises** → **Nouvelle balise**
2. **Nom**: "Google Ads - Remarketing"
3. **Type**: Google Ads : Remarketing
4. **Configuration**:
   - **ID de conversion**: (votre ID Google Ads)
5. **Déclencheur**: Toutes les pages

### Étape 5 : Créer des Variables Personnalisées

Créez les variables suivantes dans **Variables** → **Nouvelle variable**:

1. **Page URL**
   - Type: Variable intégrée → URL de la page
   - Nom: `{{Page URL}}`

2. **Page Referrer**
   - Type: Variable intégrée → Référent
   - Nom: `{{Page Referrer}}`

3. **Screen Width**
   - Type: Variable intégrée → Résolution d'écran → Largeur
   - Nom: `{{Screen Width}}`

4. **User Agent**
   - Type: Variable intégrée → User Agent
   - Nom: `{{User Agent}}`

5. **Event Name** (pour les événements personnalisés)
   - Type: Variable de données de couche
   - Nom de la variable de données: `event`
   - Nom: `{{Event Name}}`

### Étape 6 : Créer des Déclencheurs Personnalisés

Créez les déclencheurs suivants dans **Déclencheurs** → **Nouveau**:

1. **Soumission de formulaire**
   - Type: Événement personnalisé
   - Nom de l'événement: `form_submit`

2. **Paiement réussi**
   - Type: Événement personnalisé
   - Nom de l'événement: `payment_success`

3. **Page de confirmation**
   - Type: Visibilité de page
   - Nom de la page: `confirmation` (ou URL contenant `/confirmation`)

## 📊 Événements Personnalisés à Implémenter

Pour suivre les conversions et événements importants, vous devrez envoyer des événements personnalisés depuis votre application React.

### Exemple d'implémentation dans React

```javascript
// Dans votre composant React après un paiement réussi
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  'event': 'payment_success',
  'value': paymentAmount,
  'currency': 'EUR',
  'transaction_id': transactionId
});

// Pour une soumission de formulaire
window.dataLayer.push({
  'event': 'form_submit',
  'form_type': 'notary_service'
});
```

## 🧪 Test et Validation

### 1. Mode Aperçu GTM

1. Cliquez sur **Prévisualiser** dans GTM
2. Entrez l'URL de votre site (ex: `https://app.mynotary.io`)
3. Vérifiez que les tags se déclenchent correctement

### 2. Vérification des Requêtes

1. Ouvrez les outils de développement du navigateur (F12)
2. Allez dans l'onglet **Network**
3. Filtrez par `server-side-tagging-ov64j5aixa-uc.a.run.app`
4. Vérifiez que les requêtes sont envoyées vers le serveur de taggage

### 3. Vérification Plausible

1. Allez dans votre dashboard Plausible
2. Vérifiez que les événements apparaissent
3. Vérifiez que le domaine est correct (`mynotary.io`)

### 4. Vérification Google Ads

1. Allez dans Google Ads → Outils et paramètres → Conversions
2. Vérifiez que les conversions sont enregistrées
3. Utilisez Google Tag Assistant pour déboguer

## 🔒 Sécurité et Confidentialité

Avec le server-side tagging :
- ✅ Les données passent par votre serveur (plus de contrôle)
- ✅ Les cookies tiers sont évités (meilleure confidentialité)
- ✅ Conformité RGPD améliorée
- ✅ Bloqueurs de publicité moins efficaces

## 📝 Notes Importantes

1. **Domaine**: Assurez-vous que le domaine dans Plausible correspond à votre domaine de production (`mynotary.io`)

2. **CORS**: Si vous avez des problèmes CORS, vérifiez que le serveur de taggage autorise les requêtes depuis votre domaine

3. **Variables d'environnement**: Pour différents environnements (dev, staging, prod), vous pouvez utiliser des variables d'environnement pour le Container ID

4. **Debugging**: Utilisez le mode Aperçu de GTM pour déboguer avant de publier

## 🚀 Prochaines Étapes

1. ✅ Code GTM intégré dans `index.html`
2. ⏳ Configurer les tags dans GTM (Plausible, Google Ads)
3. ⏳ Créer les variables personnalisées
4. ⏳ Créer les déclencheurs personnalisés
5. ⏳ Implémenter les événements personnalisés dans React
6. ⏳ Tester en mode Aperçu
7. ⏳ Publier la version dans GTM
8. ⏳ Valider les données dans Plausible et Google Ads

## 📚 Ressources

- [Documentation GTM Server-Side](https://developers.google.com/tag-platform/tag-manager/server-side)
- [Documentation Plausible API](https://plausible.io/docs/events-api)
- [Documentation Google Ads Conversions](https://support.google.com/google-ads/answer/1722054)


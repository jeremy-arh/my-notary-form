# 🔧 Correction des Erreurs GTM Server-Side

## ⚠️ Erreur 1 : "The request headers could not be found" - Visitor Region

Cette erreur est liée à la variable "Visitor Region" qui essaie de récupérer des en-têtes de requête qui ne sont pas disponibles.

### Solution : Désactiver ou Supprimer la Variable Visitor Region

1. Dans GTM, allez dans **Variables**
2. Cherchez la variable **"Visitor Region"** (ou "Région du visiteur")
3. **Option A** : Cliquez dessus et **désactivez-la** (bouton ON/OFF)
4. **Option B** : Supprimez-la si vous ne l'utilisez pas

**Note** : Cette variable n'est généralement pas nécessaire pour Plausible Analytics.

---

## ⚠️ Erreur 2 : "getGoogleScript: Received HTTP status code 403"

Cette erreur indique que le serveur de taggage n'a pas les permissions nécessaires pour accéder aux scripts Google.

### Solution 1 : Activer les Paramètres Régionaux (Recommandé)

1. Dans GTM, allez dans **Admin** (icône engrenage en haut)
2. Cliquez sur **Container Settings** (Paramètres du conteneur)
3. Cherchez la section **"Region-specific settings"** (Paramètres spécifiques à la région)
4. **Activez** cette option
5. Sélectionnez votre région (ex: `europe-west1` ou `us-central1`)
6. **Enregistrez**

### Solution 2 : Vérifier les Permissions IAM dans Google Cloud Platform

Si l'erreur persiste après avoir activé les paramètres régionaux :

1. Allez dans **Google Cloud Platform** (console.cloud.google.com)
2. Sélectionnez le projet associé à votre serveur de taggage
3. Allez dans **IAM & Admin** → **IAM**
4. Cherchez le service account utilisé par Cloud Run (généralement `gtm-xxxxx@gtm-cloud-run.iam.gserviceaccount.com`)
5. Vérifiez qu'il a les permissions suivantes :
   - **Cloud Run Invoker**
   - **Service Account User**
   - **Storage Object Viewer** (si nécessaire)

### Solution 3 : Vérifier la Configuration du Client Container Web

1. Dans GTM, allez dans **Clients**
2. Ouvrez votre **Client Container Web**
3. Vérifiez que :
   - **Tag Server URL** est correct : `https://server-side-tagging-5wlhofq67q-uc.a.run.app`
   - **Container ID** est correct : `GTM-KRSNRSJ3`
4. **Enregistrez** si vous avez fait des modifications

---

## 🔍 Vérification des Erreurs

### Pour Visitor Region :

1. Allez dans **Variables**
2. Cherchez toutes les variables qui utilisent "Request Header" ou "En-tête de requête"
3. Vérifiez qu'elles sont correctement configurées ou désactivez celles qui ne sont pas nécessaires

### Pour l'erreur 403 :

1. Vérifiez dans **GTM Debug Mode** si l'erreur persiste
2. Si elle persiste, vérifiez les logs dans **Google Cloud Platform** :
   - Allez dans **Cloud Run**
   - Sélectionnez votre service de taggage
   - Allez dans l'onglet **Logs**
   - Cherchez les erreurs 403

---

## ✅ Checklist de Résolution

- [ ] Variable "Visitor Region" désactivée ou supprimée
- [ ] Paramètres régionaux activés dans Container Settings
- [ ] Permissions IAM vérifiées dans Google Cloud Platform
- [ ] Client Container Web correctement configuré
- [ ] Erreurs disparues dans GTM Debug Mode

---

## 📝 Notes Importantes

1. **Visitor Region** : Cette variable n'est généralement pas nécessaire. Vous pouvez la désactiver en toute sécurité.

2. **Erreur 403** : Souvent causée par :
   - Paramètres régionaux non activés
   - Permissions IAM manquantes
   - Service account mal configuré

3. **Impact** : Ces erreurs peuvent empêcher certaines fonctionnalités de fonctionner, mais ne devraient pas bloquer complètement le tracking.

---

## 🚀 Après les Corrections

Une fois les corrections appliquées :

1. **Rechargez votre site** (Ctrl+F5)
2. **Vérifiez dans GTM Debug Mode** que les erreurs ont disparu
3. **Testez la navigation** sur votre site
4. **Vérifiez que les événements apparaissent** dans GTM Debug Mode

---

## 🔗 Documentation Officielle

- [GTM Server-Side - Region-specific settings](https://developers.google.com/tag-platform/tag-manager/server-side/enable-region-specific-settings)
- [GTM Server-Side - Troubleshooting](https://developers.google.com/tag-platform/tag-manager/server-side/troubleshooting)


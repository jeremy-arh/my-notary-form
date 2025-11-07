# Configuration Google Maps API

## ⚠️ Erreur "ApiNotActivatedMapError"

Cette erreur indique que les APIs Google Maps ne sont pas activées dans votre projet Google Cloud.

## 📋 Étapes pour activer les APIs

1. **Accédez à Google Cloud Console**
   - Allez sur [console.cloud.google.com](https://console.cloud.google.com)
   - Sélectionnez votre projet (ou créez-en un nouveau)

2. **Activez les APIs requises**
   - Allez dans **APIs & Services** → **Library**
   - Recherchez et activez les APIs suivantes :
     - ✅ **Places API** (pour l'autocomplétion d'adresses)
     - ✅ **Time Zone API** (pour la timezone précise)
     - ✅ **Maps JavaScript API** (optionnel, mais recommandé)

3. **Vérifiez vos credentials**
   - Allez dans **APIs & Services** → **Credentials**
   - Vérifiez que votre clé API est bien créée
   - Assurez-vous que les restrictions d'API sont correctement configurées

4. **Vérifiez les quotas**
   - Allez dans **APIs & Services** → **Dashboard**
   - Vérifiez que les APIs sont bien activées et que les quotas ne sont pas dépassés

## 🔑 Restrictions de la clé API (Recommandé)

Pour la sécurité, restreignez votre clé API :

1. **Restrictions d'application**
   - **Application restrictions** : Sélectionnez "HTTP referrers"
   - Ajoutez vos domaines :
     - `http://localhost:5174/*` (pour le développement admin)
     - `http://localhost:5175/*` (pour le développement notary)
     - Votre domaine de production (ex: `https://votredomaine.com/*`)

2. **Restrictions d'API**
   - **API restrictions** : Sélectionnez "Restrict key"
   - Sélectionnez uniquement :
     - Places API
     - Time Zone API
     - Maps JavaScript API (si utilisé)

## ✅ Vérification

Après activation, attendez quelques minutes puis testez à nouveau. Les APIs peuvent prendre jusqu'à 5 minutes pour être complètement activées.

## 💰 Coûts

- **Places API** : Payant après le quota gratuit (généralement $17 par 1000 requêtes)
- **Time Zone API** : Payant après le quota gratuit (généralement $5 par 1000 requêtes)
- Voir [Google Maps Platform Pricing](https://cloud.google.com/maps-platform/pricing) pour plus de détails

## 🆘 Dépannage

Si l'erreur persiste :
1. Vérifiez que la clé API est correcte dans votre fichier `.env`
2. Vérifiez que les APIs sont bien activées (pas seulement créées)
3. Vérifiez les restrictions de la clé API
4. Attendez quelques minutes après l'activation
5. Vérifiez la console du navigateur pour d'autres erreurs


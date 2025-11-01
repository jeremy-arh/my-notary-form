# Shared Assets

Ce dossier contient les assets partagés utilisés dans toute l'application (client-dashboard, notary-admin, et root).

## Logo

### Comment remplacer le logo

1. **Remplacez le fichier `logo-noir.svg`** avec votre propre logo
   - Le fichier doit s'appeler exactement `logo-noir.svg`
   - Format recommandé : SVG
   - Dimensions recommandées : 120x120px (ou ratio 1:1)

2. **Le logo sera automatiquement utilisé partout** :
   - Client Portal (Login & Dashboard)
   - Notary Panel (Login & Dashboard)
   - Admin Panel (Login & Dashboard)
   - Formulaire principal

### Composant Logo

Le composant `Logo.jsx` est utilisé dans toute l'application. Il accepte les props suivantes :

```jsx
import { Logo } from '../../shared/assets';

// Utilisation
<Logo width={120} height={120} className="custom-class" />
```

**Props disponibles :**
- `width` : Largeur du logo (défaut: 80)
- `height` : Hauteur du logo (défaut: 80)
- `className` : Classes CSS personnalisées

### Emplacements d'utilisation

Le logo est utilisé dans les fichiers suivants :
- `client-dashboard/src/components/ClientLayout.jsx`
- `client-dashboard/src/components/NotaryForm.jsx`
- `client-dashboard/src/pages/client/Login.jsx`
- `notary-admin/src/components/admin/AdminLayout.jsx`
- `notary-admin/src/pages/admin/Login.jsx`
- `src/components/NotaryForm.jsx`
- `src/components/admin/AdminLayout.jsx`
- `src/pages/admin/Login.jsx`

**Note :** Tous ces fichiers importent le logo depuis `shared/assets`, donc toute modification du fichier `logo-noir.svg` sera automatiquement reflétée partout.

# Déploiement Vercel - Client Dashboard Next.js

## Problème résolu

**Erreur :** `No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies"`

**Cause :** Le dépôt `user-dashboard` est un monorepo. Vercel utilise la racine par défaut, où le `package.json` est un projet **Vite** (sans Next.js). L'application Next.js se trouve dans le sous-dossier `client-dashboard-next/`.

## Solution : configurer le Root Directory

### Étapes dans le dashboard Vercel

1. Allez sur [vercel.com](https://vercel.com) et ouvrez votre projet
2. Cliquez sur **Settings** (Paramètres)
3. Dans le menu latéral, cliquez sur **General**
4. Trouvez la section **Root Directory**
5. Cliquez sur **Edit** à côté de "Root Directory"
6. Saisissez : `client-dashboard-next`
7. Cliquez sur **Save**
8. **Redéployez** le projet (Deployments → ⋮ sur le dernier déploiement → Redeploy)

### Schéma de la structure

```
user-dashboard/                    ← Vercel regarde ici par défaut (package.json Vite)
├── package.json                   ← Projet Vite (pas Next.js) ❌
├── src/
├── client-dashboard-next/        ← C'est ici qu'est l'app Next.js ✅
│   ├── package.json              ← Contient Next.js
│   ├── vercel.json
│   └── ...
└── ...
```

En configurant le Root Directory à `client-dashboard-next`, Vercel utilisera le bon `package.json` et détectera Next.js correctement.

## Variables d'environnement

Assurez-vous d'ajouter les variables nécessaires dans **Settings → Environment Variables** :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Variables Stripe si utilisées
- Toute autre variable utilisée par l'application

## Vérification

Après le redéploiement, le build devrait afficher :

```
✓ Detected Next.js version: 14.2.35
✓ Running "npm run build"
```

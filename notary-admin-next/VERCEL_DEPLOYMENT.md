# Déploiement du Back-Office sur Vercel

## ⚠️ Configuration OBLIGATOIRE (monorepo)

Votre dépôt `my-notary-form` est un **monorepo**. La racine contient un projet Vite, pas Next.js.

### 1. Root Directory (CRITIQUE)

Dans **Vercel** → **Project Settings** → **General** → **Root Directory** :

- Cliquez sur **Edit**
- Saisissez : `notary-admin-next`
- Cliquez sur **Save**

Sans cela, Vercel tentera de builder le projet Vite à la racine et le déploiement échouera.

---

## 2. Variables d'environnement

Dans **Vercel** → **Project Settings** → **Environment Variables**, ajoutez :

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL de votre projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clé anonyme Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé service role (pour le BO admin) |
| `NEXT_PUBLIC_APP_URL` | Recommandé | URL publique (ex: `https://admin.votredomaine.com`) |
| `SENDGRID_API_KEY` | Optionnel | Pour les emails |
| `SENDGRID_FROM_EMAIL` | Optionnel | Email expéditeur |
| `SENDGRID_FROM_NAME` | Optionnel | Nom expéditeur |
| `TWILIO_ACCOUNT_SID` | Optionnel | Pour les SMS |
| `TWILIO_AUTH_TOKEN` | Optionnel | Pour les SMS |
| `TWILIO_PHONE_NUMBER` | Optionnel | Numéro Twilio |

**Important** : Cochez **Production**, **Preview** et **Development** pour chaque variable.

---

## 3. Build & Output

- **Framework Preset** : Next.js (détecté automatiquement)
- **Build Command** : `npm run build` (par défaut)
- **Output Directory** : `.next` (par défaut)
- **Install Command** : `npm install` (par défaut)

---

## 4. Vérification avant déploiement

En local, dans le dossier `notary-admin-next` :

```bash
cd notary-admin-next
npm install
npm run build
```

Si le build passe en local, il passera sur Vercel (à condition que Root Directory soit bien configuré).

---

## 5. Erreurs fréquentes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `vite build` ou erreur Vite | Root Directory non configuré | Définir Root Directory = `notary-admin-next` |
| `Missing SUPABASE_SERVICE_ROLE_KEY` | Variable manquante | Ajouter dans Vercel Environment Variables |
| Build timeout | Dépendances lourdes | Vercel a un timeout de 15 min, normalement suffisant |
| 500 sur les pages | Variables d'env manquantes au runtime | Vérifier que toutes les variables sont définies |

---

## 6. Déploiement via Git

1. Connectez votre repo GitHub/GitLab/Bitbucket à Vercel
2. **Root Directory** : `notary-admin-next`
3. Ajoutez les variables d'environnement
4. Déployez

Chaque push sur la branche principale déclenchera un nouveau déploiement.

# My Notary — Back-Office (Next.js 14)

Back-office admin refait avec Next.js 14 App Router, Supabase, shadcn/ui et Tailwind CSS.

## Stack

- **Framework** : Next.js 14 (App Router, SSR)
- **Base de données** : Supabase (PostgreSQL)
- **Auth** : Supabase Auth + middleware Next.js
- **UI** : shadcn/ui + Tailwind CSS
- **Icônes** : Iconify (`@iconify/react`)
- **Notifications** : Sonner (toasts)

## Démarrage

```bash
npm install
cp .env.local.example .env.local
# Remplir les variables Supabase dans .env.local
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Structure

- `/login` — Connexion
- `/dashboard/kpis` — KPIs et revenus
- `/dashboard/crm` — Pipeline + Clients
- `/dashboard/orders` — Commandes
- `/dashboard/communications` — Emails + SMS
- `/dashboard/settings` — Paramètres

## Migration depuis l'ancien BO

L'ancien back-office (Vite + React) est conservé dans `notary-admin-old` (si renommé). Ce projet utilise les mêmes tables Supabase (`submission`, `client`, `admin_user`, etc.) — aucune nouvelle table.

## Variables d'environnement

Voir `.env.local.example` pour la liste complète.

# Notary Dashboard

Dashboard dédié aux notaires pour gérer leurs soumissions et rendez-vous.

## Installation

```bash
npm install
```

## Configuration

Créez un fichier `.env` à la racine du projet avec :

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Développement

```bash
npm run dev
```

Le dashboard sera accessible sur `http://localhost:5175`

## Fonctionnalités

- **Login/Reset Password** : Authentification pour les notaires
- **Dashboard** : 
  - Calendrier/Agenda des appointments acceptés
  - Vue table des appointments
  - Liste des payouts
  - Total des revenus
  - Liste des nouvelles soumissions (non assignées)
  - Acceptation de soumissions (premier arrivé)
- **Submission Detail** : Consultation complète d'une soumission (sans email/phone)
- **Messages** : Conversations avec les clients
- **Profile** : Gestion du profil notaire


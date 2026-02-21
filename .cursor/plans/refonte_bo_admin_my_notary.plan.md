---
name: Refonte BO Admin My Notary
overview: "Refonte complète du back-office admin (notary-admin) : migration de Vite/React vers Next.js 14 App Router, architecture avec Supabase, shadcn/ui. Utilisation exclusive des tables existantes (submission, client, etc.) et des API backend Next.js (aucune Edge Function)."
todos:
  - id: migrations
    content: Migration optionnelle admin_user (rôle viewer) — aucune nouvelle table
    status: pending
  - id: scaffold
    content: Scaffold Next.js 14 + Tailwind + shadcn/ui + dépendances (TanStack Table, Highcharts, etc.)
    status: pending
  - id: auth-layout
    content: Auth + Layout responsive (Sidebar drawer mobile) + Design system
    status: pending
  - id: kpis
    content: "Page KPIs : StatCards, graphiques Highcharts, filtres période"
    status: pending
  - id: orders
    content: "Page Commandes : OrdersTable, fiche soumission organisée (onglets), responsive"
    status: pending
  - id: crm-pipeline
    content: "CRM Pipeline : Kanban @dnd-kit, SubmissionModal organisé (onglets), responsive"
    status: pending
  - id: crm-clients
    content: "CRM Clients : ClientsTable, fiche client organisée (onglets, liens soumissions), responsive"
    status: pending
  - id: communications
    content: "Communications : EmailComposer, SmsComposer, API routes SendGrid/Twilio (backend uniquement)"
    status: pending
  - id: settings
    content: "Paramètres : utilisateurs, config SendGrid/Twilio, labels stages pipeline, templates"
    status: pending
isProject: false
---

# Plan — Refonte intégrale du BO Admin My Notary

## Contexte actuel vs cible

| Aspect     | Actuel                           | Cible                                          |
| ---------- | -------------------------------- | ---------------------------------------------- |
| Framework  | Vite 7 + React 19 + React Router | Next.js 14 App Router (SSR)                    |
| UI         | Tailwind 4, composants custom    | shadcn/ui + Tailwind CSS                       |
| Charts     | Chart.js, Recharts               | Highcharts                                     |
| Tables     | Custom                           | TanStack Table v8                              |
| DnD        | @dnd-kit (déjà présent)          | @dnd-kit/core                                  |
| Emails/SMS | Supabase Edge Functions          | API routes Next.js (SendGrid + Twilio direct)   |

---

## 1. Architecture et mapping des données

### Tables existantes uniquement — aucune nouvelle table

- **`submission`** → Commandes/Dossiers ET Pipeline (cartes du Kanban). Colonne `funnel_status` = stage du pipeline.
- **`client`** → Clients (avec `crm_status` : new, contacted, qualified, proposal, negotiation, won, lost)
- **`admin_user`** → Utilisateurs admin
- **`submission_activity_log`** → Timeline / historique des actions
- **`submission_internal_notes`** → Notes internes
- **`submission_files`** → Documents
- **`email_sent`**, **`sms_sent`**, **`email_events`**, **`sms_events`** → Historique communications

### Pipeline = submissions avec funnel_status

Le Kanban affiche les **submissions** regroupées par `funnel_status`. Valeurs actuelles : `started`, `services_selected`, `documents_uploaded`, `delivery_method_selected`, `personal_info_completed`, `summary_viewed`, `payment_pending`, `payment_completed`, `submission_completed`.

Labels UI configurables dans les paramètres (ex. "Démarrage" → "Nouveau lead").

---

## 2. UX et ergonomie

### Fiches clients et soumissions — organisation et navigation

- **Structure claire** : sections bien délimitées (infos, timeline, documents, communications, notes) avec onglets ou accordéons pour éviter le scroll excessif
- **Navigation rapide** : liens directs client ↔ soumission, breadcrumb, actions contextuelles (email, SMS) accessibles en 1 clic
- **Hiérarchie visuelle** : informations prioritaires en tête (nom, statut, montant), détails secondaires repliables
- **Recherche et filtres** : barre de recherche persistante, filtres rapides (statut, date) pour retrouver une fiche rapidement
- **Raccourcis** : accès direct aux actions fréquentes (envoyer email, changer statut) sans ouvrir de sous-modale

### Responsive — BO parfaitement adapté

- **Mobile-first** : layout pensé pour mobile, puis adapté tablette et desktop
- **Sidebar** : repliable/drawer sur mobile, fixe sur desktop
- **Tables** : vue cartes sur mobile, tableau sur tablette/desktop ; colonnes prioritaires conservées sur petit écran
- **Pipeline Kanban** : scroll horizontal par colonne sur mobile, vue complète sur grand écran
- **Modales** : plein écran sur mobile, centrées sur desktop
- **Touch-friendly** : zones de clic ≥ 44px, espacement adapté au doigt
- **Breakpoints** : sm (640px), md (768px), lg (1024px), xl (1280px) — tests sur tous les viewports

---

## 3. Stratégie d'implémentation

### Phase 1 — Fondations

1. **Scaffold Next.js 14** — App Router, Tailwind, TypeScript, shadcn/ui, Iconify, TanStack Table, Highcharts, React Hook Form, Zod, Zustand, Sonner, date-fns, @dnd-kit
2. **Supabase** — client.ts, server.ts, middleware.ts, protection routes `/(dashboard)/*`
3. **Auth** — Page login Supabase (email/password), redirect `/dashboard/kpis`
4. **Layout** — Sidebar (fond noir, drawer sur mobile), Header, MobileNav, design system glassmorphism. **Responsive** : breakpoints Tailwind, viewport meta, tests mobile/tablette/desktop

### Phase 2 — KPIs et Commandes

5. **Page KPIs** — StatCards (revenus, commandes, conversion, submissions en cours), Highcharts (revenus, pie, funnel), filtres période. Grille responsive (1 col mobile → 4 cols desktop).
6. **Page Commandes** — TanStack Table (vue cartes sur mobile). **Fiche soumission [id]** : onglets (Résumé | Timeline | Documents | Notes), actions rapides (email, SMS, statut), lien vers client, breadcrumb. Layout responsive.

### Phase 3 — CRM (Pipeline + Clients)

7. **Pipeline Kanban** — PipelineBoard, PipelineColumn, SubmissionCard (draggable). Chaque carte = une submission. **SubmissionModal** : onglets/accordéons (Infos | Timeline | Documents | Communications | Notes), actions rapides visibles, navigation client ↔ soumission. Scroll horizontal colonnes sur mobile.
8. **Clients** — ClientsTable (vue cartes sur mobile), **fiche client** : sections claires (Infos | Submissions | Communications | Notes), liens directs vers chaque soumission, breadcrumb, responsive (drawer/modal plein écran sur mobile)

### Phase 4 — Communications

**API backend Next.js uniquement — aucune Edge Function.**

9. **Emails** — `app/api/emails/send/route.ts` : appel direct SendGrid API. EmailComposer, TemplateSelector (`{{first_name}}`, `{{submission_title}}`)
10. **SMS** — `app/api/sms/send/route.ts` : appel direct Twilio API. `app/api/sms/webhook/route.ts` : réception SMS entrants
11. **Page Communications** — EmailComposer, SmsComposer, CommunicationHistoryTable

### Phase 5 — Paramètres

12. **Page Settings** — Utilisateurs admin (super_admin/admin/viewer), config SendGrid/Twilio, labels stages pipeline (funnel_status → libellé), templates email/SMS, services, pays, submission rotting

---

## 4. Décisions techniques

### Emails/SMS : API backend Next.js uniquement

- **Aucune Edge Function** : tout passe par les API routes Next.js (`/api/emails/send`, `/api/sms/send`)
- SendGrid et Twilio appelés directement depuis les routes
- Les Edge Functions existantes (abandoned cart, etc.) restent côté Supabase pour les crons — le BO n'y fait pas appel

---

## 5. Structure des fichiers cible

```
notary-admin/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx, page.tsx (redirect /kpis)
│   │   ├── kpis/page.tsx
│   │   ├── crm/page.tsx
│   │   ├── orders/page.tsx, orders/[id]/page.tsx
│   │   ├── communications/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── orders/route.ts
│   │   ├── clients/route.ts
│   │   ├── pipeline/submissions/route.ts
│   │   ├── pipeline/move/route.ts
│   │   ├── emails/send/route.ts
│   │   └── sms/send/route.ts, sms/webhook/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/, layout/, crm/, orders/, kpis/, communications/
├── lib/supabase/
├── hooks/useOrders.ts, useClients.ts, usePipeline.ts, useSubmissions.ts, useKpis.ts
├── types/index.ts
└── middleware.ts
```

---

## 6. Migrations Supabase

**Aucune nouvelle table.** Tables existantes uniquement.

Optionnel : migration pour ajouter le rôle `viewer` à `admin_user` (ALTER constraint sur `role`).

---

## 7. Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
SENDGRID_FROM_NAME=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## 8. Ordre d'exécution

1. Scaffold Next.js + config
2. Auth + layout + design system
3. KPIs
4. Commandes (orders)
5. CRM Pipeline
6. CRM Clients
7. Communications
8. Paramètres

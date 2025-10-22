# Client Dashboard

Dashboard for clients to manage their notary service requests.

## Features

- Magic Link Authentication (passwordless)
- View all submitted requests
- Track request status (pending/accepted/rejected)
- Download signed documents
- Message with assigned notary
- Submit new requests

## Tech Stack

- React 19.1.1
- Vite 7.1.7 (port 5175)
- React Router DOM 7.9.4
- Tailwind CSS 4.1.15
- Supabase (Auth + Database)

## Setup

```bash
cd client-dashboard
npm install
cp .env.example .env
# Add your Supabase credentials to .env
npm run dev
```

Open http://localhost:5175

## Authentication

Clients receive a magic link email when they submit the form. They can click the link to access their dashboard without needing a password.

## Database

Requires the `client` table from `supabase-messaging-migration.sql`.

Each client is linked to their submissions via `submission.client_id`.

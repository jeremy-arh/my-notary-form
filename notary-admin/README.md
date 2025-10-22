# Notary Admin Panel

Admin panel for managing notary service requests. This application runs separately from the main form and provides notaries with tools to manage submissions, track revenue, and handle their profile.

## Features

- **Dashboard**: View statistics, pending requests, and revenue tracking
- **Submissions Management**: View, search, filter, and manage all notary requests
- **Request Details**: View detailed information about each submission
- **Status Management**: Accept or reject notary requests
- **Document Upload**: Upload signed documents for approved requests
- **Profile Management**: Update notary profile information
- **Authentication**: Secure login with Supabase Auth

## Tech Stack

- React 19.1.1
- Vite 7.1.7
- React Router DOM 7.9.4
- Tailwind CSS 4.1.15
- Supabase (Auth, Database, Storage)
- Iconify React (Heroicons)

## Prerequisites

- Node.js 18+ and npm
- Supabase project with the required schema (see database setup below)

## Installation

1. Clone the repository or navigate to the notary-admin directory:
   ```bash
   cd notary-admin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Database Setup

The admin panel requires the following Supabase tables:
- `submission` - Stores notary service requests
- `notary` - Stores notary profile information
- `document` - Stores uploaded documents

Make sure to run the migration scripts from the main form project:
1. `supabase-schema.sql` - Initial schema
2. `supabase-admin-migration.sql` - Admin-specific features

Refer to `ADMIN_SETUP.md` in the main project for detailed database setup instructions.

## Running the Application

### Development Mode

Start the development server on port 5174:

```bash
npm run dev
```

The application will be available at `http://localhost:5174`

### Production Build

Build the application for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```
notary-admin/
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminLayout.jsx        # Main layout with sidebar
│   │   │   └── SubmissionDetailModal.jsx  # Modal for submission details
│   │   └── PrivateRoute.jsx           # Authentication guard
│   ├── pages/
│   │   └── admin/
│   │       ├── Login.jsx              # Login page
│   │       ├── Dashboard.jsx          # Dashboard with stats
│   │       ├── Submissions.jsx        # Submissions table
│   │       └── Profile.jsx            # Profile management
│   ├── lib/
│   │   └── supabase.js                # Supabase client
│   ├── App.jsx                        # Main app with routing
│   ├── index.css                      # Global styles
│   └── main.jsx                       # Entry point
├── .env.example                       # Environment variables template
├── vite.config.js                     # Vite configuration (port 5174)
└── package.json                       # Dependencies
```

## Routes

- `/` - Redirects to login
- `/login` - Admin login page
- `/dashboard` - Dashboard (protected)
- `/submissions` - Submissions list (protected)
- `/profile` - Profile management (protected)

## Authentication

The application uses Supabase Auth for authentication. Notaries must sign in with their email and password.

To create an admin user:
1. Sign up a user in your Supabase project
2. Add a corresponding entry in the `notary` table with the user's ID

## Port Configuration

This application runs on port **5174** to avoid conflicts with the main form application which runs on port 5173.

To change the port, edit `vite.config.js`:

```javascript
export default defineConfig({
  server: {
    port: YOUR_PORT,
  },
})
```

## Styling

The application uses the same design system as the main form:
- Background: #FFFFFF
- Content blocks: #F3F4F6
- Black buttons with glassy effect
- TASA Orbiter font
- Gray/black icons only (no colored icons)

## Related Projects

- **Notary Form** (`/home/user/my-notary-form`) - Main customer-facing form running on port 5173

## Troubleshooting

### Blank page on load
- Check browser console for errors
- Verify Supabase credentials in `.env`
- Ensure database schema is properly set up

### Authentication not working
- Verify Supabase Auth is enabled
- Check that the notary table has an entry for your user
- Clear browser localStorage and try again

### Port already in use
- Make sure no other application is using port 5174
- Change the port in `vite.config.js` if needed

## License

Private project

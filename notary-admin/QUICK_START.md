# Quick Start Guide - Admin Dashboard

## ⚡ Quick Setup

### 1. Create `.env` file

Create a `.env` file in the `notary-admin/` directory:

```bash
cd notary-admin
cp .env.example .env
```

### 2. Configure Supabase credentials

Edit the `.env` file and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to find these values:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `VITE_SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep this secret!**

### 3. Install dependencies and start

```bash
npm install
npm run dev
```

### 4. Verify configuration

After starting the dev server, check the browser console. You should see:
```
✅ Valid credentials: true
✅ Creating Supabase client...
```

If you see `⚠️ SUPABASE NOT CONFIGURED`, make sure:
- The `.env` file exists in `notary-admin/` directory
- Variable names start with `VITE_`
- No spaces around the `=` sign
- You restarted the dev server after creating/modifying `.env`

## 🔒 Security Note

- Never commit `.env` to Git (it's already in `.gitignore`)
- The `SERVICE_ROLE_KEY` bypasses all security - keep it secret!
- Only use it for admin dashboards on secure domains


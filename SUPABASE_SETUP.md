# Supabase Setup Guide

This guide will help you set up Supabase for the Notary Service Request Form.

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in or create a new account
3. Click "New Project"
4. Fill in the project details:
   - Name: `notary-service-form` (or your preferred name)
   - Database Password: Create a strong password
   - Region: Choose the closest to your users
5. Click "Create new project"

## Step 2: Run the Database Schema

1. In your Supabase project dashboard, go to the **SQL Editor**
2. Click "New Query"
3. Copy the entire content of `supabase-schema.sql` file
4. Paste it into the SQL Editor
5. Click "Run" to execute the schema

This will create all necessary tables:
- `notary` - Notary information
- `services` - Available services
- `options` - Additional service options
- `submission` - Form submissions
- `submission_services` - Services selected for each submission
- `submission_options` - Options selected for each submission
- `submission_files` - Uploaded files

## Step 3: Set Up Storage for File Uploads

1. In your Supabase project, go to **Storage**
2. Click "Create a new bucket"
3. Name it: `submission-documents`
4. Make it **Public** (check the public checkbox)
5. Click "Create bucket"

### Configure Storage Policies

1. Click on the `submission-documents` bucket
2. Go to "Policies"
3. Create a new policy:
   - **Name**: Allow public uploads
   - **Policy command**: INSERT
   - **Target roles**: public
   - **USING expression**: `true`
   - Click "Review" then "Save policy"

4. Create another policy:
   - **Name**: Allow public downloads
   - **Policy command**: SELECT
   - **Target roles**: public
   - **USING expression**: `true`
   - Click "Review" then "Save policy"

## Step 4: Get Your Supabase Credentials

1. In your project dashboard, click the **Settings** icon (⚙️)
2. Go to **API**
3. Copy the following values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (a long JWT token)

## Step 5: Configure Your Application

1. Create a `.env` file in the root of your project:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

3. **IMPORTANT**: Never commit `.env` to Git. It's already in `.gitignore`.

## Step 6: Test the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the application in your browser
3. Try submitting a form
4. Check your Supabase dashboard to see if the data was saved:
   - Go to **Table Editor**
   - View the `submission` table

## Database Schema Overview

### Tables

**notary**
- Stores notary professional information
- Fields: name, email, phone, address, license_number, etc.

**services**
- Catalog of available notary services
- Pre-populated with 8 common services
- Fields: service_id, name, description, icon, base_price

**options**
- Additional service options (urgent, home visit, etc.)
- Pre-populated with 4 options
- Fields: option_id, name, description, additional_price

**submission**
- Main table for form submissions
- Fields: appointment details, personal info, status, assigned_notary_id

**submission_services** (Junction table)
- Links submissions to selected services
- Many-to-many relationship

**submission_options** (Junction table)
- Links submissions to selected options
- Many-to-many relationship

**submission_files**
- Stores metadata for uploaded files
- Links to actual files in Storage

## Row Level Security (RLS)

The schema includes RLS policies that:
- Allow public read access to active services and options
- Allow public insert for new submissions
- Protect sensitive data

You can customize these policies in the Supabase dashboard under **Authentication > Policies**.

## Querying Data

You can query your data in the **SQL Editor**:

```sql
-- View all submissions
SELECT * FROM submission ORDER BY created_at DESC;

-- View a submission with all related data
SELECT
  s.*,
  json_agg(DISTINCT srv.*) as services,
  json_agg(DISTINCT opt.*) as options,
  json_agg(DISTINCT f.*) as files
FROM submission s
LEFT JOIN submission_services ss ON s.id = ss.submission_id
LEFT JOIN services srv ON ss.service_id = srv.id
LEFT JOIN submission_options so ON s.id = so.submission_id
LEFT JOIN options opt ON so.option_id = opt.id
LEFT JOIN submission_files f ON s.id = f.submission_id
WHERE s.id = 'your-submission-id'
GROUP BY s.id;
```

## Next Steps

1. Customize the services and options in the database
2. Add authentication if needed
3. Create admin dashboard to manage submissions
4. Set up email notifications using Supabase Edge Functions

## Troubleshooting

**Error: "Invalid API key"**
- Check that your `.env` file has the correct credentials
- Restart your dev server after changing `.env`

**Error: "relation does not exist"**
- Make sure you ran the `supabase-schema.sql` in the SQL Editor

**Files not uploading**
- Check that the `submission-documents` bucket exists and is public
- Verify the storage policies are set correctly

**No data appearing in tables**
- Check browser console for errors
- Verify RLS policies allow inserts
- Check the Network tab for failed requests

## Support

For more information, visit:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

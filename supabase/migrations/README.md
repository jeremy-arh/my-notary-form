# Database Migrations

This directory contains SQL migrations for the Supabase database.

## 🚀 How to Run Migrations

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the contents of the migration file you want to run
6. Paste it into the SQL editor
7. Click **Run** (or press Ctrl/Cmd + Enter)

### Option 2: Via Supabase CLI

```bash
# Make sure you're in the project root
cd /path/to/my-notary-form

# Make sure you're linked to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db push

# Or apply a specific migration
psql postgresql://USER:PASSWORD@HOST:PORT/DATABASE -f supabase/migrations/20251101_add_data_column_to_submission.sql
```

## 📋 Current Migrations

### `20251101_add_data_column_to_submission.sql`

**Purpose**: Adds a `data` column to the `submission` table to store form data, payment info, and other metadata as JSON.

**What it does**:
- Adds `data JSONB` column if it doesn't exist
- Sets default value to empty JSON object `{}`
- Creates GIN index for efficient JSON queries
- Creates index on payment status for filtering

**Required for**: Stripe payment integration and form submissions

**Run this migration if you see error**:
```
Could not find the 'data' column of 'submission' in the schema cache
```

## 🧪 Verify Migration

After running the migration, verify it worked:

```sql
-- Check if data column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'submission' AND column_name = 'data';

-- Should return: data | jsonb
```

## 📝 Notes

- Migrations are run in chronological order based on filename
- Each migration should be idempotent (safe to run multiple times)
- Always test migrations in a development environment first
- Back up your database before running migrations in production

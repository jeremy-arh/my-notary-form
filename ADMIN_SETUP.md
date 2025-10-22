# Admin Panel Setup Guide

This guide explains how to set up and use the admin panel for the Notary Service Request application.

## Features

The admin panel provides the following features for notaries:

1. **Dashboard**
   - View statistics (total, pending, accepted, rejected submissions)
   - Track revenue (total and monthly)
   - See recent submissions

2. **Submissions Management**
   - View all submissions in a table
   - Search by name or email
   - Filter by status (pending, accepted, rejected)
   - Click on any submission to view details
   - Accept or reject submissions
   - Upload additional documents

3. **Profile Management**
   - Update personal information
   - Manage license number
   - Add professional bio

## Setup Instructions

### 1. Database Migration

Run the admin migration SQL script in your Supabase SQL editor:

```bash
# Execute the contents of supabase-admin-migration.sql in Supabase
```

This will:
- Add required columns to the notary table
- Add status column to submission table
- Create necessary indexes
- Set up Row Level Security policies
- Create triggers for automatic timestamps

### 2. Create Admin User

Create an admin user in Supabase Authentication:

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add user"
4. Enter email and password
5. Confirm the email (in production, send confirmation email)

### 3. Access the Admin Panel

Navigate to `/admin/login` and sign in with your admin credentials.

## Routes

- `/admin/login` - Login page (public)
- `/admin/dashboard` - Main dashboard (protected)
- `/admin/submissions` - Submissions table (protected)
- `/admin/profile` - Profile settings (protected)

## Default Credentials

For development/testing, you can create a user with:
- Email: admin@notary.com
- Password: (set your own secure password)

## Submission Statuses

- **Pending**: New submission awaiting review
- **Accepted**: Submission has been accepted by the notary
- **Rejected**: Submission has been rejected

## Revenue Calculation

The revenue is calculated based on:
- Base notary service fee: $75.00
- Only accepted submissions are counted
- Monthly revenue shows current month's accepted submissions

## Security

- All admin routes are protected by authentication
- Row Level Security policies ensure data access control
- Admins can only access authenticated endpoints
- Profile data is scoped to the logged-in user

## Usage Tips

1. **Dashboard**: Start here to get an overview of your business
2. **Submissions**: Use filters and search to find specific submissions quickly
3. **Detail View**: Click on any submission to see full details and take action
4. **Documents**: Upload additional documents directly from the submission detail modal
5. **Profile**: Keep your information up to date for client communication

## Troubleshooting

### Can't log in
- Ensure the user exists in Supabase Authentication
- Check that your Supabase credentials in `.env` are correct
- Verify the database migration ran successfully

### Submissions not showing
- Check that submissions exist in the database
- Verify RLS policies are set up correctly
- Check browser console for errors

### Documents not uploading
- Ensure the storage bucket 'notary-documents' exists in Supabase
- Verify storage policies allow authenticated uploads
- Check file size limits

## Support

For issues or questions, check:
1. Browser console for errors
2. Supabase dashboard for database/auth issues
3. Network tab for API call failures

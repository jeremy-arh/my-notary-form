# Netlify Deployment Guide - Notary Admin Dashboard

## Prerequisites

1. A Netlify account (sign up at [netlify.com](https://www.netlify.com))
2. Your Supabase project URL and anonymous key
3. Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### Method 1: Deploy via Netlify UI (Recommended)

1. **Push your code to Git**
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push origin main
   ```

2. **Create a new site on Netlify**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider and select your repository

3. **Configure build settings**
   - **Base directory:** `notary-admin`
   - **Build command:** `npm run build`
   - **Publish directory:** `notary-admin/dist`
   - **Node version:** 18

4. **Set environment variables**
   Go to Site settings → Environment variables and add:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

5. **Deploy**
   - Click "Deploy site"
   - Wait for the build to complete
   - Your site will be live at `https://your-site-name.netlify.app`

### Method 2: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Navigate to the notary-admin directory**
   ```bash
   cd notary-admin
   ```

4. **Initialize Netlify**
   ```bash
   netlify init
   ```
   - Choose "Create & configure a new site"
   - Follow the prompts

5. **Set environment variables**
   ```bash
   netlify env:set VITE_SUPABASE_URL "your-supabase-url"
   netlify env:set VITE_SUPABASE_ANON_KEY "your-supabase-anon-key"
   ```

6. **Deploy**
   ```bash
   netlify deploy --prod
   ```

## Custom Domain Setup

1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Enter your domain name
4. Follow the DNS configuration instructions
5. Netlify will automatically provision SSL certificates

## Environment Variables

Make sure to set these in Netlify UI (Site settings → Environment variables):

- `VITE_SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

## Build Configuration

The `netlify.toml` file contains:
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 18
- Security headers
- Cache settings for static assets
- SPA redirect rules

## Troubleshooting

### Build fails
- Check that Node version is 18
- Verify all dependencies are installed
- Check build logs in Netlify dashboard

### Environment variables not working
- Make sure variables start with `VITE_` prefix
- Redeploy after adding new variables
- Check that variables are set in the correct environment (production, branch deploys, etc.)

### Routing issues
- Ensure `_redirects` file exists in `public/` folder
- Verify `netlify.toml` has correct redirect rules
- Check that React Router is properly configured

### Performance issues
- Enable Netlify's CDN
- Check cache headers in `netlify.toml`
- Optimize images and assets

## Continuous Deployment

Netlify automatically deploys when you push to your connected Git branch:
- `main` or `master` branch → Production
- Other branches → Preview deployments

## Support

For issues:
1. Check Netlify build logs
2. Check browser console for runtime errors
3. Verify environment variables are set correctly
4. Review [Netlify documentation](https://docs.netlify.com/)


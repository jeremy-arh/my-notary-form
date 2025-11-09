# Notary Service Platform

A complete notary service platform with two separate applications:
- **Customer Form** - Multi-step form for booking notary services (port 5173)
- **Admin Panel** - Management dashboard for notaries (port 5174)

Both applications are built with React, Tailwind CSS, and Supabase.

![Form Preview](https://via.placeholder.com/1200x600/F3F4F6/000000?text=Notary+Service+Request+Form)

## Project Structure

This repository contains **two separate applications**:

### 1. Customer Form (Root Directory)
The main customer-facing form for requesting notary services.
- **Location**: Root directory (`/`)
- **Port**: 5173
- **Purpose**: Allow customers to submit notary service requests
- **Run**: `npm run dev` (in root directory)

### 2. Admin Panel (`/notary-admin`)
Separate admin dashboard for notaries to manage submissions.
- **Location**: `notary-admin/` directory
- **Port**: 5174
- **Purpose**: Manage requests, accept/reject submissions, upload documents
- **Run**: `cd notary-admin && npm run dev`

Both applications can run simultaneously on different ports and are designed to be deployed on separate domains.

**See `notary-admin/README.md` for admin panel documentation.**

## Features

### Customer Form Steps

1. **Documents** - Multi-file uploader with drag & drop
2. **Choose Option** - Select notary services and additional options
3. **Book Appointment** - Interactive calendar, time slots, and timezone selector
4. **Personal Information** - Client details with real-time validation
5. **Summary** - Review and submit request

### Design & UX

- **Left Sidebar Navigation** - Fixed 100vh sidebar with step indicators
- **Full-Width Content** - Content area takes full available width
- **TASA Orbiter Font** - Modern, professional typography
- **Smooth Animations** - Fade-in, slide-in, bounce effects throughout
- **Custom Cursor** - Pointer cursor on all clickable elements
- **Color Scheme**:
  - Background: `#FFFFFF` (White)
  - Blocks: `#F3F4F6` (Light Gray)
  - Buttons: Black with rounded corners and hover animations
- **Responsive Design** - Optimized for mobile, tablet, and desktop

### Technical Features

- **Real-time Validation** - Form field validation with error messages
- **Supabase Integration** - Complete database persistence
- **File Upload** - Support for PDF, DOC, DOCX, and images
- **Timezone Detection** - Automatic timezone based on user location
- **Data Persistence** - All form data saved only on final submission

## Technologies

- **React** 19.1.1 - UI framework
- **Vite** 7.1.7 - Build tool and dev server
- **Tailwind CSS** 4.1.15 - Utility-first CSS
- **Iconify** - Beautiful icon library
- **Supabase** - Backend as a Service (Database + Storage)
- **React Dropzone** - File upload component

## Installation

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier available)

### Setup - Customer Form

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd my-notary-form
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase** (Important!)
   - Follow the detailed guide in `SUPABASE_SETUP.md`
   - Create a Supabase project
   - Run the SQL schema from `supabase-schema.sql`
   - Run the admin migration `supabase-admin-migration.sql`
   - Create storage bucket for files
   - Get your API credentials

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173)

6. **Build for production**
   ```bash
   npm run build
   npm run preview
   ```

### Setup - Admin Panel

1. **Navigate to admin directory**
   ```bash
   cd notary-admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add the same Supabase credentials

4. **Run development server (separate terminal)**
   ```bash
   npm run dev
   ```

   Open [http://localhost:5174](http://localhost:5174)

**Note**: Both applications can run simultaneously. Open two terminal windows and run `npm run dev` in each directory.

## Database Schema

The application uses the following Supabase tables:

- **notary** - Notary professional information
- **services** - Available notary services catalog
- **options** - Additional service options
- **submission** - Form submissions
- **submission_services** - Services selected per submission
- **submission_options** - Options selected per submission
- **submission_files** - Uploaded file metadata

See `supabase-schema.sql` for the complete schema.

## Project Structure

```
my-notary-form/
├── src/
│   ├── components/
│   │   ├── NotaryForm.jsx         # Main form with sidebar
│   │   └── steps/
│   │       ├── Documents.jsx      # Step 1: File upload
│   │       ├── ChooseOption.jsx   # Step 2: Service selection
│   │       ├── BookAppointment.jsx # Step 3: Date/time picker
│   │       ├── PersonalInfo.jsx   # Step 4: Client details
│   │       └── Summary.jsx        # Step 5: Review & submit
│   ├── lib/
│   │   └── supabase.js           # Supabase client & API functions
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css                 # Custom CSS + animations
├── supabase-schema.sql           # Database schema
├── SUPABASE_SETUP.md            # Supabase setup guide
├── .env.example                 # Environment variables template
└── package.json
```

## Available Services

The form includes 8 pre-configured notary services:

1. Real Estate Transaction - Purchase, sale, or refinancing
2. Last Will & Testament - Create or update wills
3. Power of Attorney - Grant legal authority
4. Marriage Contract - Prenuptial agreements
5. Succession & Estate - Estate settlement
6. Document Authentication - Certify documents
7. Affidavit - Sworn statements
8. Business Incorporation - Company formation

## Additional Options

- **Urgent Service (48h)** - Priority processing
- **Home Visit** - Notary comes to you
- **Translation Service** - Document translation
- **Legal Consultation** - Professional advice

## Custom Animations

The application features smooth, professional animations:

- **fade-in** - Element appears gradually
- **fade-in-up** - Slides up while fading in
- **slide-in** - Slides from left
- **bounce-in** - Bounces into view
- **pulse-slow** - Subtle pulsing effect
- **hover effects** - Scale and lift on hover

All animations use CSS keyframes defined in `src/index.css`.

## Form Data Flow

1. User fills out form across 5 steps
2. Data is stored in React state (`formData`)
3. User can navigate between steps freely
4. On final "Submit", data is sent to Supabase:
   - Main submission record created
   - Selected services linked
   - Selected options linked
   - Files uploaded to Storage
   - File metadata saved to database
5. User receives confirmation with submission ID
6. Form resets to step 1

## API Functions

Located in `src/lib/supabase.js`:

- `getServices()` - Fetch all active services
- `getOptions()` - Fetch all active options
- `submitNotaryRequest(formData)` - Submit complete form
- `getSubmissionById(id)` - Retrieve submission details

## Customization

### Modify Services or Options

Edit the data directly in Supabase:

```sql
-- Update a service
UPDATE services
SET name = 'New Name', base_price = 999.99
WHERE service_id = 'real-estate';

-- Add a new option
INSERT INTO options (option_id, name, description, additional_price)
VALUES ('new-option', 'New Option', 'Description', 50.00);
```

### Change Colors

Edit `src/components/NotaryForm.jsx` and component files:

```jsx
// Background
className="bg-white"

// Blocks
className="bg-[#F3F4F6]"

// Buttons
className="bg-black hover:bg-gray-800"
```

### Modify Form Fields

Edit individual step components in `src/components/steps/`.

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel settings
4. Deploy

### Deploy to Cloudflare Pages

1. See `CLOUDFLARE_DEPLOYMENT.md` for complete deployment instructions
2. Each dashboard will be deployed on a separate subdomain:
   - Client Dashboard: `client.votredomaine.com`
   - Admin Dashboard: `admin.votredomaine.com`
3. Configure environment variables in Cloudflare Pages settings
4. Deploy via Git integration or Wrangler CLI

## Troubleshooting

### Form submission fails

- Check Supabase credentials in `.env`
- Verify SQL schema was run correctly
- Check browser console for errors
- Ensure storage bucket exists and is public

### Files not uploading

- Verify `submission-documents` bucket exists in Supabase Storage
- Check bucket is set to public
- Verify storage policies allow public inserts

### Styles not loading

- Clear browser cache
- Rebuild the project: `npm run build`
- Check console for CSS loading errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT

## Support

For issues or questions:
- Create an issue on GitHub
- Check `SUPABASE_SETUP.md` for database setup help
- Review Supabase documentation: https://supabase.com/docs

---

**Built with ❤️ using React, Tailwind CSS, and Supabase**

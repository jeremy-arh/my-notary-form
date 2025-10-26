# Logo Configuration

This directory contains the logo and assets for the client dashboard application.

## Changing the Logo

To change the logo:

1. **Option 1: Replace the SVG in Logo.jsx**
   - Open `Logo.jsx` in this directory (`client-dashboard/src/assets/Logo.jsx`)
   - Modify the SVG code inside the component
   - The changes will automatically apply to the entire application

2. **Option 2: Use an image file**
   - Place your logo image (e.g., `logo.png`, `logo.svg`) in this directory
   - Update `Logo.jsx` to import and export the image:
     ```javascript
     import logo from './logo.png'
     export default logo
     ```

3. **Option 3: Use a custom component**
   - Replace the entire `Logo.jsx` component with your custom React component
   - Make sure to accept `width`, `height`, and `className` props for flexibility

## Current Logo

The current logo is a gradient SVG with the following colors:
- Purple (#491ae9)
- Magenta (#b300c7)
- Red (#f20075)
- Orange (#ff8400)

The logo is used in:
- NotaryForm (sidebar)
- ClientLayout (dashboard sidebar)

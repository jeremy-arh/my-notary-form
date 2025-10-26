# Logo Configuration

This directory contains shared assets used across all dashboards (client dashboard, notary admin, etc.).

## Changing the Logo

To change the logo for all dashboards:

1. **Option 1: Replace the SVG in Logo.jsx**
   - Open `Logo.jsx` in this directory
   - Modify the SVG code inside the component
   - The changes will automatically apply to all dashboards

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

All dashboards import the logo using the `@shared/assets/Logo` alias, so any changes here will be reflected everywhere.

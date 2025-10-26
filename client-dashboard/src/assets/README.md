# How to Change the Logo

The logo is centralized in `/src/assets/Logo.jsx` and is used across all dashboards (form, client dashboard, etc.).

## Option 1: Use an Image File (Recommended)

1. Place your logo image in this directory (e.g., `logo.png`, `logo.svg`)

2. Replace the content of `Logo.jsx` with:

```jsx
import logo from './logo.png'; // or ./logo.svg

const Logo = ({ width = 80, height = 80, className = "" }) => {
  return (
    <img
      src={logo}
      alt="Logo"
      width={width}
      height={height}
      className={className}
    />
  );
};

export default Logo;
```

## Option 2: Use a Custom SVG

Replace the SVG code inside the `Logo` component in `Logo.jsx` with your custom SVG code.

## The logo is automatically used in:
- Notary Form sidebar
- Client Dashboard sidebar (desktop & mobile)
- Any future dashboards you create

Just update `Logo.jsx` once and it updates everywhere!

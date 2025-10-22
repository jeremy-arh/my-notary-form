/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        '4xl': '2.5rem',
      },
      maxWidth: {
        '8xl': '90rem',
      },
      boxShadow: {
        'soft-xl': '0 40px 80px -40px rgba(30, 64, 175, 0.35)',
      },
    },
  },
  plugins: [],
}

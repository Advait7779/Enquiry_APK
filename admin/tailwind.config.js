/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chamber: {
          // Brand / Legal Palette from Mobile App
          navy: '#0F1E36',       // Deep Chamber Navy (primary)
          dark: '#0A1526',       // primaryDark
          light: '#1E293B',      // primaryLight
          gold: '#C89B3C',       // Professional Gold (accent)
          goldLight: '#FBF4E6',  // accentLight
          goldDark: '#B48328',   // textAccent

          // Backgrounds & Surfaces
          bg: '#F4F6F9',         // Soft subtle warm grey (background)
          card: '#FFFFFF',       // card / surface
          surfaceSubtle: '#F8FAFC',

          // Typography
          textPrimary: '#0F172A',   // Slate 900
          textSecondary: '#475569', // Slate 600
          textMuted: '#94A3B8',     // Slate 400
          textInverse: '#FFFFFF',

          // Borders
          border: '#E2E8F0',
          borderStrong: '#CBD5E1',
          borderFocus: '#0F1E36',

          // Utilities
          danger: '#DC2626',
          success: '#16A34A',
          phoneCall: '#2563EB',
          whatsapp: '#25D366',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

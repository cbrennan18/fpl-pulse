/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FDFDFB',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#28C76F',
          dark: '#0A321C',
          light: '#BDF1D3',
        },
        secondary: {
          light: '#FDFCF7',
          DEFAULT: '#F4F1E8',
        },
        text: '#2F2F2F',
        heading: '#111827',
        subtext: '#6B7280',
        subtle: '#FAFAFA',
        danger: '#EF4444',
        muted: '#f1f5f9',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.safe-p': {
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        },
        '.safe-pt': { paddingTop: 'env(safe-area-inset-top)' },
        '.safe-pb': { paddingBottom: 'env(safe-area-inset-bottom)' },
        '.safe-pl': { paddingLeft: 'env(safe-area-inset-left)' },
        '.safe-pr': { paddingRight: 'env(safe-area-inset-right)' },
        '.pt-safe-6': {
          paddingTop: 'calc(env(safe-area-inset-top, 0) + 1.5rem)',
        },
        '.pb-safe-10': {
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 2.5rem)',
        },
        '.pt-safe-bar': {
          paddingTop: 'calc(env(safe-area-inset-top, 0) + 2.5rem)',
        },
      });
    },
  ],
};
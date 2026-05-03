/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050B1E',
          900: '#081229',
          800: '#101B36',
        },
        mint: {
          DEFAULT: '#7CF7C8',
          600: '#1EC99A',
        },
        gold: '#F7C948',
        coral: '#FF6B7A',
        'ink-secondary': '#B8C2D6',
        'ink-muted': '#7F8AA3',
      },
      borderRadius: {
        card: '1.25rem',
        'xl-card': '1.5rem',
        pill: '999px',
      },
      boxShadow: {
        glass: '0 10px 30px -10px rgba(0,0,0,0.55)',
        'mint-glow': '0 8px 24px -6px rgba(124,247,200,0.45)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        pulseSoft: {
          '0%, 100%': { boxShadow: '0 8px 24px -6px rgba(124,247,200,0.4)' },
          '50%': { boxShadow: '0 8px 32px -4px rgba(124,247,200,0.7)' },
        },
      },
    },
  },
  plugins: [],
}

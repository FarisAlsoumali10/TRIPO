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
        midnight: '#050B1E',
        chamber: '#081229',
        lifted: '#101B36',
        oasis: {
          spring: '#7CF7C8',
          deep: '#1EC99A',
        },
        karam: '#F7C948',
        gold: '#F7C948',       // alias → same token as karam
        waypoint: '#FF6B7A',
        moon: '#B8C2D6',
        dusk: '#7F8AA3',
        ink: {
          secondary: '#B8C2D6', // Desert Moon
          muted: '#7F8AA3',     // Dusk Sand
        },
        // Legacy support mapping
        navy: {
          950: '#050B1E',
          900: '#081229',
          800: '#101B36',
        },
        mint: {
          DEFAULT: '#7CF7C8',
          600: '#1EC99A',
        },
      },
      borderRadius: {
        card: '1.25rem',
        'xl-card': '1.5rem',
        pill: '999px',
      },
      boxShadow: {
        'glass-depth': '0 10px 30px -10px rgba(0,0,0,0.55)',
        'mint-glow': '0 8px 24px -6px rgba(124,247,200,0.45)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'fade-up': 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up-d1': 'fadeUp 0.5s 0.07s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up-d2': 'fadeUp 0.5s 0.14s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up-d3': 'fadeUp 0.5s 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
        'weather-sway': 'weatherSway 3s ease-in-out infinite',
        'streak-fire': 'streakFire 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        pulseSoft: {
          '0%, 100%': { boxShadow: '0 8px 24px -6px rgba(124,247,200,0.35)' },
          '50%': { boxShadow: '0 8px 36px -4px rgba(124,247,200,0.65)' },
        },
        fadeUp: {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        weatherSway: {
          '0%, 100%': { transform: 'rotate(-8deg)' },
          '50%': { transform: 'rotate(8deg)' },
        },
        streakFire: {
          '0%, 100%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.15)' },
          '65%': { transform: 'scale(1.07)' },
        },
      },
    },
  },
  plugins: [],
}

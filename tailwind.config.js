/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fbf7ff',
          100: '#f5eeff',
          200: '#ebd9ff',
          300: '#dbb6fe',
          400: '#c285fc',
          500: '#a654f6',
          600: '#8e32ea',
          700: '#7030A0', // Exact PPTX purple!
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
        'scale-up': 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'shine': 'shine 2s infinite linear',
      },
      keyframes: {
        bounceSubtle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shine: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}

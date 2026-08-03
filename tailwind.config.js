/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identidade visual D&R Perícia Elite
        brand: {
          50: '#ECF5F0',
          100: '#D2E7DB',
          200: '#A3CEB8',
          300: '#6BAE8E',
          400: '#3C8B66',
          500: '#186F47',
          600: '#0E5C39',
          700: '#0A4A2D', // verde principal do logotipo
          800: '#073722',
          900: '#042317',
        },
        navy: {
          50: '#EEF2F9',
          100: '#D8E1F0',
          200: '#B0C2E0',
          300: '#7E99C8',
          400: '#4E6DA6',
          500: '#2A4C85',
          600: '#1B3A6B', // azul das credenciais
          700: '#152D54',
          800: '#0F213E',
          900: '#0A1729',
        },
        ink: {
          50: '#F8F6F1',
          100: '#EFEBE2',
          200: '#DFDACC',
          300: '#BFB9A8',
          400: '#8B8677',
          500: '#656155',
          600: '#4A4740',
          700: '#38352F',
          800: '#26241F',
          900: '#171512',
        },
        gold: {
          50: '#FBF7EC',
          100: '#F4E9CB',
          200: '#E6CD8E',
          300: '#D4AF5E',
          400: '#C29A42',
          500: '#AD8534', // acento do selo de credenciamento
          600: '#8F6C29',
          700: '#715421',
          800: '#573F19',
          900: '#3E2C12',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        display: ['Petrona', 'Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)',
        pop: '0 10px 30px -12px rgba(4,35,23,.35)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { 'fade-in': 'fade-in .18s ease-out' },
    },
  },
  plugins: [],
}

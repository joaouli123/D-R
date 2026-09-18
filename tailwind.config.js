/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identidade visual D&R Perícia Elite
        brand: {
          50: '#EEF4FF',
          100: '#DCE9FE',
          200: '#B9D3FD',
          300: '#8AB4FA',
          400: '#548CF0',
          500: '#2E68DE',
          600: '#1E4FBE',
          700: '#173F9B', // azul principal do logotipo
          800: '#12317A',
          900: '#0C2456',
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
          50: '#F7F8FA',
          100: '#EEF1F5',
          200: '#DEE3EA',
          300: '#C3CBD6',
          400: '#94A0B2',
          500: '#69748A',
          600: '#4D5668',
          700: '#38404F',
          800: '#262C37',
          900: '#161A21',
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
        pop: '0 10px 30px -12px rgba(12,36,86,.35)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { 'fade-in': 'fade-in .18s ease-out' },
    },
  },
  plugins: [],
}

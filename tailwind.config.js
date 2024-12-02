/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'game-primary': '#00ff00',
        'game-secondary': '#00ccff',
        'game-accent': '#ff00ff',
        'game-background': '#1a1a1a',
      },
      animation: {
        'blob-pulse': 'blob-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'power-up-float': 'power-up-float 3s ease-in-out infinite',
      },
      keyframes: {
        'blob-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'power-up-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};

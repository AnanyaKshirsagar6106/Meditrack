/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{js,ts,jsx,tsx,html}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef7ee',
          100: '#d9efd9',
          200: '#b5dfb5',
          300: '#85c785',
          400: '#52a852',
          500: '#2d8f2d',
          600: '#1f6e1f',
          700: '#1a581a',
          800: '#174717',
          900: '#143b14',
          950: '#062006',
        },
        ayurveda: {
          green: '#2d8f2d',
          gold: '#c9a84c',
          earth: '#8B6F47',
          saffron: '#FF9933',
          cream: '#FFF8E7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
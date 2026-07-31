/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 👇 PALETA DE COLORES DE UMBRELLA CORP. PURPLE 👇
        umbrella: {
          deep: '#030105',     // Fondo absoluto (deep black-purple)
          dark: '#0e031a',     // Fondo de tarjetas (glass dark purple)
          mid: '#1a0733',      // Bordes y separadores (mid dark purple)
          light: '#260a4d',    // Elementos secundarios (light dark purple)
          accent: '#9d4edd',   // Acento principal (vibrant purple)
          bright: '#c77dff',   // Acento brillante (highlight purple)
        },
      },
      fontFamily: {
        // 👇 FUENTE PREDETERMINADA COMPUTACIONAL 👇
        sans: ['JetBrains Mono', 'monospace', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
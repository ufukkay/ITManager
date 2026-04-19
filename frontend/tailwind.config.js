import daisyui from "daisyui"

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        roboto: ['Roboto', 'sans-serif'],
        sans: ['Inter', 'Roboto', 'Arial', 'sans-serif'],
      },
      colors: {
        // Google Blue
        blue: {
          50: '#e8f0fe',
          100: '#d2e3fc',
          200: '#aecbfa',
          300: '#8ab4f8',
          400: '#669df6',
          500: '#1a73e8', // Primary
          600: '#174ea6', // Hover
          700: '#183a6b',
        },
        // Google Red
        red: {
          50: '#fce8e6',
          100: '#fad2cf',
          200: '#f6aea9',
          500: '#ea4335',
          600: '#c5221f',
        },
        rose: {
          50: '#fce8e6',
          100: '#fad2cf',
          500: '#ea4335',
          600: '#c5221f',
        },
        // Google Green
        emerald: {
          50: '#e6f4ea',
          100: '#ceead6',
          200: '#a8dab5',
          500: '#34a853',
          600: '#137333',
        },
        green: {
          50: '#e6f4ea',
          100: '#ceead6',
          500: '#34a853',
          600: '#137333',
        },
        // Google Yellow
        amber: {
          50: '#fef7e0',
          100: '#fde293',
          200: '#fdd663',
          500: '#fbbc04',
          600: '#b06000',
        },
        yellow: {
          50: '#fef7e0',
          100: '#fde293',
          500: '#fbbc04',
          600: '#b06000',
        },
        // Google Grays
        gray: {
          50: '#f8f9fa',
          100: '#f1f3f4',
          200: '#dadce0', // Borders
          300: '#bdc1c6',
          400: '#9aa0a6',
          500: '#80868b',
          600: '#5f6368', // Secondary Text
          700: '#3c4043',
          800: '#202124', // Primary Text
          900: '#202124',
        },
        primary: '#1a73e8',
        brand: '#ffb71b',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          primary: "#1a73e8",
          "primary-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#f8f9fa",
          "base-300": "#f1f3f4",
          "base-content": "#202124",
        },
      },
    ],
  },
}


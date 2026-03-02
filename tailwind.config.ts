import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // CLINIX POWER — BRAND TOKENS (Source of Truth: Pacientes Page)
        // Purple gradient: from-purple-500 to-purple-600 = #a855f7 to #9333ea
        'brand-primary': {
          DEFAULT: '#a855f7',  // purple-500 (main brand color)
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',  // Main brand
          600: '#9333ea',  // Darker shade for gradients
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        // Green badge: "Em Serviço" status
        'brand-success': {
          DEFAULT: '#22c55e',  // green-500
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',  // Main success color
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f7fb',
          100: '#e6edf6',
          200: '#c9d8ec',
          300: '#9cb8db',
          400: '#6991c4',
          500: '#4773ae',
          600: '#365b92',
          700: '#2d4977',
          800: '#293f63',
          900: '#253653',
        },
      },
    },
  },
  plugins: [],
};

export default config;

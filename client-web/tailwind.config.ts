import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2da2fd',
          light:   '#3cb5ff',
          pale:    '#a5d3fe',
          bg:      '#edf3f9',
        },
        slate: {
          dark:  '#364751',
          mid:   '#858c92',
          light: '#cdd0d3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

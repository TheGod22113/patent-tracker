import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f7f3fb",
          100: "#ede5f6",
          200: "#dccbee",
          300: "#c3a5e0",
          400: "#a87bcf",
          500: "#8e57be",
          600: "#7a48a6",
          700: "#663a8c",
          800: "#553273",
          900: "#3d2254",
          950: "#261438",
        },
      },
    },
  },
  plugins: [],
};

export default config;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gov: {
          blue: {
            DEFAULT: "#1e3a5f",
            50: "#eef3f9",
            100: "#d6e0ec",
            200: "#a8bcd4",
            300: "#7896bd",
            400: "#5275a8",
            500: "#3b5f97",
            600: "#2e538b",
            700: "#1e3a5f",
            800: "#19324f",
            900: "#0e2640",
          },
          yellow: {
            DEFAULT: "#fcd116",
            light: "#ffe082",
            dark: "#c79a00",
          },
          red: {
            DEFAULT: "#ce1126",
            light: "#ef5350",
            dark: "#a30d1b",
          },
          green: {
            DEFAULT: "#006847",
            light: "#2e7d32",
            dark: "#00432d",
          },
        },
      },
      fontFamily: {
        sans: ["Georama", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
  important: false,
};

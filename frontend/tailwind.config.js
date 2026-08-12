/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#F7F5F2",
        card: "#FFFFFF",
        ink: "#2B2740",
        violet: { DEFAULT: "#5549DA", light: "#8B82EA", dark: "#3F34B0" },
      },
      borderRadius: { DEFAULT: "2px", sm: "2px", md: "3px" },
    },
  },
  plugins: [],
};

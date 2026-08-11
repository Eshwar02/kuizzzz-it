/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#F7F5F2",
        card: "#FFFFFF",
        ink: "#2B2740",
        violet: { DEFAULT: "#8B7BB8", light: "#B9A7E0", dark: "#6F5F9E" },
      },
      borderRadius: { DEFAULT: "2px", sm: "2px", md: "3px" },
    },
  },
  plugins: [],
};

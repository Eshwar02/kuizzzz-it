/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#F7F5F2",
        card: "#FFFFFF",
        ink: "#2B2740",
        // Brand palette matched to the logo: soothing teal (green↔blue) primary,
        // with a warm yellow accent. `violet` kept as an alias so existing utility
        // classes recolour in place.
        brand: { DEFAULT: "#0D9488", light: "#5EEAD4", dark: "#0F766E" },
        violet: { DEFAULT: "#0D9488", light: "#5EEAD4", dark: "#0F766E" },
        accent: { DEFAULT: "#F59E0B", light: "#FCD34D", dark: "#B45309" },
      },
      borderRadius: { DEFAULT: "2px", sm: "2px", md: "3px" },
    },
  },
  plugins: [],
};

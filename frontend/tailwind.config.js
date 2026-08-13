/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#F7F5F2",
        card: "#FFFFFF",
        ink: "#2B2740",
        // Brand "merun"/maroon palette, matched to the logo (crimson-on-maroon).
        // `violet` kept as an alias so existing utility classes recolour in place.
        brand: { DEFAULT: "#A81E37", light: "#D9647A", dark: "#7C1226" },
        violet: { DEFAULT: "#A81E37", light: "#D9647A", dark: "#7C1226" },
      },
      borderRadius: { DEFAULT: "2px", sm: "2px", md: "3px" },
    },
  },
  plugins: [],
};

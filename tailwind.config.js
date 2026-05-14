/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f5f0e6",
        paper: "#fcfaf2",
        primary: "#8c6b47",
        text: "#3d2e1f",
        accent: "#c4a883",
        destructive: "#bf382b",
        success: "#2e7d45",
        secondary: "#998c80",
      },
    },
  },
  plugins: [],
}

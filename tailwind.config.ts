import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0E12",
        panel: "#14191F",
        edge: "#20262E",
        accent: "#46E5A0", // spring green — recovery good / interactive
        warn: "#F5B544", // amber — caution zone / carbs
        danger: "#FF5C5C", // red — low zone / over
        teal: "#4FD3E0", // hrv / protein
        grape: "#C58BF0", // fat / accent 2
        muted: "#6B7682",
        dim: "#AEB8C2",
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1.125rem", // 18px cards
      },
    },
  },
  plugins: [],
};

export default config;

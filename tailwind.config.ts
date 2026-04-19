import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0a0a",
          soft: "#141414",
          card: "#1a1a1a",
        },
        border: {
          DEFAULT: "#262626",
          strong: "#404040",
        },
        brand: {
          DEFAULT: "#ff3b6b",
          hover: "#ff5683",
        },
        accent: {
          funny: "#facc15",
          awkward: "#fb923c",
          serious: "#ef4444",
          yes: "#22c55e",
          no: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "bounce-in": "bounceIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-up": "slideUp 0.25s ease-out",
      },
      keyframes: {
        bounceIn: {
          "0%": { transform: "scale(0.9)", opacity: "0.5" },
          "60%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./contexts/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "rgb(var(--bg) / <alpha-value>)",
          soft:    "rgb(var(--bg-soft) / <alpha-value>)",
          card:    "rgb(var(--bg-card) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border) / <alpha-value>)",
          strong:  "rgb(var(--border-strong) / <alpha-value>)",
        },
        brand: {
          DEFAULT: "#ff3b6b",
          hover:   "#ff5683",
        },
        accent: {
          funny:   "#facc15",
          awkward: "#fb923c",
          serious: "#ef4444",
          yes:     "#22c55e",
          no:      "#ef4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "bounce-in": "bounceIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-up": "slideUp 0.25s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "fade-in-up": "fadeInUp 0.35s ease-out both",
        "wiggle": "wiggle 0.7s ease-in-out",
        "pop": "pop 0.3s ease-out",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        bounceIn: {
          "0%":   { transform: "scale(0.9)", opacity: "0.5" },
          "60%":  { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        slideUp: {
          "0%":   { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        slideDown: {
          "0%":   { transform: "translateY(-12px)", opacity: "0", maxHeight: "0" },
          "100%": { transform: "translateY(0)",      opacity: "1", maxHeight: "1000px" },
        },
        fadeInUp: {
          "0%":   { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)",     opacity: "1" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "15%": { transform: "rotate(-12deg)" },
          "30%": { transform: "rotate(10deg)" },
          "45%": { transform: "rotate(-8deg)" },
          "60%": { transform: "rotate(6deg)" },
          "75%": { transform: "rotate(-2deg)" },
        },
        pop: {
          "0%":   { transform: "scale(1)" },
          "50%":  { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

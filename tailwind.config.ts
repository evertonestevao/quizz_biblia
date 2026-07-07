import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        night: {
          900: "#0B1026",
          800: "#121736",
          700: "#1A1233",
        },
        gold: {
          300: "#F0C75E",
          400: "#E3B54B",
          500: "#D4A94E",
          600: "#B98C33",
        },
        parchment: "#F5F1E8",
        muted2: "#9B96B0",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212,169,78,0.0)" },
          "50%": { boxShadow: "0 0 32px 0 rgba(212,169,78,0.25)" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.5s ease-out both",
        glow: "glow 2.6s ease-in-out infinite",
        popIn: "popIn 0.25s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;

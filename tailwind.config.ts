import type { Config } from "tailwindcss";

// Palette et typographie = copie exacte de la source de vérité :
// assistant-etudiants/faces/vues/theme_djiguigne.py (COULEURS + CSS).
// Ne jamais dériver ces valeurs autrement — un seul endroit à faire
// évoluer si la marque change côté Streamlit.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dj: {
          fond: "#0B0908",
          surface: "#161210",
          "surface-haute": "#1E1813",
          bordure: "rgba(255,255,255,0.08)",
          "bordure-forte": "rgba(232,147,74,0.35)",
          "accent-1": "#E8934A",
          "accent-2": "#C1440E",
          texte: "#F5ECE0",
          "texte-muet": "#A79A8C",
          succes: "#4ADE80",
          inactif: "#6B6259",
        },
      },
      backgroundImage: {
        "dj-gradient": "linear-gradient(135deg, #F2A65A 0%, #D9631F 55%, #8A2E0A 100%)",
        "dj-hero-glow":
          "radial-gradient(ellipse 120% 60% at 50% -10%, rgba(232,147,74,0.10), transparent 60%)",
      },
      fontFamily: {
        display: ["var(--font-bricolage)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      keyframes: {
        "dj-fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "dj-fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "dj-orbit": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "dj-glow": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.06)" },
        },
      },
      animation: {
        "dj-fade-up": "dj-fade-up 0.5s ease both",
        "dj-fade-in": "dj-fade-in 0.8s ease both",
        "dj-orbit": "dj-orbit 18s linear infinite",
        "dj-glow": "dj-glow 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

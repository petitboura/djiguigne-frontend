import type { Config } from "tailwindcss";

// Étape D.1 (pivot social) : thème repris à l'identique de djiguigne-frontendent
// (la vitrine) — palette, typographie, dégradés, animations. Décision de
// Bourama (2026-07-11) : le thème visuel est commun aux deux sites, seule
// la STRUCTURE des pages diffère (ici : feed/agent/portfolio/dashboard, pas
// accueil/services/blog/contact). Source de vérité de ces valeurs :
// djiguigne-frontendent/tailwind.config.ts, lui-même dérivé de l'ancien
// djiguigne-backend/faces/vues/theme_djiguigne.py (fichier supprimé depuis,
// le retrait de Streamlit). Ne pas dévier de ces
// valeurs sans changer les deux dépôts à la fois.
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
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

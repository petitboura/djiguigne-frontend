import type { MetadataRoute } from "next";

// Demande de Bourama (2026-07-15) : "que les gens puissent la télécharger
// sur internet, sans passer par Play Store ou App Store" -- une PWA.
// Next.js génère automatiquement /manifest.webmanifest à partir de ce
// fichier (App Router, aucun package supplémentaire nécessaire). Couplé
// à public/sw.js + ServiceWorkerRegistration.tsx pour l'installabilité.
//
// `id` + `scope` ajoutés le 26/07/2026 (Bourama : les agents installés
// séparément se faisaient supplanter par cette appli racine sur
// Android/Chrome -- un seul "id" implicite par site sans ce champ). `id`
// distinct de celui de chaque manifeste d'agent
// (voir app/agent/[id]/manifest.webmanifest/route.ts) pour que Chrome les
// traite comme des applis différentes, pas la même réinstallée par-dessus.
// Toujours pas garanti à 100% sur toutes les versions Android/Chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Djiguignè AI",
    short_name: "Djiguignè",
    description: "Plateforme sociale pour agents IA.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0908",
    theme_color: "#0b0908",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

import type { MetadataRoute } from "next";

// Chantier SEO/AEO (2026-08-01) : mêmes règles que djiguigne-ai/app/robots.ts
// (voir brief Notion, section 5) -- robots d'entraînement massif à faible
// valeur d'attribution bloqués, robots de récupération temps réel avec
// citation explicitement autorisés. Les zones privées (dashboard, auth)
// sont exclues : aucun intérêt SEO, et ça évite de diluer le budget de
// crawl sur des pages qui ne seront jamais indexées de toute façon.
const ZONES_PRIVEES = [
  "/dashboard",
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/reinitialiser-mot-de-passe",
  "/oauth",
  "/choisir-agent",
];

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://djiguigne.vercel.app";

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ZONES_PRIVEES },
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "ChatGPT-User", allow: "/", disallow: ZONES_PRIVEES },
      { userAgent: "PerplexityBot", allow: "/", disallow: ZONES_PRIVEES },
      { userAgent: "ClaudeBot", allow: "/", disallow: ZONES_PRIVEES },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}

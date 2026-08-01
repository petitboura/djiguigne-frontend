import type { MetadataRoute } from "next";

// Chantier SEO/AEO (2026-08-01) : avant ce fichier, aucune page IA
// (agent/[id]) n'était référencée nulle part -- ni sitemap ni lien
// interne systématique -- donc invisible pour Google et pour les IA de
// recherche. C'est le point n°1 de l'audit : "le contenu le plus riche
// du site est invisible aux robots". Les pages /u/[id] (profils
// créateurs) ne sont volontairement PAS incluses : Bourama a explicitement
// mis de côté le côté social/profils pour ce chantier (2026-08-01), seules
// les IA comptent.

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://djiguigne.vercel.app";

type AgentFeedItem = { id: string };
type FeedReponse = { agents: AgentFeedItem[]; total: number };

// Récupère TOUS les agents publiés en parcourant la pagination de
// /api/feed (limite max 50/page côté backend, voir api/main.py). Garde-fou
// à 40 pages (2000 agents) pour ne jamais boucler indéfiniment si l'API
// se comporte mal.
async function recupererTousLesAgents(): Promise<AgentFeedItem[]> {
  if (!API_URL) return [];

  const agents: AgentFeedItem[] = [];
  let page = 1;

  while (page <= 40) {
    const reponse = await fetch(`${API_URL}/api/feed?page=${page}&limite=50`, {
      next: { revalidate: 3600 },
    }).catch(() => null);

    if (!reponse || !reponse.ok) break;

    const donnees: FeedReponse = await reponse.json();
    agents.push(...donnees.agents);

    if (agents.length >= donnees.total || donnees.agents.length === 0) break;
    page += 1;
  }

  return agents;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const agents = await recupererTousLesAgents();

  const entreesStatiques: MetadataRoute.Sitemap = [
    { url: APP_URL, changeFrequency: "daily", priority: 0.8 },
  ];

  const entreesAgents: MetadataRoute.Sitemap = agents.map((agent) => ({
    url: `${APP_URL}/agent/${agent.id}`,
    changeFrequency: "weekly",
    priority: 1,
  }));

  return [...entreesStatiques, ...entreesAgents];
}

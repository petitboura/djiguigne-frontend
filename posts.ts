import type { Locale } from "./site-config";

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  body: string;
};

// Un seul article de démarrage par langue, pour prouver que la structure
// fonctionne (page liste + page détail + sitemap + JSON-LD Article).
// Le vrai rythme de publication (2-4 articles/semaine, voir le brief Notion)
// s'ajoute simplement en complétant ces tableaux — aucune autre modification
// de code n'est nécessaire pour publier un nouvel article.
const posts: Record<Locale, Post[]> = {
  fr: [
    {
      slug: "creer-agent-ia-specialise-sans-coder",
      title: "Créer un agent IA spécialisé sans écrire une ligne de code",
      description:
        "Comment Djiguignè AI permet de définir l'identité, le comportement et la base de connaissance d'un agent IA en quelques minutes.",
      date: "2026-07-10",
      body: "Créer un agent IA spécialisé ne devrait pas exiger des compétences en développement. Chez Djiguignè AI, tout part d'un formulaire guidé en cinq étapes : l'identité de l'agent (ton, posture, limites), son comportement selon le type de requête, les outils qu'il peut utiliser, sa base de connaissance, et enfin l'interface avec laquelle les utilisateurs interagiront avec lui.\n\nCette approche structurée évite l'écueil classique du prompt unique, trop long et difficile à maintenir, en le remplaçant par des briques claires et modifiables indépendamment.",
    },
  ],
  en: [
    {
      slug: "build-specialized-ai-agent-without-coding",
      title: "Build a specialized AI agent without writing a single line of code",
      description:
        "How Djiguignè AI lets you define an AI agent's identity, behavior, and knowledge base in minutes.",
      date: "2026-07-10",
      body: "Building a specialized AI agent shouldn't require development skills. At Djiguignè AI, everything starts with a five-step guided form: the agent's identity (tone, posture, limits), its behavior depending on the type of request, the tools it can use, its knowledge base, and finally the interface users will interact with.\n\nThis structured approach avoids the classic pitfall of one giant, hard-to-maintain prompt, replacing it with clear building blocks that can be edited independently.",
    },
  ],
};

export function getPosts(locale: Locale): Post[] {
  return posts[locale];
}

export function getPost(locale: Locale, slug: string): Post | undefined {
  return posts[locale].find((p) => p.slug === slug);
}

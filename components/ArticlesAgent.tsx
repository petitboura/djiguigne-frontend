"use client";

import { useEffect, useState } from "react";
import { appelerApi } from "@/lib/api";
import { PostCard, type PostResume } from "@/components/PostCard";

// Ajouté le 2026-08-09 (Bourama) : section "Articles" sur la page publique
// d'une IA -- distincte de "Mises à jour" (MisesAJourAgent.tsx, table
// agent_updates, propre au créateur qui note ce qu'il a changé). Ici on
// réutilise directement le circuit "articles" existant (api/posts.py,
// PostCard.tsx déjà utilisés sur le profil créateur et le feed), juste
// filtré par agent_id -- un article est désormais toujours écrit pour une
// IA précise (voir ModalePublierPost.tsx).

export function ArticlesAgent({ agentId }: { agentId: string }) {
  const [articles, setArticles] = useState<PostResume[] | null>(null);

  useEffect(() => {
    appelerApi(`/api/posts?type=article&agent_id=${agentId}`)
      .then((r: PostResume[]) => setArticles(r))
      .catch(() => setArticles([]));
  }, [agentId]);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-bold text-dj-texte">Articles</h2>
      {articles === null && <p className="text-sm text-dj-texte-muet">Chargement…</p>}
      {articles !== null && articles.length === 0 && (
        <p className="text-sm text-dj-texte-muet">Aucun article pour l&apos;instant.</p>
      )}
      {articles?.map((article) => (
        <PostCard key={article.id} post={article} />
      ))}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { appelerApi } from "@/lib/api";
import { PostCard, type PostResume } from "@/components/PostCard";
import { messageErreur } from "@/lib/erreurs";

// Ajouté le 2026-07-15 (Bourama : "dans son profil aussi, les trois
// sections") -- mêmes 3 onglets (texte + ligne de couleur) que l'accueil
// (voir app/page.tsx:Onglet), mais filtrés sur CE créateur uniquement
// (GET /api/posts?type=...&user_id=...). Composant client à part car
// /u/[id]/page.tsx est un Server Component (SSR pour le SEO, voir sa
// docstring) -- l'interactivité des onglets doit être isolée ici.

type TypePost = "article" | "reflexion" | "histoire";

type EtatFeed =
  | { statut: "chargement" }
  | { statut: "ok"; posts: PostResume[] }
  | { statut: "erreur"; message: string };

const ONGLETS: { type: TypePost; libelle: string }[] = [
  { type: "article", libelle: "Article" },
  { type: "reflexion", libelle: "Réflexion" },
  { type: "histoire", libelle: "Histoire" },
];

export function SectionsPostsCreateur({ userId }: { userId: string }) {
  const [ongletActif, setOngletActif] = useState<TypePost>("article");
  const [feeds, setFeeds] = useState<Record<TypePost, EtatFeed>>({
    article: { statut: "chargement" },
    reflexion: { statut: "chargement" },
    histoire: { statut: "chargement" },
  });

  useEffect(() => {
    let annule = false;
    setFeeds((f) => ({ ...f, [ongletActif]: { statut: "chargement" } }));

    appelerApi(`/api/posts?type=${ongletActif}&user_id=${userId}&limite=50`)
      .then((r: PostResume[]) => {
        if (annule) return;
        setFeeds((f) => ({ ...f, [ongletActif]: { statut: "ok", posts: r } }));
      })
      .catch((e) => {
        if (annule) return;
        setFeeds((f) => ({
          ...f,
          [ongletActif]: { statut: "erreur", message: messageErreur(e) },
        }));
      });

    return () => {
      annule = true;
    };
  }, [ongletActif, userId]);

  const etat = feeds[ongletActif];
  const messagesVides: Record<TypePost, string> = {
    article: "Aucun article publié pour l'instant.",
    reflexion: "Aucune réflexion partagée pour l'instant.",
    histoire: "Aucune histoire publiée pour l'instant.",
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex gap-6 border-b border-dj-bordure">
        {ONGLETS.map(({ type, libelle }) => (
          <button
            key={type}
            onClick={() => setOngletActif(type)}
            className={`border-b-2 px-1 pb-3 text-sm transition-colors ${
              ongletActif === type
                ? "border-dj-accent-1 font-medium text-dj-texte"
                : "border-transparent text-dj-texte-muet hover:text-dj-texte"
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {etat.statut === "chargement" && <p className="text-sm text-dj-texte-muet">Chargement…</p>}
      {etat.statut === "erreur" && (
        <p className="text-sm text-dj-texte-muet">Impossible de charger pour le moment.</p>
      )}
      {etat.statut === "ok" && etat.posts.length === 0 && (
        <p className="text-sm text-dj-texte-muet">{messagesVides[ongletActif]}</p>
      )}
      {etat.statut === "ok" && etat.posts.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {etat.posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}

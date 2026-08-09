"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formaterDate } from "@/lib/formaterDate";

// Ajouté le 2026-07-15 (Bourama : "brancher la fonction article et la
// définir" + Histoire/Réflexion) — un seul composant pour les 3 types,
// réutilisé par le feed de l'accueil (3 onglets) ET la page profil d'un
// créateur (mêmes 3 sections). Pas de page de détail séparée pour
// l'instant : un article se déplie sur place ("Lire la suite"), ça reste
// suffisant vu le volume attendu, plus simple que de créer /article/[id].
export type PostResume = {
  id: number;
  user_id: string;
  nom_affiche?: string | null;
  avatar_url?: string | null;
  type: "article" | "reflexion" | "histoire";
  titre?: string | null;
  contenu: string;
  image_couverture_url?: string | null;
  photos_supplementaires: string[];
  created_at?: string | null;
  agent_id?: string | null;
  agent_nom?: string | null;
  agent_avatar_url?: string | null;
};

function EnTeteAuteur({ post, cacherAvatar = false }: { post: PostResume; cacherAvatar?: boolean }) {
  const nom = post.nom_affiche || "Créateur sans nom";
  return (
    <Link href={`/u/${post.user_id}`} className="flex items-center gap-2.5">
      {!cacherAvatar && (
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-dj-surface-haute">
          {post.avatar_url ? (
            <Image src={post.avatar_url} alt={nom} fill className="object-cover" sizes="32px" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm">🙂</span>
          )}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-dj-texte">{nom}</p>
        <p className="text-xs text-dj-texte-muet">{formaterDate(post.created_at)}</p>
      </div>
    </Link>
  );
}

export function PostCard({ post }: { post: PostResume }) {
  if (post.type === "reflexion") return <CarteReflexion post={post} />;
  if (post.type === "histoire") return <CarteHistoire post={post} />;
  return <CarteArticle post={post} />;
}

function CarteReflexion({ post }: { post: PostResume }) {
  return (
    <div className="rounded-2xl border border-dj-bordure bg-dj-surface p-5">
      <EnTeteAuteur post={post} />
      <p className="mt-3 whitespace-pre-wrap text-dj-texte">{post.contenu}</p>
    </div>
  );
}

function CarteHistoire({ post }: { post: PostResume }) {
  const photos = [post.image_couverture_url, ...post.photos_supplementaires].filter(
    (p): p is string => !!p
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface">
      {photos.length > 0 && (
        <div
          className={`grid gap-0.5 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
        >
          {photos.map((url, i) => (
            <div key={i} className="relative aspect-square bg-dj-surface-haute">
              <Image src={url} alt={post.titre || ""} fill className="object-cover" sizes="50vw" />
            </div>
          ))}
        </div>
      )}
      <div className="p-5">
        <EnTeteAuteur post={post} />
        {post.titre && (
          <h3 className="mt-3 font-display text-lg font-bold text-dj-texte">{post.titre}</h3>
        )}
        <p className="mt-1.5 whitespace-pre-wrap text-dj-texte-muet">{post.contenu}</p>
      </div>
    </div>
  );
}

function CarteArticle({ post }: { post: PostResume }) {
  const [deplie, setDeplie] = useState(false);
  const LONGUEUR_EXTRAIT = 320;
  const estLong = post.contenu.length > LONGUEUR_EXTRAIT;

  return (
    <div className="overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface">
      {post.image_couverture_url && (
        <div className="relative aspect-[16/9] bg-dj-surface-haute">
          <Image
            src={post.image_couverture_url}
            alt={post.titre || ""}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 50vw, 100vw"
          />
        </div>
      )}
      <div className="p-5">
        <EnTeteAuteur post={post} />
        {post.agent_id && (
          <Link
            href={`/agent/${post.agent_id}`}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-dj-bordure bg-dj-surface-haute px-2.5 py-1 text-xs font-medium text-dj-texte-muet transition-colors hover:border-dj-bordure-forte"
          >
            {post.agent_avatar_url ? (
              <span className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full bg-dj-surface">
                <Image src={post.agent_avatar_url} alt="" fill className="object-cover" sizes="16px" />
              </span>
            ) : (
              <span>🤖</span>
            )}
            Écrit pour {post.agent_nom || "cette IA"}
          </Link>
        )}
        {post.titre && (
          <h3 className="mt-3 font-display text-xl font-bold text-dj-texte">{post.titre}</h3>
        )}
        <p className="mt-2 whitespace-pre-wrap text-dj-texte-muet">
          {deplie || !estLong ? post.contenu : `${post.contenu.slice(0, LONGUEUR_EXTRAIT).trimEnd()}…`}
        </p>
        {estLong && (
          <button
            type="button"
            onClick={() => setDeplie((v) => !v)}
            className="mt-2 text-sm font-medium text-dj-accent-1"
          >
            {deplie ? "Réduire" : "Lire la suite"}
          </button>
        )}
      </div>
    </div>
  );
}

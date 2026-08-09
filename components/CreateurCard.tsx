"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { appelerApi } from "@/lib/api";

// Ajouté le 2026-07-13 (demande de Bourama), ajusté deux fois le même
// jour suite à ses retours :
// - "X agents créés" -> juste "X Agent(s)" (mot "créé(s)" retiré)
// - le nombre passe dans une bulle à bordure colorée, juste devant le nom
//   (plus une ligne de texte séparée en dessous)
// - à l'autre bout de la carte : juste "X abonnés" en texte (PAS le
//   bouton Suivre cliquable de BoutonFollow.tsx, retiré au 2e retour de
//   Bourama) — l'abonnement se fait depuis /u/[id] (portfolio complet),
//   cette carte reste une simple vignette de parcours.
export type CreateurResume = {
  user_id: string;
  nom_affiche: string;
  bio?: string;
  avatar_url?: string | null;
  nombre_agents: number;
};

export function CreateurCard({ createur }: { createur: CreateurResume }) {
  const nom = createur.nom_affiche || "Créateur sans nom";
  const [nombreAbonnes, setNombreAbonnes] = useState<number | null>(null);

  useEffect(() => {
    let annule = false;
    appelerApi(`/api/creators/${createur.user_id}/follow`)
      .then((r: { total: number }) => {
        if (!annule) setNombreAbonnes(r.total);
      })
      .catch(() => {
        if (!annule) setNombreAbonnes(null);
      });
    return () => {
      annule = true;
    };
  }, [createur.user_id]);

  return (
    <div className="flex items-center gap-4 rounded-[2rem] border border-dj-bordure bg-dj-surface px-5 py-4 transition-colors hover:border-dj-bordure-forte">
      <Link href={`/u/${createur.user_id}`} className="flex min-w-0 flex-1 items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-dj-surface-haute">
          {createur.avatar_url ? (
            <Image
              src={createur.avatar_url}
              alt={nom}
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xl">🙂</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-bold text-dj-texte">{nom}</h3>
          {createur.bio && (
            <p className="mt-1 line-clamp-1 text-sm text-dj-texte-muet">{createur.bio}</p>
          )}
        </div>
      </Link>

      <span className="shrink-0 rounded-xl border border-dj-bordure px-4 py-1.5 text-sm text-dj-texte-muet">
        {nombreAbonnes !== null ? `${nombreAbonnes} abonné${nombreAbonnes !== 1 ? "s" : ""}` : "…"}
      </span>
    </div>
  );
}

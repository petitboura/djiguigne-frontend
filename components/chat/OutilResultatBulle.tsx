"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { OUTILS_DISPONIBLES } from "./BarreDeSaisie";

// Affiche, pour CHAQUE outil utilisé, ce qu'il a concrètement exécuté /
// retourné -- dans sa propre section, avec l'icône de cet outil précis.
// Généralisé (26/07, demande Bourama) : distinct du raisonnement libre du
// modèle (RaisonnementBulle.tsx), qui peut paraphraser/mélanger ce même
// contenu avec d'autres réflexions dans son propre texte -- constaté en
// test réel (le modèle recopiait des résultats de recherche dans sa
// pensée). Ici, c'est le VRAI contenu brut renvoyé par l'outil (tronqué à
// l'affichage côté backend, voir _resultat_pour_affichage), pas ce que le
// modèle en a compris ou raconté.
//
// Consomme les événements SSE {"type": "outil_resultat", "nom_outil",
// "nom_lisible", "resultat"} émis par core/main.py -- un par appel
// d'outil, donc PLUSIEURS instances possibles sur un même message (ex:
// deux recherches Tavily) : ChatIA.tsx les accumule en liste, pas de
// dédoublonnage (deux appels au même outil peuvent renvoyer des résultats
// différents).
//
// Icône reprise de OUTILS_DISPONIBLES (déjà utilisée pour le bouton
// Outils, voir BarreDeSaisie.tsx) -- pas de liste séparée à maintenir.
// Repli sur une icône générique (Wrench) pour tout outil absent de cette
// liste (Notion, Wolfram, ou n'importe quel outil futur) : le principe
// général de cette session est de ne jamais dépendre d'une liste figée.
function iconePourOutil(nomOutil: string) {
  return OUTILS_DISPONIBLES.find((o) => o.nom === nomOutil)?.Icone ?? Wrench;
}

export function OutilResultatBulle({
  resultats,
}: {
  resultats?: { nomOutil: string; nomLisible: string; resultat: string }[];
}) {
  const [replies, setReplies] = useState<Record<number, boolean>>({});

  if (!resultats || !resultats.length) return null;

  return (
    <div className="my-1.5 flex max-w-[85%] flex-col gap-1">
      {resultats.map((r, index) => {
        const Icone = iconePourOutil(r.nomOutil);
        const ouvert = replies[index] !== false; // ouvert par défaut, comme SourcesBulle
        return (
          <div key={index} className="animate-dj-fade-in">
            <button
              onClick={() => setReplies((prec) => ({ ...prec, [index]: !ouvert }))}
              className="flex items-center gap-1.5 text-[13px] text-dj-texte-muet transition-colors hover:text-dj-texte"
            >
              <Icone size={13} />
              <span>{r.nomLisible}</span>
              {ouvert ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            {ouvert && (
              <pre className="mt-1.5 max-h-64 overflow-auto rounded-xl border border-dj-bordure bg-dj-surface p-2.5 text-[12px] leading-relaxed text-dj-texte-muet">
                {r.resultat}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

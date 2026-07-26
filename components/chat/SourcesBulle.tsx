"use client";

import { ExternalLink } from "lucide-react";

// Affiche les sources/citations d'une réponse -- consomme les événements
// SSE {"type": "sources", "sources": [{"titre", "url"}]} émis par
// core/main.py:_extraire_sources() (session du 2026-07-26, suite à
// l'audit de la checklist Notion "Affichage" : la doc marquait ce point
// "Fait", mais aucun composant frontend ne consommait réellement
// l'événement -- il était silencieusement ignoré par ChatIA.tsx).
//
// Backend générique (n'importe quel outil futur qui renvoie la même
// forme de JSON est couvert automatiquement, voir docstring de
// _extraire_sources) -- ce composant, lui, est volontairement "bête" :
// une liste de puces numérotées cliquables, sans logique par outil.
// Dédoublonnage par URL fait côté ChatIA.tsx (accumulation au fil du
// stream, plusieurs appels d'outils pouvant chacun produire des sources).
export function SourcesBulle({ sources }: { sources: { titre: string; url: string }[] }) {
  if (!sources.length) return null;

  return (
    <div className="my-1.5 flex max-w-[80%] flex-wrap items-center gap-1.5 animate-dj-fade-in">
      {sources.map((source, index) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          title={source.titre}
          className="flex max-w-[220px] items-center gap-1 rounded-full border border-dj-bordure px-2.5 py-1 text-[12px] text-dj-texte-muet transition-colors hover:text-dj-texte"
        >
          <span className="shrink-0 font-semibold text-dj-accent-1">{index + 1}</span>
          <span className="truncate">{source.titre}</span>
          <ExternalLink size={11} className="shrink-0" />
        </a>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Link2 } from "lucide-react";

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
// une liste de puces cliquables, sans logique par outil. Dédoublonnage
// par URL et persistance sur le message (plutôt qu'un state séparé qui
// disparaissait à la question suivante) faits côté ChatIA.tsx.
//
// Repliable ajouté le 26/07 (retour Bourama, même principe que
// RaisonnementBulle.tsx : bouton avec flèche à LA FIN, pas au début).
// Ouvert par défaut (contrairement au raisonnement, pas de notion "en
// cours" ici -- les sources sont déjà un résultat final dès qu'elles
// arrivent) ; l'état manuel de la personne est respecté une fois qu'elle
// a cliqué.

function Favicon({ url }: { url: string }) {
  const [enErreur, setEnErreur] = useState(false);

  if (enErreur) return <ExternalLink size={12} className="shrink-0 text-dj-texte-muet" />;

  let domaine: string;
  try {
    domaine = new URL(url).hostname;
  } catch {
    return <ExternalLink size={12} className="shrink-0 text-dj-texte-muet" />;
  }

  return (
    // Service favicon public de Google -- pas d'appel supplémentaire côté
    // notre backend, déduit uniquement du domaine de l'URL déjà connue.
    // onError couvre les domaines sans favicon indexé (repli sur
    // l'icône générique plutôt qu'une image cassée).
    <img
      src={`https://www.google.com/s2/favicons?sz=32&domain=${domaine}`}
      alt=""
      width={12}
      height={12}
      className="shrink-0 rounded-[2px]"
      onError={() => setEnErreur(true)}
    />
  );
}

export function SourcesBulle({ sources }: { sources?: { titre: string; url: string }[] }) {
  const [ouvert, setOuvert] = useState(true);

  if (!sources || !sources.length) return null;

  return (
    <div className="my-1.5 max-w-[80%] animate-dj-fade-in">
      <button
        onClick={() => setOuvert((v) => !v)}
        className="flex items-center gap-1.5 text-[13px] text-dj-texte-muet transition-colors hover:text-dj-texte"
      >
        <Link2 size={13} />
        <span>{sources.length > 1 ? `${sources.length} sources` : "1 source"}</span>
        {ouvert ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {ouvert && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {sources.map((source, index) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              title={source.titre}
              className="flex max-w-[220px] items-center gap-1 rounded-full border border-dj-bordure px-2.5 py-1 text-[12px] text-dj-texte-muet transition-colors hover:text-dj-texte"
            >
              <Favicon url={source.url} />
              <span className="truncate">{source.titre}</span>
              <sup className="shrink-0 font-semibold text-dj-accent-1">{index + 1}</sup>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

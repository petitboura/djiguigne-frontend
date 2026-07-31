"use client";

import { useEffect, useState } from "react";

let compteurMermaid = 0;

// Rend un diagramme Mermaid (flowchart, sequence, gantt, state...) à
// partir du texte source d'un bloc ```mermaid détecté dans BlocCode.tsx.
//
// mermaid.js manipule le DOM lui-même et n'est pas conçu pour le SSR --
// import dynamique + rendu uniquement après montage (useEffect), comme
// tout composant "client-only" dans ce projet Next.js. Pendant que
// mermaid.render() tourne (souvent <100ms mais peut prendre plus sur un
// gros diagramme), on affiche un espace réservé discret de la même
// famille visuelle que les autres blocs -- jamais le texte source
// ```mermaid brut à l'écran, jamais de saut de layout quand le SVG
// apparaît (le conteneur est déjà là, on fait juste un fondu dessus).
//
// definitionsRendues : le texte source arrive progressivement pendant le
// streaming (voir throttling dans BulleMessage.tsx) -- on ne relance
// mermaid.render() que quand le texte a fini de changer pendant 400ms,
// pas à chaque caractère (un diagramme incomplet ne parse de toute façon
// pas, et re-render en boucle est coûteux).
export function Mermaid({ definition }: { definition: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sourceAffichee, setSourceAffichee] = useState(false);

  useEffect(() => {
    let annule = false;
    const delai = setTimeout(async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          // CORRECTIF 2026-07-30 (audit sécurité) : sans ce réglage
          // explicite, le niveau de sécurité de mermaid dépend de sa
          // valeur par défaut -- qui a changé plusieurs fois selon les
          // versions de la librairie. Le SVG produit est injecté tel quel
          // via dangerouslySetInnerHTML juste en dessous ; en mode
          // "strict", mermaid nettoie (DOMPurify) tout HTML/script qu'un
          // diagramme pourrait contenir dans le texte d'un nœud -- utile
          // en particulier si ce texte provient, via le modèle, d'un
          // contenu externe (page web lue par l'agent, dépôt GitHub...).
          securityLevel: "strict",
          // Sans ça, mermaid ne lève JAMAIS d'exception sur une erreur de
          // syntaxe : render() "réussit" quand même, avec un SVG contenant
          // son propre dessin d'erreur générique (icône bombe "Syntax
          // error in text", sans aucun détail exploitable). Repéré par
          // Bourama en test réel -- le catch plus bas ne se déclenchait
          // jamais pour cette raison précise. Avec cette option (mermaid
          // 10.3+), render() lève une vraie exception avec le message
          // d'erreur réel du parseur.
          suppressErrorRendering: true,
          themeVariables: {
            background: "#161210",
            primaryColor: "#1E1813",
            primaryTextColor: "#F5ECE0",
            primaryBorderColor: "#E8934A",
            lineColor: "#A79A8C",
            secondaryColor: "#161210",
            tertiaryColor: "#0B0908",
          },
          fontFamily: "var(--font-inter), sans-serif",
        });
        const { svg: svgRendu } = await mermaid.render(`mermaid-${++compteurMermaid}`, definition);
        if (!annule) {
          setSvg(svgRendu);
          setErreur(null);
        }
      } catch (e) {
        // 2026-07-20 (Bourama : "le mermaid ne marche même plus, il doit
        // avoir une limite peut-être") -- jusqu'ici cette erreur était
        // avalée en silence (juste "en cours de construction..." pour
        // toujours), impossible de savoir si c'était : un diagramme
        // encore incomplet en plein streaming (normal, transitoire), une
        // vraie limite de mermaid (ex: maxTextSize/maxEdges dépassé sur
        // un gros diagramme), ou une syntaxe que cette version de
        // mermaid ne supporte pas. On affiche désormais le message
        // d'erreur réel -- s'il reste affiché après la fin du streaming,
        // ce N'EST PAS un diagramme incomplet.
        if (!annule) setErreur(e instanceof Error ? e.message : String(e));
      }
    }, 400);

    return () => {
      annule = true;
      clearTimeout(delai);
    };
  }, [definition]);

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-dj-bordure bg-dj-surface p-4">
      {svg ? (
        <div
          className="animate-dj-fade-in [&_svg]:mx-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : erreur ? (
        <div className="space-y-2">
          <p className="text-xs text-dj-texte-muet">
            <span className="text-[#f87171]">Erreur de rendu du diagramme :</span> {erreur}
          </p>
          <button
            onClick={() => setSourceAffichee((v) => !v)}
            className="text-[11px] text-dj-accent-1 hover:text-dj-accent-2"
          >
            {sourceAffichee ? "Masquer" : "Voir"} le code source
          </button>
          {sourceAffichee && (
            <pre className="overflow-x-auto rounded-lg bg-[#100c09] px-3 py-2 font-mono text-[12px] text-dj-texte-muet">
              {definition}
            </pre>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-dj-texte-muet">
          <span className="h-2 w-2 animate-dj-glow rounded-full bg-dj-accent-1" />
          Rendu du diagramme...
        </div>
      )}
    </div>
  );
}

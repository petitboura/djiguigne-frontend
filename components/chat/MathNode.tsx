"use client";

/**
 * Noeud TipTap "maths" -- un `<math-field>` MathLive live, éditable,
 * embarqué inline dans le document de EditeurMathsRiche.tsx.
 *
 * Contexte (01/08, demande Bourama) : "un éditeur de latex live, un vrai,
 * comme barre de saisie à part -- pas du code dans la barre de saisie".
 * Reprend le web component déjà validé dans EditeurFormule.tsx (popup à
 * une seule formule) mais ici embarqué comme noeud d'un document riche
 * TipTap, pour pouvoir mélanger texte normal et formules live à la suite,
 * plusieurs fois, dans un seul document -- ce que le popup ne permettait
 * pas.
 *
 * Choix delibéré (option C retenue par Bourama) : un vrai éditeur riche
 * (ProseMirror via TipTap) plutôt que le composeur segmenté "option B" --
 * TipTap gère le curseur unique traversant texte/maths/texte, l'historique
 * d'undo, la sélection -- ce que l'option B (des champs séparés) n'aurait
 * pas donné. Ce composant N'EST PAS branché sur le textarea existant de
 * BarreDeSaisie.tsx (demande explicite : "à part, pas touche au clavier
 * existant") -- voir EditeurMathsRiche.tsx pour le document complet et
 * le point d'insertion unique (un texte sérialisé) vers le message.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import type { MathfieldElement } from "mathlive";

// Le type global JSX pour <math-field> est déjà déclaré dans
// EditeurFormule.tsx (même custom element MathLive) -- ne pas le
// redéclarer ici : une deuxième déclaration avec un jeu de props
// légèrement différent fait échouer la fusion de déclarations TypeScript
// (TS2717) sur les deux fichiers à la fois.

function VueNoeudMaths({ node, updateAttributes, selected }: NodeViewProps) {
  const mathfieldRef = useRef<MathfieldElement | null>(null);
  const [mathliveInstalle, setMathliveInstalle] = useState(false);

  useEffect(() => {
    import("mathlive").then(() => setMathliveInstalle(true));
  }, []);

  // Valeur initiale posée une seule fois à l'enregistrement du custom
  // element (même piège que EditeurFormule.tsx : poser .value avant que
  // <math-field> soit vraiment défini ne fait rien).
  useEffect(() => {
    if (!mathliveInstalle || !mathfieldRef.current) return;
    if (mathfieldRef.current.value !== node.attrs.latex) {
      mathfieldRef.current.value = node.attrs.latex || "";
    }
  }, [mathliveInstalle]);

  useEffect(() => {
    const champ = mathfieldRef.current;
    if (!champ) return;
    function surChangement() {
      updateAttributes({ latex: champ!.value });
    }
    champ.addEventListener("input", surChangement);
    return () => champ.removeEventListener("input", surChangement);
  }, [mathliveInstalle, updateAttributes]);

  return (
    <NodeViewWrapper
      as="span"
      className={`mx-0.5 inline-block rounded-md border px-1.5 py-0.5 align-middle ${
        selected ? "border-dj-accent-1 ring-1 ring-dj-accent-1" : "border-dj-bordure"
      }`}
      contentEditable={false}
    >
      {mathliveInstalle ? (
        <math-field ref={mathfieldRef} style={{ minWidth: "1.5rem", display: "inline-block" }}>
          {node.attrs.latex || ""}
        </math-field>
      ) : (
        <span className="text-xs text-dj-texte-muet">…</span>
      )}
    </NodeViewWrapper>
  );
}

export const NoeudMaths = Node.create({
  name: "maths",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-latex") || "",
        renderHTML: (attributs) => ({ "data-latex": attributs.latex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-latex]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VueNoeudMaths);
  },
});

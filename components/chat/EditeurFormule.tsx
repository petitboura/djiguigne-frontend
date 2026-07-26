"use client";

import { useEffect, useRef, useState } from "react";
import { X, Sigma, FlaskConical } from "lucide-react";
import katex from "katex";
import "katex/contrib/mhchem/mhchem.js";
import type { MathfieldElement } from "mathlive";

// Éditeur de formule inline (2026-07-25, demande de Bourama : un deuxième
// mode de saisie où on CLIQUE des symboles au lieu de taper du LaTeX à la
// main, avec un rendu qui se construit en direct -- pas juste du texte
// brut qui ne devient une vraie formule qu'une fois le message envoyé.
// Option A retenue (voir échange avec Bourama) : une bulle qui s'ouvre
// au-dessus du champ de saisie plutôt qu'une refonte du textarea en
// éditeur riche (Option B, mise de côté pour l'instant) -- le résultat
// s'insère comme texte source ($...$) à l'endroit du curseur, et la
// personne continue de taper sa phrase normalement après.
//
// Maths : MathLive (<math-field>), web component fait pour ça --
// rendu live pendant la construction, insertion de symboles au clic via
// `.insert()`. Chimie : pas d'équivalent MathLive -- palette maison +
// aperçu KaTeX/mhchem (`\ce{...}`, extension chargée ci-dessus), syntaxe
// différente du LaTeX maths (voir explication donnée à Bourama).

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<React.HTMLAttributes<MathfieldElement>, MathfieldElement> & {
        theme?: string;
        "math-virtual-keyboard-policy"?: string;
      };
    }
  }
}

const SYMBOLES_MATHS: [string, string][] = [
  ["√", "\\sqrt{#0}"], ["x²", "#0^{2}"], ["xⁿ", "#0^{#0}"], ["a/b", "\\frac{#0}{#0}"],
  ["∫", "\\int_{#0}^{#0}"], ["Σ", "\\sum_{#0}^{#0}"], ["∞", "\\infty"], ["π", "\\pi"],
  ["∈", "\\in"], ["∉", "\\notin"], ["⊂", "\\subset"], ["∅", "\\emptyset"],
  ["≤", "\\leq"], ["≥", "\\geq"], ["≠", "\\neq"], ["≈", "\\approx"],
  ["→", "\\to"], ["±", "\\pm"], ["θ", "\\theta"], ["Δ", "\\Delta"],
];

const SYMBOLES_CHIMIE: [string, string][] = [
  ["→", "->"], ["⇌", "<=>"], ["+", " + "],
  ["indice₂", "_2"], ["indice₃", "_3"], ["charge⁺", "^+"], ["charge⁻", "^-"],
  ["(s)", "(s)"], ["(l)", "(l)"], ["(g)", "(g)"], ["(aq)", "(aq)"],
  ["Δ", "\\Delta"], ["H₂O", "H2O"], ["CO₂", "CO2"],
];

export function EditeurFormule({
  onInserer,
  onFermer,
}: {
  onInserer: (texteLatex: string) => void;
  onFermer: () => void;
}) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const clavierConteneurRef = useRef<HTMLDivElement>(null);
  const [onglet, setOnglet] = useState<"maths" | "chimie">("maths");
  const mathfieldRef = useRef<MathfieldElement | null>(null);
  const [valeurChimie, setValeurChimie] = useState("");
  const inputChimieRef = useRef<HTMLInputElement>(null);
  // "mathlive" définit un custom element (<math-field>) en touchant des
  // API navigateur au chargement -- importé dynamiquement ici plutôt
  // qu'en haut du fichier pour ne jamais s'exécuter côté serveur (Next.js
  // fait quand même tourner le code des modules "use client" importés
  // statiquement au moment du rendu serveur, même si le composant lui-même
  // ne s'affiche pas encore).
  const [mathliveInstalle, setMathliveInstalle] = useState(false);
  useEffect(() => {
    import("mathlive").then(() => setMathliveInstalle(true));
  }, []);

  // Par défaut, MathLive ajoute le panneau du clavier virtuel comme enfant
  // direct de <body> (position fixe, pleine largeur, collé en bas de
  // l'écran) -- c'est ce qui le fait apparaître complètement détaché du
  // popup. La lib expose `mathVirtualKeyboard.container` pour rediriger ce
  // panneau vers un élément précis (prévu à l'origine pour les éléments
  // plein écran) -- on le pointe vers une div dédiée à l'intérieur de la
  // bulle, pour qu'il s'affiche comme une section normale du popup plutôt
  // qu'ancré à la fenêtre. Restauré au démontage pour ne pas affecter un
  // futur mathfield ailleurs dans l'app.
  useEffect(() => {
    if (!mathliveInstalle || !clavierConteneurRef.current) return;
    window.mathVirtualKeyboard.container = clavierConteneurRef.current;
    return () => {
      window.mathVirtualKeyboard.container = null;
    };
  }, [mathliveInstalle]);

  // Le panneau du clavier virtuel de MathLive est injecté au niveau de
  // <body>, pas dans le shadow DOM du <math-field> -- son thème se règle
  // donc là, pas sur le champ lui-même. Retiré à la fermeture pour ne pas
  // laisser un attribut global qui ne concerne que cet éditeur.
  useEffect(() => {
    const valeurPrecedente = document.body.getAttribute("theme");
    document.body.setAttribute("theme", "dark");
    return () => {
      if (valeurPrecedente === null) document.body.removeAttribute("theme");
      else document.body.setAttribute("theme", valeurPrecedente);
    };
  }, []);

  // Rendu direct de la formule chimie pendant la construction (même
  // principe que MathLive côté maths, mais fait main puisqu'il n'y a pas
  // de composant équivalent pour mhchem).
  const [previsuChimie, setPrevisuChimie] = useState("");
  useEffect(() => {
    if (!valeurChimie.trim()) {
      setPrevisuChimie("");
      return;
    }
    try {
      setPrevisuChimie(katex.renderToString(`\\ce{${valeurChimie}}`, { throwOnError: false, displayMode: true }));
    } catch {
      setPrevisuChimie("");
    }
  }, [valeurChimie]);

  function insererSymboleChimie(snippet: string) {
    const el = inputChimieRef.current;
    const debut = el?.selectionStart ?? valeurChimie.length;
    const fin = el?.selectionEnd ?? valeurChimie.length;
    const nouvelleValeur = valeurChimie.slice(0, debut) + snippet + valeurChimie.slice(fin);
    setValeurChimie(nouvelleValeur);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = debut + snippet.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  // Le clavier virtuel de MathLive ne se referme pas tout seul quand
  // cette bulle se ferme (X/Annuler/Insérer) -- fermeture explicite via
  // l'API globale, sinon il reste ouvert à l'écran sans plus aucun moyen
  // de le fermer une fois la bulle elle-même disparue.
  useEffect(() => {
    return () => {
      window.mathVirtualKeyboard?.hide();
    };
  }, []);

  function fermer() {
    window.mathVirtualKeyboard?.hide();
    onFermer();
  }

  // Clic en dehors de la bulle -- ET en dehors du clavier virtuel de
  // MathLive, qui n'est PAS un enfant DOM de cette bulle (il est injecté
  // directement dans <body> par MathLive) -- ferme l'éditeur. Sans
  // l'exclusion du clavier, cliquer sur un symbole de SON clavier à lui
  // fermerait notre bulle par erreur. Retour Bourama (25/07) : un clic
  // extérieur ne doit PAS jeter ce qui était en cours de construction --
  // insère si quelque chose a été tapé, ferme sans rien insérer sinon.
  useEffect(() => {
    function gererClicExterieur(e: MouseEvent) {
      const cible = e.target as HTMLElement;
      if (conteneurRef.current?.contains(cible)) return;
      if (cible.closest(".ML__keyboard")) return;
      if (cible.closest("[data-editeur-formule-trigger]")) return;
      const aDuContenu = onglet === "maths" ? !!mathfieldRef.current?.value?.trim() : !!valeurChimie.trim();
      if (aDuContenu) valider();
      else fermer();
    }
    document.addEventListener("mousedown", gererClicExterieur);
    return () => document.removeEventListener("mousedown", gererClicExterieur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onglet, valeurChimie]);

  function valider() {
    window.mathVirtualKeyboard?.hide();
    if (onglet === "maths") {
      const latex = mathfieldRef.current?.value?.trim();
      if (latex) onInserer(`$${latex}$`);
    } else {
      if (valeurChimie.trim()) onInserer(`$\\ce{${valeurChimie.trim()}}$`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-dj-fade-in items-center justify-center bg-black/70 p-6">
      <div ref={conteneurRef} className="w-full max-w-xl rounded-2xl border border-dj-bordure bg-dj-surface-haute p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-lg bg-dj-surface p-1">
            <button
              onClick={() => setOnglet("maths")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${
                onglet === "maths" ? "bg-dj-surface-haute text-dj-texte" : "text-dj-texte-muet"
              }`}
            >
              <Sigma size={14} /> Maths
            </button>
            <button
              onClick={() => setOnglet("chimie")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${
                onglet === "chimie" ? "bg-dj-surface-haute text-dj-texte" : "text-dj-texte-muet"
              }`}
            >
              <FlaskConical size={14} /> Chimie
            </button>
          </div>
          <button onClick={fermer} aria-label="Fermer" className="text-dj-texte-muet hover:text-dj-texte">
            <X size={16} />
          </button>
        </div>

        {onglet === "maths" ? (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {SYMBOLES_MATHS.map(([label, snippet]) => (
                <button
                  key={label}
                  onClick={() => mathfieldRef.current?.insert(snippet, { selectionMode: "placeholder" })}
                  className="rounded-md border border-dj-bordure px-2 py-1 text-sm text-dj-texte hover:bg-dj-surface"
                >
                  {label}
                </button>
              ))}
            </div>
            <math-field
              ref={mathfieldRef}
              math-virtual-keyboard-policy="manual"
              theme="dark"
              className="w-full rounded-lg border border-dj-bordure bg-dj-surface px-3 py-3 text-lg text-dj-texte"
            />
            {!mathliveInstalle && <p className="mt-1 text-xs text-dj-texte-muet">Chargement de l'éditeur...</p>}
            <div ref={clavierConteneurRef} className="mt-2 overflow-hidden rounded-lg" />
          </>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {SYMBOLES_CHIMIE.map(([label, snippet]) => (
                <button
                  key={label}
                  onClick={() => insererSymboleChimie(snippet)}
                  className="rounded-md border border-dj-bordure px-2 py-1 text-sm text-dj-texte hover:bg-dj-surface"
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              ref={inputChimieRef}
              value={valeurChimie}
              onChange={(e) => setValeurChimie(e.target.value)}
              placeholder="Ex: 2H2 + O2 -> 2H2O"
              className="mb-2 w-full rounded-lg border border-dj-bordure bg-dj-surface px-3 py-2 text-sm text-dj-texte outline-none"
            />
            {previsuChimie && (
              <div
                className="overflow-x-auto rounded-lg border border-dj-bordure bg-white p-3"
                dangerouslySetInnerHTML={{ __html: previsuChimie }}
              />
            )}
          </>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={fermer}
            className="rounded-lg border border-dj-bordure px-3 py-1.5 text-xs text-dj-texte-muet hover:text-dj-texte"
          >
            Annuler
          </button>
          <button onClick={valider} className="rounded-lg bg-dj-accent-1 px-4 py-1.5 text-xs font-medium text-white">
            Insérer
          </button>
        </div>
      </div>
    </div>
  );
}

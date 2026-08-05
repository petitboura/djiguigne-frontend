"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MATIERES } from "@/lib/matieres";

// Demande de Bourama (2026-07-27) : "Devenir créateur" ne doit plus se
// contenter d'un lien vers /about -- le clic doit ouvrir un flow direct
// en plusieurs temps (explication -> choix de catégorie -> liste ou
// champ libre selon la catégorie) puis amener au formulaire de création
// d'agent existant (dashboard/agents/nouveau), SANS rien changer à ce
// formulaire lui-même à part la lecture des paramètres d'URL en
// pré-remplissage.
//
// Rattrapé le 05/08 sur la version djiguigne-ai (vitrine) : à l'origine
// ce composant ne connaissait que "matière" (liste fixe + Autre), même
// pour les catégories Métier/Filière/Domaine/Langues africaines/
// Exécution -- il proposait quand même "Choisis ta matière", jamais la
// bonne catégorie. Ajout d'une étape intermédiaire "Choisis une
// catégorie" pour les cas où le contexte n'est pas déjà connu (CTA de la
// page sans catégorie ouverte). Quand le contexte EST déjà connu (bouton
// affiché dans l'état vide d'une section déjà ouverte dans
// SelecteurAgent), la prop `categoriePreselectionnee` saute directement
// cette étape.
//
// Contrairement à la vitrine (qui a un système i18n et reçoit ces
// libellés en props), l'app n'a pas encore de dictionnaire multi-langue
// -- les libellés des catégories et du flow "catégorie"/"champ libre"
// restent donc en dur ici, comme le reste de ce composant et de
// SelecteurAgent.tsx. Seule "Matières" a une vraie liste fixe (+ Autre,
// voir MATIERES) ; les 5 autres catégories texte libre (Métier/Filière/
// Domaine/Langues africaines/Exécution) sont en base sous forme de
// colonnes texte libre -- pas de liste possible pour elles, un simple
// champ texte fait office de leur "Autre" (mêmes paramètres que lus par
// PageCreerAgent, voir app/dashboard/agents/nouveau/page.tsx).
export type CleSection = "matieres" | "metier" | "filiere" | "domaine" | "languesAfricaines" | "execution";

const LABELS_CATEGORIE: Record<CleSection, string> = {
  matieres: "Matières",
  metier: "Métier",
  filiere: "Filière",
  domaine: "Domaine",
  languesAfricaines: "Langues africaines",
  execution: "Exécution",
};

// Nom du paramètre de query string lu par PageCreerAgent pour chaque
// catégorie texte libre (Matières a son propre paramètre `matiere`, géré
// séparément par l'étape "matiere" ci-dessous).
const PARAM_PAR_SECTION: Partial<Record<CleSection, string>> = {
  metier: "metier",
  filiere: "filiere",
  domaine: "domaine",
  languesAfricaines: "langue_africaine",
  execution: "execution",
};

type Etape = "ferme" | "explication" | "categorie" | "matiere" | "champLibre";

export function BoutonDevenirCreateur({
  label,
  explicationTitre,
  explicationCorps,
  continuerLabel,
  annulerLabel,
  categoriePreselectionnee,
}: {
  label: string;
  explicationTitre: string;
  explicationCorps: string;
  continuerLabel: string;
  annulerLabel: string;
  // Contexte déjà connu (ex : section "Métier" déjà ouverte quand ce
  // bouton s'affiche dans son état vide) -- saute l'étape "categorie".
  categoriePreselectionnee?: CleSection | null;
}) {
  const router = useRouter();
  const [monte, setMonte] = useState(false);
  const [etape, setEtape] = useState<Etape>("ferme");
  const [categorieChoisie, setCategorieChoisie] = useState<CleSection | null>(null);
  const [valeurLibre, setValeurLibre] = useState("");

  useEffect(() => setMonte(true), []);

  function fermer() {
    setEtape("ferme");
    setCategorieChoisie(null);
    setValeurLibre("");
  }

  function choisirCategorie(cle: CleSection) {
    if (cle === "matieres") {
      setEtape("matiere");
    } else {
      setCategorieChoisie(cle);
      setEtape("champLibre");
    }
  }

  function passerAEtapeSuivante() {
    if (categoriePreselectionnee) {
      choisirCategorie(categoriePreselectionnee);
    } else {
      setEtape("categorie");
    }
  }

  function choisirMatiere(matiere: string) {
    fermer();
    router.push(`/dashboard/agents/nouveau?matiere=${encodeURIComponent(matiere)}`);
  }

  function validerChampLibre() {
    if (!categorieChoisie || !valeurLibre.trim()) return;
    const param = PARAM_PAR_SECTION[categorieChoisie];
    if (!param) return;
    const valeur = valeurLibre.trim();
    fermer();
    router.push(`/dashboard/agents/nouveau?${param}=${encodeURIComponent(valeur)}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setEtape("explication")}
        className="rounded-full border border-dj-bordure px-6 py-3 text-sm font-semibold text-dj-texte transition-colors hover:border-dj-bordure-forte"
      >
        {label}
      </button>

      {monte &&
        etape === "explication" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={fermer}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-dj-bordure bg-dj-surface p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-lg font-bold text-dj-texte">
                {explicationTitre}
              </h2>
              <p className="mt-3 text-sm text-dj-texte-muet">{explicationCorps}</p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={fermer}
                  className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
                >
                  {annulerLabel}
                </button>
                <button
                  type="button"
                  onClick={passerAEtapeSuivante}
                  className="rounded-full bg-dj-gradient px-4 py-2 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5"
                >
                  {continuerLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {monte &&
        etape === "categorie" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={fermer}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-dj-bordure bg-dj-surface p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-lg font-bold text-dj-texte">Choisis une catégorie</h2>
              <div className="mt-4 flex flex-col gap-2">
                {(
                  ["matieres", "metier", "filiere", "domaine", "languesAfricaines", "execution"] as const
                ).map((cle) => (
                  <button
                    key={cle}
                    type="button"
                    onClick={() => choisirCategorie(cle)}
                    className="rounded-lg border border-dj-bordure bg-dj-surface-haute px-4 py-2.5 text-left text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
                  >
                    {LABELS_CATEGORIE[cle]}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      {monte &&
        etape === "matiere" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={fermer}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-dj-bordure bg-dj-surface p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-lg font-bold text-dj-texte">
                {LABELS_CATEGORIE.matieres}
              </h2>
              <div className="mt-4 flex flex-col gap-2">
                {MATIERES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => choisirMatiere(m)}
                    className="rounded-lg border border-dj-bordure bg-dj-surface-haute px-4 py-2.5 text-left text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
                  >
                    {m}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => choisirMatiere("Autre")}
                  className="rounded-lg border border-dj-bordure bg-dj-surface-haute px-4 py-2.5 text-left text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
                >
                  Autre
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {monte &&
        etape === "champLibre" &&
        categorieChoisie &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={fermer}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-dj-bordure bg-dj-surface p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-lg font-bold text-dj-texte">
                {LABELS_CATEGORIE[categorieChoisie]}
              </h2>
              <input
                type="text"
                autoFocus
                value={valeurLibre}
                onChange={(e) => setValeurLibre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && validerChampLibre()}
                placeholder="Tape ta réponse..."
                className="mt-4 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-4 py-2.5 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte"
              />
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={validerChampLibre}
                  disabled={!valeurLibre.trim()}
                  className="rounded-full bg-dj-gradient px-4 py-2 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-40"
                >
                  Valider
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MATIERES } from "@/lib/matieres";

// Demande de Bourama (2026-07-27) : "Devenir créateur" ne doit plus se
// contenter d'un lien vers /about -- le clic doit ouvrir un flow direct
// en 2 temps (explication -> choix de la matière) puis amener au
// formulaire de création d'agent existant (dashboard/agents/nouveau),
// SANS rien changer à ce formulaire lui-même ("tout reste comme tel").
// La matière choisie ici est transmise via ?matiere=<nom>, lue par
// PageCreerAgent pour la présélectionner (liste fixe -- même source que
// le bloc "Matières" du formulaire, plus le picker "Catégorie" en base).
export function BoutonDevenirCreateur({
  label,
  explicationTitre,
  explicationCorps,
  continuerLabel,
  annulerLabel,
}: {
  label: string;
  explicationTitre: string;
  explicationCorps: string;
  continuerLabel: string;
  annulerLabel: string;
}) {
  const router = useRouter();
  const [monte, setMonte] = useState(false);
  const [etape, setEtape] = useState<"ferme" | "explication" | "matiere">("ferme");

  useEffect(() => setMonte(true), []);

  function choisirMatiere(matiere: string) {
    setEtape("ferme");
    router.push(`/dashboard/agents/nouveau?matiere=${encodeURIComponent(matiere)}`);
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
            onClick={() => setEtape("ferme")}
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
                  onClick={() => setEtape("ferme")}
                  className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
                >
                  {annulerLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setEtape("matiere")}
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
        etape === "matiere" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setEtape("ferme")}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-dj-bordure bg-dj-surface p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-lg font-bold text-dj-texte">Choisis ta matière</h2>
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
    </>
  );
}

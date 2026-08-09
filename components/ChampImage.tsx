"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { appelerApiFichier } from "@/lib/api";
import { RecadreurImage } from "@/components/RecadreurImage";

// Fix du 2026-07-12 (bug remonté par Bourama, captures d'écran
// /dashboard/agents/nouveau et /dashboard) : les champs "URL image de
// vitrine" / "URL avatar" demandaient de coller un lien à la main — pas
// utilisable pour quelqu'un de non-technique. Remplacés par un vrai
// upload de fichier vers Supabase Storage, via le nouveau endpoint
// POST /api/uploads/image (voir api/uploads.py, ajouté à cette étape).
//
// Fix du 2026-07-12 (bis, même jour) : Bourama a signalé juste après
// qu'on ne pouvait pas cadrer/recadrer l'image envoyée — elle était
// uploadée telle quelle. Ajout d'une étape de recadrage (voir
// RecadreurImage.tsx) entre la sélection du fichier et l'upload : c'est
// désormais le fichier RECADRÉ (pas l'original) qui part vers l'API.
// L'aspect ratio du cadrage est déduit de `rond` (avatar carré/rond) vs
// vitrine (16:9, même ratio que son affichage dans AgentCard/agent/[id]),
// pas une nouvelle prop à part : ça évite de devoir mettre à jour tous
// les endroits qui utilisent déjà ce composant.

// Fix du 2026-07-12 (ter, même jour) : Bourama a signalé qu'il fallait
// aussi pouvoir recadrer une image DÉJÀ existante (pas seulement au
// moment de l'upload) -- ajout d'un bouton "Recadrer" à côté de "Changer
// l'image"/"Supprimer", qui rouvre RecadreurImage directement sur l'URL
// actuelle (voir RecadreurImage.tsx, prop `source` qui accepte maintenant
// une URL en plus d'un nouveau fichier).

export function ChampImage({
  valeur,
  onChange,
  label,
  rond = false,
}: {
  valeur: string;
  onChange: (url: string) => void;
  label: string;
  rond?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sourceACadrer, setSourceACadrer] = useState<File | string | null>(null);

  const aspect = rond ? 1 : 16 / 9;

  function gererSelection(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setErreur(null);
    // Pas d'upload immédiat : on ouvre d'abord le recadrage, l'upload ne
    // part qu'après validation (voir envoyerImageCadree).
    setSourceACadrer(fichier);
  }

  async function envoyerImageCadree(blob: Blob) {
    setSourceACadrer(null);
    setEnvoi(true);
    try {
      const fichierCadre = new File([blob], "image-recadree.jpg", { type: "image/jpeg" });
      const reponse = await appelerApiFichier("/api/uploads/image", fichierCadre);
      onChange(reponse.url);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Échec de l'upload.");
    } finally {
      setEnvoi(false);
      // Permet de re-sélectionner le même fichier plus tard si besoin
      // (ex: après une erreur) — sans ça, un second choix du même fichier
      // ne redéclenche pas onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const formeApercu = rond ? "rounded-full" : "rounded-lg";

  return (
    <div>
      <label className="block text-sm font-medium text-dj-texte-muet">{label}</label>

      <div className="mt-1 flex items-center gap-4">
        <div
          className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-dj-bordure bg-dj-surface-haute ${formeApercu}`}
        >
          {valeur ? (
            <Image src={valeur} alt="" fill className="object-cover" sizes="64px" />
          ) : (
            <span className="text-xs text-dj-inactif">Aucune</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={envoi}
              onClick={() => inputRef.current?.click()}
              className="rounded-xl border border-dj-bordure px-4 py-2 text-xs text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-50"
            >
              {envoi ? "Envoi…" : valeur ? "Changer l'image" : "Choisir une image"}
            </button>
            {valeur && !envoi && (
              <>
                <button
                  type="button"
                  onClick={() => setSourceACadrer(valeur)}
                  className="rounded-xl border border-dj-bordure px-4 py-2 text-xs text-dj-texte transition-colors hover:border-dj-bordure-forte"
                >
                  Recadrer
                </button>
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="rounded-xl border border-dj-bordure px-4 py-2 text-xs text-dj-texte-muet transition-colors hover:border-[#F87171] hover:text-[#F87171]"
                >
                  Supprimer
                </button>
              </>
            )}
          </div>
          {erreur && <p className="text-xs text-[#F87171]">{erreur}</p>}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={gererSelection}
          className="hidden"
        />
      </div>

      {sourceACadrer && (
        <RecadreurImage
          source={sourceACadrer}
          aspect={aspect}
          onValider={envoyerImageCadree}
          onAnnuler={() => {
            setSourceACadrer(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      )}
    </div>
  );
}

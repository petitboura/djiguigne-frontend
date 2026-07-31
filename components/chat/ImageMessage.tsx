"use client";

import { useState } from "react";
import { X, ImageOff, ExternalLink, Download } from "lucide-react";

// Remplace le <img> par défaut de ReactMarkdown (![alt](url) en markdown).
// Trois problèmes réglés par rapport au <img> nu :
//   1. Saut de layout : rien ne réserve d'espace tant que l'image n'a pas
//      chargé -> les messages en dessous "sautent" au chargement. Ici on
//      démarre invisible (opacity-0) et on ne fait le fondu qu'au onLoad,
//      dans un conteneur qui a déjà sa taille max définie.
//   2. Zoom : clic pour agrandir en plein écran (lightbox), pratique pour
//      lire un diagramme ou un tableau capturé en image.
//   3. Échec de chargement (2026-07-20, bug trouvé par Bourama en test réel
//      -- le modèle avait halluciné une URL d'image, cassée au chargement) :
//      sans onError, l'image restait en opacity-0 pour toujours -> case
//      grise vide, aucun signal que quelque chose s'est mal passé. Fallback
//      explicite désormais : icône + lien pour ouvrir l'URL directement
//      (utile si l'image existe mais que le domaine bloque l'intégration).
export function ImageMessage({ src, alt }: { src?: string; alt?: string }) {
  const [chargee, setChargee] = useState(false);
  const [enErreur, setEnErreur] = useState(false);
  const [ouverte, setOuverte] = useState(false);

  if (!src) return null;

  // Téléchargement via fetch+blob plutôt qu'un simple <a download> : pour
  // une URL cross-origin (Supabase), le navigateur ignore souvent
  // l'attribut download et ouvre l'image dans un nouvel onglet à la
  // place -- le blob local, lui, force le vrai téléchargement.
  async function telecharger() {
    try {
      const reponse = await fetch(src!);
      const blob = await reponse.blob();
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = alt || "image";
      lien.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank");
    }
  }

  if (enErreur) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="my-2 flex w-fit max-w-full animate-dj-fade-in items-center gap-2.5 rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2.5 no-underline text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:text-dj-texte"
      >
        <ImageOff size={16} className="shrink-0" />
        <span className="min-w-0 truncate text-sm">{alt || "Image indisponible"}</span>
        <ExternalLink size={13} className="ml-1 shrink-0" />
      </a>
    );
  }

  return (
    <>
      <button
        onClick={() => chargee && setOuverte(true)}
        className="my-2 block max-h-96 overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface"
        aria-label={alt || "Agrandir l'image"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- source dynamique fournie par le modèle, pas un asset local optimisable */}
        <img
          src={src}
          alt={alt || ""}
          onLoad={() => setChargee(true)}
          onError={() => setEnErreur(true)}
          className={`max-h-96 w-auto transition-opacity duration-500 ${chargee ? "opacity-100" : "opacity-0"}`}
        />
      </button>

      {ouverte && (
        <div
          className="fixed inset-0 z-50 flex animate-dj-fade-in items-center justify-center bg-black/85 p-6"
          onClick={() => setOuverte(false)}
        >
          <button
            aria-label="Télécharger"
            onClick={(e) => {
              e.stopPropagation();
              telecharger();
            }}
            className="absolute right-16 top-5 text-dj-texte-muet hover:text-dj-texte"
          >
            <Download size={22} />
          </button>
          <button
            aria-label="Fermer"
            // CORRECTIF 2026-07-31 (audit sécurité/UX) : ce bouton n'avait
            // aucun onClick propre -- il ne fermait la fenêtre que parce
            // que le clic remontait par accident (bubbling) jusqu'au fond
            // qui, lui, a bien un onClick={() => setOuverte(false)}.
            // Fonctionnait aujourd'hui, mais fragile : une future
            // modification du fond (autre interaction ajoutée dessus)
            // pourrait casser la fermeture sans que ce soit évident à la
            // lecture du code -- même précaution que le bouton
            // "Télécharger" juste au-dessus, qui lui a déjà son propre
            // onClick + stopPropagation.
            onClick={(e) => {
              e.stopPropagation();
              setOuverte(false);
            }}
            className="absolute right-5 top-5 text-dj-texte-muet hover:text-dj-texte"
          >
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt || ""} className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" />
        </div>
      )}
    </>
  );
}

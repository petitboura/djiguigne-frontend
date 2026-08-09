"use client";

import { useEffect } from "react";

// Bourama (2026-07-17) : "tu appuie sur une IA pour uploader une image
// vitrine, ça bug... la page plante/devient blanche". Sans error.tsx,
// Next.js App Router affiche une page blanche pure sur toute erreur JS
// non rattrapée pendant le rendu (ex: composant qui throw) -- ce fichier
// est le filet de sécurité qui remplace ça par un écran normal avec un
// bouton "Réessayer", quelle que soit l'erreur exacte qui a déclenché le
// crash. Ne remplace pas l'investigation de la cause précise (toujours
// en cours), mais évite que la personne se retrouve bloquée sans rien
// pouvoir faire.
export default function ErreurGlobale({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="font-display text-lg font-bold text-dj-texte">Une erreur est survenue</p>
      <p className="max-w-sm text-sm text-dj-texte-muet">
        Quelque chose s&apos;est mal passé. Réessaie, ou reviens à l&apos;accueil si ça
        persiste.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-dj-gradient px-5 py-2 text-sm font-bold text-[#1A0D02]"
        >
          Réessayer
        </button>
        <a
          href="/"
          className="rounded-xl border border-dj-bordure px-5 py-2 text-sm text-dj-texte"
        >
          Accueil
        </a>
      </div>
    </div>
  );
}

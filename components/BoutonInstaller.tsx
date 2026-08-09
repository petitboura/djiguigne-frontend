"use client";

import { useEffect, useState } from "react";

// Demande de Bourama (2026-07-15) : "un bouton télécharger même dans la
// plateforme". Deux comportements différents selon le navigateur :
//
// - Chrome/Edge/Android : on intercepte l'événement `beforeinstallprompt`
//   (le navigateur le déclenche tout seul quand les critères PWA sont
//   remplis -- manifest + service worker, voir app/manifest.ts et
//   public/sw.js) pour afficher NOTRE bouton au lieu de la bannière
//   générique du navigateur, et déclencher l'installation au clic.
//
// - iOS/Safari : Apple ne donne AUCUNE API pour déclencher l'installation
//   par un clic, la personne doit passer par Partager -> "Sur l'écran
//   d'accueil" elle-même. Le bouton ouvre juste un petit mode d'emploi à
//   la place.
//
// - Déjà installé, ou navigateur qui ne supporte ni l'un ni l'autre
//   (Firefox desktop par ex.) : bouton caché, pas de bouton cassé qui ne
//   fait rien.
export function BoutonInstaller() {
  const [evenementInstall, setEvenementInstall] = useState<Event | null>(null);
  const [estIOS, setEstIOS] = useState(false);
  const [dejaInstalle, setDejaInstalle] = useState(false);
  const [instructionsIOS, setInstructionsIOS] = useState(false);

  useEffect(() => {
    setDejaInstalle(window.matchMedia("(display-mode: standalone)").matches);
    setEstIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));

    function gererPrompt(e: Event) {
      e.preventDefault();
      setEvenementInstall(e);
    }
    window.addEventListener("beforeinstallprompt", gererPrompt);
    return () => window.removeEventListener("beforeinstallprompt", gererPrompt);
  }, []);

  if (dejaInstalle) return null;
  if (!evenementInstall && !estIOS) return null;

  async function installer() {
    if (!evenementInstall) return;
    // @ts-expect-error -- BeforeInstallPromptEvent n'est pas dans le typage TS standard
    await evenementInstall.prompt();
    setEvenementInstall(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={estIOS ? () => setInstructionsIOS(true) : installer}
        className="flex items-center gap-1.5 rounded-xl border border-dj-bordure px-3 py-2 text-sm text-dj-texte-muet transition-colors hover:border-dj-accent-1 hover:text-dj-texte"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v13m0 0-4-4m4 4 4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="hidden sm:inline">Télécharger</span>
      </button>

      {instructionsIOS && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setInstructionsIOS(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-dj-bordure bg-dj-surface p-5 text-sm text-dj-texte"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-base font-bold">Installer Djiguignè AI</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-dj-texte-muet">
              <li>
                Appuie sur <span className="text-dj-texte">Partager</span> en bas de Safari
              </li>
              <li>
                Choisis <span className="text-dj-texte">« Sur l&apos;écran d&apos;accueil »</span>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setInstructionsIOS(false)}
              className="mt-4 w-full rounded-xl bg-dj-gradient py-2 text-sm font-bold text-[#1A0D02]"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}

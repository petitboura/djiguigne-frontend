"use client";

import Link from "next/link";

// Ajouté le 2026-07-13 (Bourama : "un bouton Accueil partout où il y a
// retour qui emmène directement à l'accueil"). Toujours affiché à côté de
// BoutonRetour (jamais seul) : Retour dépend de l'historique de
// navigation (router.back()), Accueil est une destination fixe ("/"),
// utile si l'historique ramène quelque part d'inattendu (ex: arrivée
// directe sur la page via un lien partagé, sans historique interne).
//
// Style corrigé le même jour (voir BoutonRetour.tsx, même cause : bordure
// à 8% d'opacité seule, sans fond, quasi invisible sur un petit cercle).
export function BoutonAccueil() {
  return (
    <Link
      href="/"
      aria-label="Accueil"
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface text-base text-dj-texte transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

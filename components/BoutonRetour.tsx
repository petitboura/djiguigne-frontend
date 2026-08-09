"use client";

import { useRouter } from "next/navigation";

// Bug remonté par Bourama (2026-07-11, capture d'écran /agent/[id]) :
// aucun bouton retour visible en ouvrant un agent. Le logo dans TopBar
// pointe déjà vers "/", mais ce n'est pas assez visible comme affordance
// de retour. router.back() plutôt qu'un lien fixe vers "/" : ramène là
// d'où on vient (feed, recherche, un autre agent), pas systématiquement
// à l'accueil.
//
// Redesign du 2026-07-13 (Bourama) : cercle + flèche seule, sans texte
// "Retour" -- toujours accompagné de BoutonAccueil juste à côté (voir ce
// composant) partout où celui-ci apparaît.
//
// Corrigé le même jour (Bourama : "mal affichés ou invisibles") : la
// première version n'avait ni fond ni couleur d'icône assez marquée --
// juste une bordure à 8% d'opacité (--dj-bordure) sur un cercle de 36px,
// quasi invisible sur le fond presque noir de l'app. Fond plein
// (bg-dj-surface) + icône en couleur de texte principale ajoutés.
export function BoutonRetour() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      aria-label="Retour"
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface text-base text-dj-texte transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
    >
      ←
    </button>
  );
}

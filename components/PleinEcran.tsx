"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Corrige un bug présent dans NotificationsCloche et HistoriqueConversations
// (Bourama, 2026-07-15 : "il y a un mode plein écran... mais qui ne marchent
// pas correctement") : un `position: fixed` DANS un parent qui a un
// `transform` (ex. -translate-x-1/2) ou un `backdrop-filter` (ex.
// backdrop-blur sur le <header>) se retrouve positionné par rapport à ce
// parent au lieu du viewport -- et coupé si ce parent a `overflow-hidden`.
// Un portail React vers `document.body` échappe à tous ces parents, peu
// importe où le composant qui l'utilise est monté dans l'arbre. Utilisé par
// les 2 endroits ci-dessus (à corriger) + le nouveau popup de catégories.
export function PleinEcran({
  ouvert,
  onFermer,
  titre,
  actions,
  children,
}: {
  ouvert: boolean;
  onFermer: () => void;
  titre: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Le portail a besoin de `document`, indisponible au rendu serveur —
  // on ne rend qu'une fois monté côté client.
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  if (!monte || !ouvert) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-dj-fond p-5">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <h2 className="font-display text-lg font-bold text-dj-texte">{titre}</h2>
          <div className="flex flex-wrap items-center gap-3">
            {actions}
            <button
              type="button"
              onClick={onFermer}
              className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
            >
              Fermer
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto rounded-2xl border border-dj-bordure">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

"use client";

import { useNotificationsPush } from "@/lib/useNotificationsPush";

// Demande de Bourama (2026-07-22) : "devrait être directement à côté du
// bouton mon espace ou à côté de la cloche et disparaît après
// activation". Placé dans TopBar.tsx, juste à côté de
// NotificationsCloche (celle-ci concerne le push navigateur, l'autre le
// fil social existant -- deux choses différentes, deux composants
// différents, même connexion visuelle).

export function NotificationsPushCloche() {
  const { etat, activer } = useNotificationsPush();

  // Rien à montrer : soit déjà actif (le but est atteint, la cloche
  // disparaît comme demandé), soit un état où il n'y a rien de sensé à
  // proposer (vérification en cours, navigateur incompatible, ou
  // bloqué -- ce dernier cas reste géré en détail dans le profil,
  // inutile de dupliquer un message d'erreur dans une icône compacte).
  if (etat === "verification" || etat === "actif" || etat === "indisponible") return null;

  return (
    <button
      type="button"
      onClick={activer}
      disabled={etat === "changement"}
      aria-label="Activer les notifications"
      title="Activer les notifications"
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface text-dj-texte transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute disabled:opacity-50"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* Point d'accent : différencie visuellement de NotificationsCloche
          (qui affiche un compteur), ici c'est un simple signal "pas
          encore activé", pas un nombre. */}
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-dj-accent-1" />
    </button>
  );
}

"use client";

import Link from "next/link";

// 2026-08-07 (demande Bourama) : plusieurs actions du chat exigent un
// compte côté backend (utilisateur_courant, pas utilisateur_optionnel --
// voir ex. api/uploads.py, api/feedback.py) alors que les boutons qui les
// déclenchent restent visibles pour un visiteur non connecté. Avant ce
// composant, l'échec atterrissait soit en silence, soit sous forme
// d'erreur brute (ex. "Token d'authentification manquant" dans un
// alert() ou une bulle de chat). Ce composant remplace ces deux cas par
// une proposition claire de créer un compte (ou se connecter), avec
// redirection automatique vers la page d'origine une fois fait -- voir
// `?retour=` sur /inscription et /connexion.
export function CompteRequisModal({
  texte,
  onFerme,
}: {
  texte?: string;
  onFerme: () => void;
}) {
  const retour =
    typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 animate-dj-fade-in"
      onClick={onFerme}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-dj-bordure bg-dj-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold text-dj-texte">
          Crée un compte pour continuer
        </h2>
        <p className="mt-2 text-sm text-dj-texte-muet">
          {texte || "Cette action nécessite un compte Djiguignè."}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <Link
            href={`/inscription?retour=${encodeURIComponent(retour)}`}
            className="w-full rounded-xl bg-dj-gradient px-4 py-2.5 text-center text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5"
          >
            Créer un compte
          </Link>
          <Link
            href={`/connexion?retour=${encodeURIComponent(retour)}`}
            className="w-full rounded-xl border border-dj-bordure px-4 py-2.5 text-center text-sm font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute"
          >
            J&apos;ai déjà un compte
          </Link>
          <button
            type="button"
            onClick={onFerme}
            className="mt-1 text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

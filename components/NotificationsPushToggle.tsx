"use client";

import { useNotificationsPush } from "@/lib/useNotificationsPush";

// Refactorisé le 22/07/2026 : logique déplacée dans
// lib/useNotificationsPush.ts, partagée avec la nouvelle cloche
// compacte (components/NotificationsPushCloche.tsx). Ce composant-ci
// reste la version "détaillée" pour la page profil.

export function NotificationsPushToggle() {
  const { etat, erreur, activer, desactiver, verifierEtat } = useNotificationsPush();

  if (etat === "verification") return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
      <h2 className="font-display text-base font-bold text-dj-texte">Notifications push</h2>

      {etat === "indisponible" && (
        <p className="text-sm text-dj-texte-muet">
          Ton navigateur ne supporte pas les notifications push.
        </p>
      )}

      {etat === "service_worker_bloque" && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-dj-texte-muet">
            Le service technique nécessaire n'a pas pu démarrer. Recharge la page et réessaie.
          </p>
          <button
            type="button"
            onClick={verifierEtat}
            className="shrink-0 text-sm text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            Réessayer
          </button>
        </div>
      )}

      {etat === "refuse" && (
        <p className="text-sm text-dj-texte-muet">
          Les notifications sont bloquées pour ce site. Autorise-les dans les paramètres de ton
          navigateur pour les activer ici.
        </p>
      )}

      {(etat === "inactif" || etat === "changement") && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-dj-texte-muet">
            Reçois un rappel ou une alerte directement sur cet appareil, même quand Djiguignè
            n'est pas ouvert.
          </p>
          <button
            type="button"
            onClick={activer}
            disabled={etat === "changement"}
            className="shrink-0 rounded-xl bg-dj-gradient px-4 py-2 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {etat === "changement" ? "…" : "Activer"}
          </button>
        </div>
      )}

      {etat === "actif" && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-dj-texte-muet">Notifications activées sur cet appareil.</p>
          <button
            type="button"
            onClick={desactiver}
            className="shrink-0 text-sm text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            Désactiver
          </button>
        </div>
      )}

      {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}
    </section>
  );
}

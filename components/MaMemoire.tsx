"use client";

import { useEffect, useState } from "react";
import { appelerApi } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";

/**
 * Extrait de app/dashboard/memoire/page.tsx (2026-08-01, demande Bourama :
 * "ajoute un champ mémoire qui était dans mon espace, dans mon espace" --
 * remis en tant qu'onglet de la nouvelle page /dashboard/espace, en plus
 * de la page /dashboard/memoire elle-même qui reste accessible telle
 * quelle). Même logique, juste sans son propre TopBar/header (déjà fournis
 * par la page qui l'utilise).
 */
export function MaMemoire() {
  const [resume, setResume] = useState("");
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    appelerApi("/api/memoire")
      .then((r: { resume: string }) => setResume(r.resume || ""))
      .catch((e) => setErreur(messageErreur(e)))
      .finally(() => setChargement(false));
  }, []);

  async function enregistrer() {
    setEnregistrement(true);
    setErreur(null);
    setMessage(null);
    try {
      await appelerApi("/api/memoire", {
        method: "PATCH",
        body: JSON.stringify({ resume }),
      });
      setMessage("Mémoire enregistrée.");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  async function toutOublier() {
    if (
      !window.confirm(
        "Effacer toute ta mémoire ? La plateforme oubliera tout ce qu'elle a retenu de tes échanges passés, pour tous les agents. Cette action est irréversible."
      )
    )
      return;
    setEnregistrement(true);
    setErreur(null);
    try {
      await appelerApi("/api/memoire", { method: "DELETE" });
      setResume("");
      setMessage("Mémoire effacée.");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-dj-texte-muet">
        Résumé de ce que la plateforme retient de tes conversations passées, pour personnaliser
        tes échanges avec n&apos;importe lequel de tes agents. Se met à jour automatiquement au
        fil des discussions — tu peux aussi le corriger ou l&apos;effacer toi-même ici.
      </p>

      {chargement && <p className="text-sm text-dj-texte-muet">Chargement…</p>}

      {!chargement && (
        <div className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            rows={10}
            placeholder="Rien d'enregistré pour l'instant — ça se remplit tout seul au fil de tes conversations."
            className="w-full resize-y rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={enregistrer}
              disabled={enregistrement}
              className="rounded-full bg-dj-gradient px-5 py-2 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {enregistrement ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              onClick={toutOublier}
              disabled={enregistrement}
              className="rounded-full border border-[#F87171] px-5 py-2 text-sm text-[#F87171] transition-colors hover:bg-[#F87171]/10 disabled:opacity-50"
            >
              Tout oublier
            </button>
            {message && <span className="text-sm text-dj-texte-muet">{message}</span>}
          </div>
          {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { appelerApi } from "@/lib/api";

// Étape D.4 (pivot social). S'appuie sur GET /api/creators/{id}/follow,
// ajouté à cette étape : le POST/DELETE existants
// depuis l'Étape C ne permettaient pas de savoir si l'utilisateur courant
// suit déjà ce créateur, ni d'afficher un compteur. `utilisateur_optionnel`
// côté backend rend ce GET public (compteur visible sans connexion).

type EtatFollow = { total: number; suivi_par_moi: boolean };

export function BoutonFollow({ creatorId }: { creatorId: string }) {
  const [etat, setEtat] = useState<EtatFollow | null>(null);
  const [connecte, setConnecte] = useState<boolean | undefined>(undefined);
  const [monId, setMonId] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    appelerApi(`/api/creators/${creatorId}/follow`)
      .then((r: EtatFollow) => setEtat(r))
      .catch(() => setEtat(null));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setConnecte(!!session);
      setMonId(session?.user.id ?? null);
    });
  }, [creatorId]);

  async function basculer() {
    if (!connecte || !etat) return;
    setEnvoi(true);
    const suivaitAvant = etat.suivi_par_moi;
    try {
      await appelerApi(`/api/creators/${creatorId}/follow`, {
        method: suivaitAvant ? "DELETE" : "POST",
      });
      setEtat({
        total: etat.total + (suivaitAvant ? -1 : 1),
        suivi_par_moi: !suivaitAvant,
      });
    } catch {
      // Silencieux : le compteur reste dans son état précédent, pas de
      // toast dans cette v1 (voir composants existants, même sobriété).
    } finally {
      setEnvoi(false);
    }
  }

  const cestMoi = connecte && monId === creatorId;

  return (
    <div className="flex items-center gap-3">
      {/* Pas de bouton pour se suivre soi-même (422 côté backend de toute
          façon, mais autant ne pas l'afficher) -- le compteur, lui, reste
          visible : Bourama doit voir son propre nombre d'abonnés. */}
      {connecte && !cestMoi && (
        <button
          onClick={basculer}
          disabled={envoi || !etat}
          className={
            etat?.suivi_par_moi
              ? "rounded-full border border-dj-bordure px-5 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-50"
              : "rounded-full bg-dj-gradient px-5 py-2 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          }
        >
          {etat?.suivi_par_moi ? "Suivi" : "Suivre"}
        </button>
      )}
      <span className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte-muet">
        {etat ? `${etat.total} abonné${etat.total > 1 ? "s" : ""}` : "..."}
      </span>
    </div>
  );
}

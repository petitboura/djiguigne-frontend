"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { appelerApi } from "@/lib/api";

// Étape D.3 (pivot social) : note 1-5, PAS un like (clarification
// explicite de Bourama sur ce point). Contrat backend
// (api/agents.py) : GET .../rating est public (moyenne + total), POST
// .../rating exige un token et fait un upsert (une note par user, jamais
// cumulée) — donc pas besoin de gérer un état "déjà noté" séparément, un
// second clic modifie simplement la note existante.

type Agrege = { moyenne: number | null; total: number };

export function NoteAgent({ agentId }: { agentId: string }) {
  const [agrege, setAgrege] = useState<Agrege | null>(null);
  const [connecte, setConnecte] = useState<boolean | undefined>(undefined);
  const [maNote, setMaNote] = useState<number | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    appelerApi(`/api/agents/${agentId}/rating`)
      .then((r: Agrege) => setAgrege(r))
      .catch(() => setAgrege(null));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setConnecte(!!session);
    });
  }, [agentId]);

  async function noter(note: number) {
    if (!connecte) {
      setErreur("Connecte-toi pour noter cette IA.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agentId}/rating`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
      setMaNote(note);
      // Recharge l'agrégé plutôt que de le recalculer localement : plus
      // simple, et reste correct même si d'autres personnes notent en
      // parallèle.
      const r = await appelerApi(`/api/agents/${agentId}/rating`);
      setAgrege(r);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setEnvoi(false);
    }
  }

  const noteAffichee = maNote ?? 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            disabled={envoi}
            onClick={() => noter(n)}
            aria-label={`Noter ${n} étoile${n > 1 ? "s" : ""}`}
            className={`text-2xl leading-none transition-transform hover:scale-110 disabled:cursor-not-allowed ${
              n <= noteAffichee ? "text-dj-accent-1" : "text-dj-inactif"
            }`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-sm text-dj-texte-muet">
          {agrege?.moyenne != null
            ? `${agrege.moyenne} / 5 (${agrege.total} avis)`
            : "Pas encore noté"}
        </span>
      </div>
      {erreur && <p className="text-xs text-dj-accent-2">{erreur}</p>}
    </div>
  );
}

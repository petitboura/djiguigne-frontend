"use client";

import { useEffect, useState } from "react";
import { appelerApi } from "@/lib/api";

// Proactivité (25/07) : le créateur décide QUAND (délai d'inactivité), à
// quelle fréquence max, et POURQUOI/COMMENT (instructions libres, comme le
// prompt système) son agent relance un utilisateur inactif de sa propre
// initiative. Voir core/proactivite.py côté backend -- ce composant ne
// fait qu'éditer 4 colonnes sur `agents` via GET/PATCH
// /api/agents/{id}/edition, déjà utilisé par la page parente pour le
// reste du formulaire, mais géré ici séparément (même pattern que
// DroitsAgent.tsx) pour ne pas alourdir le state de la page principale.
//
// Double opt-in : même si tout est configuré ici, rien ne part tant que
// l'utilisateur destinataire n'a pas lui-même activé
// profiles.notifications_proactives_actives (voir ProfilProactivite.tsx).

type ConfigProactivite = {
  proactivite_active: boolean;
  proactivite_delai_jours: number;
  proactivite_cooldown_jours: number;
  proactivite_instructions: string;
};

export function ProactiviteAgent({ agentId }: { agentId: string }) {
  const [config, setConfig] = useState<ConfigProactivite | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    appelerApi(`/api/agents/${agentId}/edition`)
      .then((r: ConfigProactivite) =>
        setConfig({
          proactivite_active: r.proactivite_active,
          proactivite_delai_jours: r.proactivite_delai_jours,
          proactivite_cooldown_jours: r.proactivite_cooldown_jours,
          proactivite_instructions: r.proactivite_instructions,
        })
      )
      .catch((e) => setErreur(e instanceof Error ? e.message : "Erreur inconnue."));
  }, [agentId]);

  async function enregistrer() {
    if (!config) return;
    setEnregistrement(true);
    setMessage(null);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          proactivite_active: config.proactivite_active,
          proactivite_delai_jours: config.proactivite_delai_jours,
          proactivite_cooldown_jours: config.proactivite_cooldown_jours,
          proactivite_instructions: config.proactivite_instructions,
        }),
      });
      setMessage("Proactivité enregistrée.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'enregistrer pour le moment.");
    } finally {
      setEnregistrement(false);
    }
  }

  if (erreur && !config) {
    return <p className="text-sm text-[#F87171]">{erreur}</p>;
  }
  if (!config) {
    return <p className="text-sm text-dj-texte-muet">Chargement…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-dj-texte-muet">
        Autorise cette IA à relancer d&apos;elle-même un utilisateur inactif, sans qu&apos;il ait rien demandé.
        C&apos;est l&apos;IA elle-même qui juge, à chaque fois, si une relance est vraiment pertinente selon tes
        critères ci-dessous -- elle ne relance jamais sans raison concrète.
      </p>

      <label className="flex items-center gap-2 text-sm text-dj-texte">
        <input
          type="checkbox"
          checked={config.proactivite_active}
          onChange={(e) => setConfig({ ...config, proactivite_active: e.target.checked })}
        />
        Activer les relances proactives pour cette IA
      </label>

      {config.proactivite_active && (
        <div className="flex flex-col gap-4 rounded-xl border border-dj-bordure bg-dj-surface p-4">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-6">
            <label className="flex items-center gap-2 text-sm text-dj-texte">
              Relancer après
              <input
                type="number"
                min={1}
                value={config.proactivite_delai_jours}
                onChange={(e) =>
                  setConfig({ ...config, proactivite_delai_jours: Math.max(1, Number(e.target.value) || 1) })
                }
                className="w-16 rounded-lg border border-dj-bordure bg-dj-fond px-2 py-1 text-center"
              />
              jours d&apos;inactivité
            </label>

            <label className="flex items-center gap-2 text-sm text-dj-texte">
              Pas plus d&apos;une relance tous les
              <input
                type="number"
                min={1}
                value={config.proactivite_cooldown_jours}
                onChange={(e) =>
                  setConfig({ ...config, proactivite_cooldown_jours: Math.max(1, Number(e.target.value) || 1) })
                }
                className="w-16 rounded-lg border border-dj-bordure bg-dj-fond px-2 py-1 text-center"
              />
              jours
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm text-dj-texte">
            Sur quelle base ton IA doit-elle décider de relancer (et sur quel ton) ?
            <textarea
              value={config.proactivite_instructions}
              onChange={(e) => setConfig({ ...config, proactivite_instructions: e.target.value })}
              placeholder={
                "Ex : Relance seulement si l'utilisateur avait mentionné un objectif ou une échéance précise. " +
                "Ton direct et chaleureux, jamais insistant. Si rien de concret à dire, ne relance pas."
              }
              rows={4}
              className="rounded-xl border border-dj-bordure bg-dj-fond px-3 py-2 text-sm text-dj-texte placeholder:text-dj-texte-muet"
            />
            <span className="text-xs text-dj-texte-muet">
              Laisse vide pour un comportement par défaut raisonnable (ne relance que sur une vraie raison concrète,
              jamais un simple &laquo;&nbsp;tu es là&nbsp;?&nbsp;&raquo;).
            </span>
          </label>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={enregistrer}
          disabled={enregistrement}
          className="self-start rounded-full bg-dj-gradient px-5 py-2 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {enregistrement ? "Enregistrement…" : "Enregistrer la proactivité"}
        </button>
        {message && <span className="text-sm text-dj-texte-muet">{message}</span>}
      </div>
      {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { appelerApi } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";

// Ajouté le 2026-07-21 (demande Bourama : l'utilisateur final doit pouvoir
// voir/modifier/effacer ce que l'IA a retenu sur lui, pas seulement le
// créateur qui définit le schéma -- voir api/agents.py `/mon-profil`).
// Ne s'affiche que si l'agent a défini au moins un champ (sinon la
// fonctionnalité est simplement désactivée pour cet agent, rien à montrer).

type Champ = { nom: string; description: string };
type MonProfil = { champs: Champ[]; donnees: Record<string, string> };

export function MonProfilAgent({
  agentId,
  onEtat,
}: {
  agentId: string;
  onEtat?: (aDesChamps: boolean) => void;
}) {
  const [profil, setProfil] = useState<MonProfil | null | undefined>(undefined);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    appelerApi(`/api/agents/${agentId}/mon-profil`)
      .then((r: MonProfil) => {
        setProfil(r);
        setValeurs(r.donnees || {});
        onEtat?.(r.champs.length > 0);
      })
      .catch(() => {
        setProfil(null);
        onEtat?.(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  function majValeur(nom: string, valeur: string) {
    setValeurs((prev) => ({ ...prev, [nom]: valeur }));
    setMessage(null);
  }

  async function enregistrer() {
    setEnregistrement(true);
    setErreur(null);
    setMessage(null);
    try {
      await appelerApi(`/api/agents/${agentId}/mon-profil`, {
        method: "PATCH",
        body: JSON.stringify({ donnees: valeurs }),
      });
      setMessage("Enregistré.");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  async function effacer() {
    if (!window.confirm("Oublier ce que cette IA sait de toi ? Cette action est irréversible.")) return;
    setEnregistrement(true);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agentId}/mon-profil`, { method: "DELETE" });
      setValeurs({});
      setMessage("Profil effacé.");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  // Pas encore chargé, erreur de chargement, ou agent sans schéma défini
  // (fonctionnalité désactivée pour cet agent) -- rien à afficher.
  if (!profil || profil.champs.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 px-3 pb-3">
      <p className="text-xs text-dj-texte-muet">
        Informations que cette IA a retenues sur toi au fil des conversations. Tu
        peux les corriger ou tout effacer.
      </p>
      {profil.champs.map((champ) => (
        <div key={champ.nom}>
          <label className="block text-xs font-medium text-dj-texte-muet">{champ.nom}</label>
          <input
            value={valeurs[champ.nom] ?? ""}
            onChange={(e) => majValeur(champ.nom, e.target.value)}
            placeholder={champ.description || "Pas encore renseigné"}
            className="mt-1 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button
          onClick={enregistrer}
          disabled={enregistrement}
          className="rounded-full bg-dj-gradient px-4 py-2 text-xs font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {enregistrement ? "..." : "Enregistrer"}
        </button>
        <button
          onClick={effacer}
          disabled={enregistrement}
          className="rounded-full border border-dj-bordure px-4 py-2 text-xs text-dj-texte-muet transition-colors hover:border-[#F87171] hover:text-[#F87171] disabled:opacity-50"
        >
          Tout effacer
        </button>
      </div>
      {message && <p className="text-xs text-dj-texte-muet">{message}</p>}
      {erreur && <p className="text-xs text-[#F87171]">{erreur}</p>}
    </div>
  );
}

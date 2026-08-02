"use client";

import { useEffect, useState } from "react";
import { appelerApi } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";

// Modèles premium (02/08/2026, Bourama : "on va ajouter Claude, GPT et
// DeepSeek" -- voir core/fournisseurs_llm.py côté backend et la page
// Notion "Pricing -- Agent Maths"). Même pattern que ProactiviteAgent.tsx
// (GET/PATCH /api/agents/{id}[/edition], géré à part du reste du
// formulaire principal).
//
// distributeur_debloque/palier_debloque sont EN LECTURE SEULE ici -- pas
// de système de paiement pour l'instant (v1), Bourama les change à la
// main dans Supabase. Le créateur ne peut choisir QUE le modèle par
// défaut PARMI ce qui est déjà débloqué (modele_choisi), jamais débloquer
// lui-même un nouveau distributeur/palier depuis cette page.

const LABELS_DISTRIBUTEUR: Record<string, string> = {
  claude: "Claude",
  gpt: "GPT",
  gemini: "Gemini",
  deepseek: "DeepSeek",
};

const LABELS_PALIER: Record<string, string> = {
  essentiel: "Essentiel",
  avance: "Avancé",
  pro: "Pro",
};

type ConfigModeles = {
  distributeur_debloque: string | null;
  palier_debloque: string | null;
  modeles_disponibles: { modele_id: string; label: string; distributeur: string; palier: string }[];
  modele_choisi: string | null;
};

export function ModelesPremiumAgent({ agentId }: { agentId: string }) {
  const [config, setConfig] = useState<ConfigModeles | null>(null);
  const [modeleChoisi, setModeleChoisi] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    appelerApi(`/api/agents/${agentId}/edition`)
      .then((r: ConfigModeles) => {
        setConfig(r);
        setModeleChoisi(r.modele_choisi ?? null);
      })
      .catch((e) => setErreur(messageErreur(e)));
  }, [agentId]);

  async function enregistrer() {
    setEnregistrement(true);
    setMessage(null);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify({ modele_choisi: modeleChoisi ?? "" }),
      });
      setMessage("Modèle par défaut enregistré.");
    } catch (e) {
      setErreur(messageErreur(e));
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

  const aucunAbonnement = !config.distributeur_debloque || config.distributeur_debloque === "aucun";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-dj-texte-muet">
        Par défaut, cette IA répond avec le modèle interne habituel de la plateforme. Un abonnement premium
        (Claude, GPT, Gemini ou DeepSeek) permet à toi et aux personnes qui discutent avec ton IA de choisir un
        autre modèle pour chaque message.
      </p>

      {aucunAbonnement ? (
        <div className="rounded-xl border border-dj-bordure bg-dj-surface p-4 text-sm text-dj-texte-muet">
          Aucun abonnement premium débloqué pour cette IA pour l&apos;instant.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-dj-bordure bg-dj-surface p-4 text-sm text-dj-texte">
            Abonnement débloqué : <strong>{LABELS_DISTRIBUTEUR[config.distributeur_debloque!] ?? config.distributeur_debloque}</strong>
            {" · "}
            palier <strong>{LABELS_PALIER[config.palier_debloque ?? ""] ?? config.palier_debloque}</strong>
          </div>

          <label className="flex flex-col gap-1.5 text-sm text-dj-texte">
            Modèle par défaut (les personnes qui discutent avec ton IA peuvent en choisir un autre pour un
            message précis, voir le sélecteur dans la barre de saisie du chat)
            <select
              value={modeleChoisi ?? ""}
              onChange={(e) => setModeleChoisi(e.target.value || null)}
              className="rounded-lg border border-dj-bordure bg-dj-fond px-3 py-2 text-sm text-dj-texte"
            >
              <option value="">Automatique (modèle interne par défaut)</option>
              {config.modeles_disponibles.map((m) => (
                <option key={m.modele_id} value={m.modele_id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={enregistrer}
          disabled={enregistrement || aucunAbonnement}
          className="self-start rounded-full bg-dj-gradient px-5 py-2 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {enregistrement ? "Enregistrement…" : "Enregistrer le modèle par défaut"}
        </button>
        {message && <span className="text-sm text-dj-texte-muet">{message}</span>}
      </div>
      {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { lireMonComportement, enregistrerMonComportement } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";

// Section "Mes comportements" (06/08/2026, demande Bourama) : instructions
// perso écrites par l'étudiant, ajoutées EN PLUS du system_prompt déjà
// résolu (généraliste, matière d'un enseignant, ou "Sans enseignant") --
// jamais un remplacement, voir core/main.py::_construire_system_prompt.
// Affichage piloté par agents.section_mes_comportements (Nitrux
// uniquement pour l'instant), gaté par le parent via SidebarChat.tsx.

export function MesComportements({ agentId }: { agentId: string }) {
  const [texte, setTexte] = useState<string | undefined>(undefined);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    lireMonComportement(agentId)
      .then(setTexte)
      .catch(() => setTexte(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  async function enregistrer() {
    setEnregistrement(true);
    setErreur(null);
    setMessage(null);
    try {
      const enregistre = await enregistrerMonComportement(agentId, texte || "");
      setTexte(enregistre);
      setMessage("Enregistré.");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  if (texte === undefined) {
    return (
      <div className="flex flex-col gap-2 px-3 pb-3">
        <div className="h-16 animate-pulse rounded-lg bg-dj-surface-haute" />
      </div>
    );
  }

  return (
    <div className="flex animate-dj-fade-in-rapide flex-col gap-2 px-3 pb-3">
      <p className="text-xs text-dj-texte-muet">
        Des consignes perso pour cette IA, en plus de ce que ton enseignant a déjà mis en place.
      </p>
      <textarea
        value={texte}
        onChange={(e) => {
          setTexte(e.target.value);
          setMessage(null);
        }}
        placeholder="Ex : réponds-moi toujours en langage simple, pas de jargon."
        rows={3}
        className="w-full resize-none rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={enregistrer}
          disabled={enregistrement}
          className="rounded-full bg-dj-gradient px-4 py-2 text-xs font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {enregistrement ? "..." : "Enregistrer"}
        </button>
      </div>
      {message && <p className="text-xs text-dj-texte-muet">{message}</p>}
      {erreur && <p className="text-xs text-[#F87171]">{erreur}</p>}
    </div>
  );
}

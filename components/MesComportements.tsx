"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus, Check } from "lucide-react";
import { lireMesComportements, ajouterComportement, modifierComportement, supprimerComportement, type Comportement } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";

// Section "Mes comportements" (06/08/2026, demande Bourama : "on peut en
// mettre plusieurs hein, pas juste un") : PLUSIEURS instructions perso
// écrites par l'étudiant, chacune ajoutée EN PLUS du system_prompt déjà
// résolu (généraliste, matière d'un enseignant, ou "Sans enseignant") --
// jamais un remplacement, voir core/main.py::_construire_system_prompt.
// Affichage piloté par agents.section_mes_comportements (Nitrux
// uniquement pour l'instant), gaté par le parent via SidebarChat.tsx.

export function MesComportements({ agentId }: { agentId: string }) {
  const [liste, setListe] = useState<Comportement[] | undefined>(undefined);
  const [nouveauTexte, setNouveauTexte] = useState("");
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [texteEdition, setTexteEdition] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    lireMesComportements(agentId)
      .then(setListe)
      .catch(() => setListe([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  async function ajouter() {
    if (!nouveauTexte.trim()) return;
    setAjoutEnCours(true);
    setErreur(null);
    try {
      const cree = await ajouterComportement(agentId, nouveauTexte.trim());
      setListe((prec) => [...(prec || []), cree]);
      setNouveauTexte("");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setAjoutEnCours(false);
    }
  }

  function ouvrirEdition(c: Comportement) {
    setEditionId(c.id);
    setTexteEdition(c.texte);
  }

  async function validerEdition(id: string) {
    const texte = texteEdition.trim();
    if (!texte) return;
    setEditionId(null);
    setListe((prec) => (prec || []).map((c) => (c.id === id ? { ...c, texte } : c)));
    try {
      await modifierComportement(agentId, id, texte);
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  async function supprimer(id: string) {
    setListe((prec) => (prec || []).filter((c) => c.id !== id));
    try {
      await supprimerComportement(agentId, id);
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  if (liste === undefined) {
    return (
      <div className="flex flex-col gap-2 px-3 pb-3">
        <div className="h-8 animate-pulse rounded-lg bg-dj-surface-haute" />
        <div className="h-8 animate-pulse rounded-lg bg-dj-surface-haute" />
      </div>
    );
  }

  return (
    <div className="flex animate-dj-fade-in-rapide flex-col gap-2 px-3 pb-3">
      <p className="text-xs text-dj-texte-muet">
        Tes consignes perso pour cette IA, en plus de ce que ton enseignant a déjà mis en place. Tu peux en ajouter
        plusieurs.
      </p>

      {liste.map((c) => (
        <div key={c.id} className="flex flex-col gap-1 rounded-lg border border-dj-bordure/60 px-2 py-1.5">
          {editionId === c.id ? (
            <div className="flex items-start gap-1.5">
              <textarea
                autoFocus
                value={texteEdition}
                onChange={(e) => setTexteEdition(e.target.value)}
                rows={2}
                className="min-w-0 flex-1 resize-none rounded-md border border-dj-bordure bg-transparent px-1.5 py-1 text-xs text-dj-texte"
              />
              <button onClick={() => validerEdition(c.id)} className="flex-shrink-0 text-dj-accent-1" title="Valider">
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <button
                onClick={() => ouvrirEdition(c)}
                className="min-w-0 flex-1 truncate text-left text-xs text-dj-texte hover:text-dj-accent-1"
                title="Modifier"
              >
                {c.texte}
              </button>
              <button
                onClick={() => supprimer(c.id)}
                title="Supprimer"
                className="flex-shrink-0 text-dj-texte-muet transition-colors hover:text-[#F87171]"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-1.5">
        <input
          value={nouveauTexte}
          onChange={(e) => setNouveauTexte(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ajouter()}
          placeholder="Ex : réponds-moi toujours en langage simple"
          className="min-w-0 flex-1 rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-xs text-dj-texte outline-none focus:border-dj-accent-1"
        />
        <button
          onClick={ajouter}
          disabled={ajoutEnCours || !nouveauTexte.trim()}
          title="Ajouter"
          className="flex-shrink-0 rounded-lg bg-dj-gradient p-2 text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          <Plus size={14} />
        </button>
      </div>

      {erreur && <p className="text-xs text-[#F87171]">{erreur}</p>}
    </div>
  );
}

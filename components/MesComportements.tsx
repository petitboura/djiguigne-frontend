"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus, X, Check, Maximize2 } from "lucide-react";
import { lireMesComportements, ajouterComportement, modifierComportement, supprimerComportement, type Comportement } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";

// Section "Mes comportements" (06/08/2026, demande Bourama : "on peut en
// mettre plusieurs hein, pas juste un") : PLUSIEURS instructions perso
// écrites par l'étudiant, chacune ajoutée EN PLUS du system_prompt déjà
// résolu (généraliste, matière d'un enseignant, ou "Sans enseignant") --
// jamais un remplacement, voir core/main.py::_construire_system_prompt.
// Affichage piloté par agents.section_mes_comportements (Nitrux
// uniquement pour l'instant), gaté par le parent (SidebarChat.tsx et/ou
// /dashboard/espace) -- ce composant est partagé entre les deux, jamais
// dupliqué.
//
// Édition plein écran par élément (07/08/2026, demande Bourama : "je
// parle pas de la section, je parle de chaque élément de la liste --
// chaque élément qui peut s'agrandir, est cliquable pour l'ouvrir et
// bien l'éditer") : cliquer sur un comportement existant ouvre CET
// élément précis dans un espace dédié plein écran (grand champ de
// texte, Enregistrer, Supprimer), plus de mini-édition compactée sur
// place. L'ajout d'un nouveau comportement, lui, reste le petit champ
// rapide en bas de liste (confirmé par Bourama).

export function MesComportements({ agentId }: { agentId: string }) {
  const [liste, setListe] = useState<Comportement[] | undefined>(undefined);
  const [nouveauTexte, setNouveauTexte] = useState("");
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Panneau plein écran : soit édition d'un comportement existant, soit
  // création d'un nouveau (07/08/2026, demande Bourama : "le mode plein
  // écran ne doit pas être dispo que pour ceux qui existent -- en mode
  // édition [ajout] il faut aussi un truc à côté de la ligne de champ").
  // La création rapide (petit champ + bouton en bas) reste disponible en
  // parallèle, ce plein écran est une option en plus pour qui veut plus
  // de place pour écrire.
  const [panneau, setPanneau] = useState<{ type: "edition"; c: Comportement } | { type: "creation" } | null>(null);
  const [texteOuvert, setTexteOuvert] = useState("");
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [erreurOuvert, setErreurOuvert] = useState<string | null>(null);

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
    setPanneau({ type: "edition", c });
    setTexteOuvert(c.texte);
    setErreurOuvert(null);
  }

  function ouvrirCreation() {
    setPanneau({ type: "creation" });
    setTexteOuvert("");
    setErreurOuvert(null);
  }

  function fermer() {
    if (enregistrementEnCours || suppressionEnCours) return;
    setPanneau(null);
  }

  async function enregistrer() {
    if (!panneau) return;
    const texte = texteOuvert.trim();
    if (!texte) return;

    if (panneau.type === "creation") {
      setEnregistrementEnCours(true);
      setErreurOuvert(null);
      try {
        const cree = await ajouterComportement(agentId, texte);
        setListe((prec) => [...(prec || []), cree]);
        setPanneau(null);
      } catch (e) {
        setErreurOuvert(messageErreur(e));
      } finally {
        setEnregistrementEnCours(false);
      }
      return;
    }

    if (texte === panneau.c.texte) {
      setPanneau(null);
      return;
    }
    setEnregistrementEnCours(true);
    setErreurOuvert(null);
    try {
      const maj = await modifierComportement(agentId, panneau.c.id, texte);
      setListe((prec) => (prec || []).map((c) => (c.id === panneau.c.id ? maj : c)));
      setPanneau(null);
    } catch (e) {
      setErreurOuvert(messageErreur(e));
    } finally {
      setEnregistrementEnCours(false);
    }
  }

  async function supprimer() {
    if (!panneau || panneau.type !== "edition") return;
    setSuppressionEnCours(true);
    setErreurOuvert(null);
    try {
      await supprimerComportement(agentId, panneau.c.id);
      setListe((prec) => (prec || []).filter((c) => c.id !== panneau.c.id));
      setPanneau(null);
    } catch (e) {
      setErreurOuvert(messageErreur(e));
      setSuppressionEnCours(false);
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
        plusieurs -- clique sur l&apos;une d&apos;elles pour l&apos;ouvrir en grand et la modifier tranquillement.
      </p>

      {liste.map((c) => (
        <button
          key={c.id}
          onClick={() => ouvrirEdition(c)}
          title="Ouvrir et modifier"
          className="flex items-start justify-between gap-2 rounded-lg border border-dj-bordure/60 px-2 py-1.5 text-left transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
        >
          <span className="min-w-0 flex-1 truncate text-xs text-dj-texte">{c.texte}</span>
        </button>
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
        <button
          onClick={ouvrirCreation}
          title="Écrire en plein écran"
          className="flex-shrink-0 rounded-lg border border-dj-bordure p-2 text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {erreur && <p className="text-xs text-[#F87171]">{erreur}</p>}

      {panneau && (
        <div className="fixed inset-0 z-50 flex animate-dj-fade-in flex-col bg-dj-fond p-4 sm:p-6">
          <div className="flex items-center justify-between pb-4">
            <span className="text-sm text-dj-texte-muet">
              {panneau.type === "creation" ? "Nouveau comportement" : "Modifier ce comportement"}
            </span>
            <button
              onClick={fermer}
              disabled={enregistrementEnCours || suppressionEnCours}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-dj-texte-muet transition-colors hover:bg-dj-surface disabled:opacity-50"
            >
              <X size={14} /> Fermer
            </button>
          </div>

          <textarea
            autoFocus
            value={texteOuvert}
            onChange={(e) => setTexteOuvert(e.target.value)}
            placeholder="Ex : réponds-moi toujours en langage simple"
            className="mx-auto w-full max-w-2xl flex-1 resize-none rounded-xl border border-dj-bordure bg-dj-surface px-4 py-3 text-base text-dj-texte outline-none focus:border-dj-accent-1"
          />

          <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
            {erreurOuvert ? (
              <p className="text-xs text-[#F87171]">{erreurOuvert}</p>
            ) : (
              <span className="hidden sm:block" />
            )}
            <div className="flex items-center gap-2">
              {panneau.type === "edition" && (
                <button
                  onClick={supprimer}
                  disabled={enregistrementEnCours || suppressionEnCours}
                  className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-2 text-sm text-[#F87171] transition-colors hover:bg-[#F87171]/10 disabled:opacity-50"
                >
                  <Trash2 size={14} /> Supprimer
                </button>
              )}
              <button
                onClick={enregistrer}
                disabled={enregistrementEnCours || suppressionEnCours || !texteOuvert.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-dj-gradient px-4 py-2 text-sm font-semibold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Check size={14} />{" "}
                {enregistrementEnCours ? "Enregistrement…" : panneau.type === "creation" ? "Créer" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

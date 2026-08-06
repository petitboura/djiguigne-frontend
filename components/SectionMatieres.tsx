"use client";

import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import {
  listerAgentsContenuDynamique,
  lireMesContenusMatiere,
  ecrireContenuMatiere,
  type AgentContenuDynamique,
  type ContenuMatiere,
} from "@/lib/api";
import { MATIERES } from "@/lib/matieres";
import { messageErreur } from "@/lib/erreurs";

/**
 * Onglet "L'IA de mes élèves" de Mon espace (2026-08-06, demande
 * Bourama) : reprend uniquement le bloc "écrire une matière" de
 * app/agent/[id]/matieres/page.tsx (le bloc "entrer un code" reste
 * propre à l'IA étudiant, pas touché ici).
 *
 * Onglet fixe (toujours affiché dans Mon espace, comme Historique) :
 * la seule IA de ce type aujourd'hui est Stirux, donc pas de logique de
 * détection supplémentaire nécessaire.
 *
 * Ne code aucun agent en dur pour le CONTENU écrit : la liste des
 * agents concernés vient de /api/agents-contenu-dynamique (aujourd'hui
 * uniquement Nitrux). Le contenu écrit ici alimente directement cet
 * agent côté étudiant -- même table, même mécanisme, juste un autre
 * endroit pour l'écrire.
 */
export function SectionMatieres() {
  const [agents, setAgents] = useState<AgentContenuDynamique[] | null>(null);
  const [erreurAgents, setErreurAgents] = useState<string | null>(null);

  useEffect(() => {
    listerAgentsContenuDynamique()
      .then(setAgents)
      .catch((e) => setErreurAgents(messageErreur(e)));
  }, []);

  if (agents === null && !erreurAgents) {
    return <p className="text-sm text-dj-texte-muet">Chargement…</p>;
  }

  if (erreurAgents) {
    return <p className="text-sm text-red-500">{erreurAgents}</p>;
  }

  if (!agents || agents.length === 0) {
    return <p className="text-sm text-dj-texte-muet">Aucune matière à configurer pour l'instant.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {agents.map((agent) => (
        <BlocEcritureMatiere key={agent.id} agentId={agent.id} agentNom={agent.nom} />
      ))}
    </div>
  );
}

function BlocEcritureMatiere({ agentId, agentNom }: { agentId: string; agentNom: string }) {
  const [mesContenus, setMesContenus] = useState<ContenuMatiere[] | null>(null);
  const [matiereChoisie, setMatiereChoisie] = useState<string>(MATIERES[0]);
  const [texteContenu, setTexteContenu] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function rafraichir() {
    lireMesContenusMatiere(agentId)
      .then(setMesContenus)
      .catch(() => setMesContenus([]));
  }

  useEffect(() => {
    rafraichir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  function chargerPourEdition(c: ContenuMatiere) {
    setMatiereChoisie(c.matiere);
    setTexteContenu(c.system_prompt);
  }

  async function enregistrerContenu() {
    if (!texteContenu.trim()) return;
    setEnregistrement(true);
    setErreur(null);
    try {
      await ecrireContenuMatiere(agentId, matiereChoisie, texteContenu.trim());
      rafraichir();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure p-5">
      <h2 className="flex items-center gap-2 font-semibold text-dj-texte">
        <GraduationCap size={18} className="text-dj-accent-1" />
        Écrire une matière pour {agentNom}
      </h2>
      <p className="text-sm text-dj-texte-muet">
        Écris ce que l'IA doit savoir et comment elle doit enseigner cette matière, puis partage
        le code généré à tes étudiants.
      </p>

      {mesContenus && mesContenus.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mesContenus.map((c) => (
            <button
              key={c.id}
              onClick={() => chargerPourEdition(c)}
              className="rounded-full border border-dj-bordure px-3 py-1 text-xs text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
            >
              {c.matiere} · code {c.code}
            </button>
          ))}
        </div>
      )}

      <select
        value={matiereChoisie}
        onChange={(e) => {
          setMatiereChoisie(e.target.value);
          const existant = (mesContenus || []).find((c) => c.matiere === e.target.value);
          setTexteContenu(existant?.system_prompt || "");
        }}
        className="rounded-xl border border-dj-bordure bg-transparent px-3 py-2 text-sm text-dj-texte"
      >
        {MATIERES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <textarea
        value={texteContenu}
        onChange={(e) => setTexteContenu(e.target.value)}
        placeholder="Ce que l'IA doit savoir et comment elle doit enseigner cette matière…"
        rows={8}
        className="rounded-xl border border-dj-bordure bg-transparent px-3 py-2 text-sm text-dj-texte"
      />

      {erreur && <p className="text-sm text-red-500">{erreur}</p>}

      <button
        onClick={enregistrerContenu}
        disabled={enregistrement || !texteContenu.trim()}
        className="self-start rounded-xl bg-dj-accent-1 px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
      >
        {enregistrement ? "Enregistrement…" : "Enregistrer et générer le code"}
      </button>
    </section>
  );
}

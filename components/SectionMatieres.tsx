"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, FlaskConical, Copy, Check, Maximize2, Minimize2 } from "lucide-react";
import {
  listerAgentsContenuDynamique,
  lireMesContenusMatiere,
  ecrireContenuMatiere,
  entrerCodeMatiere,
  activerRattachementMatiere,
  type AgentContenuDynamique,
  type ContenuMatiere,
} from "@/lib/api";
import { MATIERES } from "@/lib/matieres";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { Skeleton } from "@/components/Skeleton";

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
export function SectionMatieres({ agentIdEnseignant }: { agentIdEnseignant: string }) {
  const [agents, setAgents] = useState<AgentContenuDynamique[] | null>(null);
  const [erreurAgents, setErreurAgents] = useState<string | null>(null);

  useEffect(() => {
    listerAgentsContenuDynamique()
      .then(setAgents)
      .catch((e) => setErreurAgents(messageErreur(e)));
  }, []);

  if (agents === null && !erreurAgents) {
    return (
      <div className="flex flex-col gap-2" aria-hidden>
        <Skeleton className="h-14 rounded-xl border border-dj-bordure" />
        <Skeleton className="h-14 rounded-xl border border-dj-bordure" style={{ animationDelay: "100ms" }} />
      </div>
    );
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
        <BlocEcritureMatiere
          key={agent.id}
          agentId={agent.id}
          agentNom={agent.nom}
          agentIdEnseignant={agentIdEnseignant}
        />
      ))}
    </div>
  );
}

function BlocEcritureMatiere({
  agentId,
  agentNom,
  agentIdEnseignant,
}: {
  agentId: string;
  agentNom: string;
  // IA que l'enseignant utilisait avant d'ouvrir "L'IA de mes élèves"
  // (06/08/2026) -- sert à construire le lien "Retour à mon IA" après
  // "Tester", pour ne pas rester coincé sur le chat de {agentNom}.
  agentIdEnseignant: string;
}) {
  const router = useRouter();
  const [mesContenus, setMesContenus] = useState<ContenuMatiere[] | null>(null);
  const [matiereChoisie, setMatiereChoisie] = useState<string>(MATIERES[0]);
  const [texteContenu, setTexteContenu] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [test, setTest] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [codeCopieId, setCodeCopieId] = useState<string | null>(null);
  const [erreurCopieId, setErreurCopieId] = useState<string | null>(null);
  const [pleinEcran, setPleinEcran] = useState(false);

  // Copier uniquement le code (ex. "A3B9") de la pastille, sans déclencher
  // l'édition (stopPropagation). Retour visuel bref (coche) en cas de
  // succès, message d'erreur bref en cas d'échec (permission navigateur,
  // contexte non sécurisé, etc.) -- la pastille elle-même n'est jamais
  // affectée par un échec de copie.
  async function copierCode(e: React.MouseEvent, c: ContenuMatiere) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(c.code);
      setErreurCopieId(null);
      setCodeCopieId(c.id);
      setTimeout(() => setCodeCopieId((v) => (v === c.id ? null : v)), 1500);
    } catch {
      setCodeCopieId(null);
      setErreurCopieId(c.id);
      setTimeout(() => setErreurCopieId((v) => (v === c.id ? null : v)), 1500);
    }
  }

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

  // "Tester" (2026-08-06) : enregistre d'abord si besoin, se rattache à
  // son propre contenu tout juste écrit (un compte peut entrer son
  // propre code, rien ne l'en empêche côté backend) puis file discuter
  // avec l'agent étudiant pour essayer directement le system prompt
  // qu'on vient d'écrire. "Déjà rattaché" n'est pas une erreur ici, ça
  // veut juste dire qu'un test précédent a déjà créé le rattachement.
  async function testerContenu() {
    setTest(true);
    setErreur(null);
    try {
      let contenu = (mesContenus || []).find((c) => c.matiere === matiereChoisie);
      if (!contenu || contenu.system_prompt !== texteContenu.trim()) {
        await ecrireContenuMatiere(agentId, matiereChoisie, texteContenu.trim());
        const frais = await lireMesContenusMatiere(agentId);
        setMesContenus(frais);
        contenu = frais.find((c) => c.matiere === matiereChoisie);
      }
      if (!contenu) throw new Error("Contenu introuvable après enregistrement.");

      try {
        await entrerCodeMatiere(agentId, contenu.code);
      } catch (e) {
        if (!(e instanceof ErreurApi) || e.code !== "DEJA_RATTACHE_A_CE_CONTENU") throw e;
      }
      await activerRattachementMatiere(agentId, contenu.id);
      router.push(
        `/agent/${agentId}/chat?retourIA=${encodeURIComponent(`/agent/${agentIdEnseignant}/chat`)}`
      );
    } catch (e) {
      setErreur(messageErreur(e));
      setTest(false);
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
            <div key={c.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => chargerPourEdition(c)}
                  className="rounded-xl border border-dj-bordure px-3 py-1 text-xs text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
                >
                  {c.matiere} · code {c.code}
                </button>
                <button
                  onClick={(e) => copierCode(e, c)}
                  aria-label="Copier le code"
                  className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
                >
                  <Copy
                    size={13}
                    className={`absolute transition-all duration-300 ${
                      codeCopieId === c.id ? "scale-0 opacity-0" : "scale-100 opacity-100"
                    }`}
                  />
                  <Check
                    size={13}
                    className={`absolute text-green-500 transition-all duration-300 ${
                      codeCopieId === c.id ? "scale-100 opacity-100" : "scale-0 opacity-0"
                    }`}
                  />
                </button>
              </div>
              {erreurCopieId === c.id && (
                <p className="animate-dj-fade-in text-[11px] text-red-500">Copie impossible</p>
              )}
            </div>
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

      <div className="relative">
        <textarea
          value={texteContenu}
          onChange={(e) => setTexteContenu(e.target.value)}
          placeholder="Ce que l'IA doit savoir et comment elle doit enseigner cette matière…"
          rows={8}
          className="w-full rounded-xl border border-dj-bordure bg-transparent px-3 py-2 pr-9 text-sm text-dj-texte"
        />
        <button
          onClick={() => setPleinEcran(true)}
          aria-label="Agrandir"
          title="Agrandir"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Bouton plein écran (07/08, demande Bourama) : ce champ contient
          souvent un cours entier -- 8 lignes visibles ne suffisent pas
          pour relire/corriger confortablement un texte long. Le
          textarea plein écran est LE MÊME champ (même value/onChange,
          juste une autre présentation), donc rien à synchroniser. */}
      {pleinEcran && (
        <div className="fixed inset-0 z-50 flex flex-col gap-3 bg-dj-fond p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-dj-texte">
              Contenu pour {agentNom} · {matiereChoisie}
            </p>
            <button
              onClick={() => setPleinEcran(false)}
              aria-label="Réduire"
              className="flex h-8 w-8 items-center justify-center rounded-full text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
            >
              <Minimize2 size={18} />
            </button>
          </div>
          <textarea
            value={texteContenu}
            onChange={(e) => setTexteContenu(e.target.value)}
            autoFocus
            placeholder="Ce que l'IA doit savoir et comment elle doit enseigner cette matière…"
            className="flex-1 resize-none rounded-xl border border-dj-bordure bg-transparent px-3 py-2 text-sm text-dj-texte outline-none"
          />
        </div>
      )}

      {erreur && <p className="text-sm text-red-500">{erreur}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={enregistrerContenu}
          disabled={enregistrement || test || !texteContenu.trim()}
          className="rounded-xl bg-dj-accent-1 px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          {enregistrement ? "Enregistrement…" : "Enregistrer et générer le code"}
        </button>
        <button
          onClick={testerContenu}
          disabled={enregistrement || test || !texteContenu.trim()}
          className="flex items-center gap-2 rounded-xl border border-dj-bordure px-4 py-2 text-sm font-medium text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-50"
        >
          <FlaskConical size={16} />
          {test ? "Ouverture…" : "Tester"}
        </button>
      </div>
    </section>
  );
}

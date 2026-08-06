"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import Image from "next/image";
import { BookOpen, Briefcase, Milestone, LayoutGrid, Globe, Zap, ChevronDown, Loader2 } from "lucide-react";
import { appelerApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { messageErreur } from "@/lib/erreurs";
import { BoutonDevenirCreateur } from "@/components/BoutonDevenirCreateur";
import { IconeGenerique } from "@/components/icones/IconeGenerique";

// Ajouté le 31/07 (Bourama : "je veux que ce soit l'interface d'un chat en
// premier") -- reprend le principe des boutons de la page Services de la
// vitrine (djiguigne-ai/components/SectionsProduit.tsx), réécrit ici avec
// le design du frontend (cartes/couleurs dj-*) plutôt qu'un copier-coller.
//
// Rattrapé le 05/08 sur SectionsProduit.tsx (vitrine), qui avait pris deux
// mises à jour jamais reportées ici : le 6ème bouton "Exécution" (31/07)
// et le redesign "sélectionner une catégorie replie la liste en barre
// latérale (PC) / tiroir (mobile)" (01/08). Même comportement, mêmes 6
// catégories, adapté au design du frontend.
//
// Utilisé à deux endroits :
// - app/page.tsx : uniquement si l'utilisateur n'a pas encore de
//   premier_agent_id (sinon `/` redirige direct vers son chat, voir ce
//   fichier).
// - app/choisir-agent/page.tsx : toujours affiché, jamais de redirection --
//   c'est la page vers laquelle pointe le bouton "Changer d'IA" de la
//   sidebar du chat (voir SidebarChat.tsx), pour ne pas boucler sur `/`.
//
// Cliquer sur un agent enregistre ce choix comme premier_agent_id (si
// connecté -- PATCH /api/profiles/me) puis ouvre son chat. Un visiteur non
// connecté peut quand même choisir un agent et discuter, simplement son
// choix n'est pas mémorisé pour la prochaine visite.

type CleSection = "matieres" | "metier" | "filiere" | "domaine" | "languesAfricaines" | "execution";

const CONFIG_SECTIONS: Record<CleSection, { param: string; libelle: string; icon: React.ReactNode }> = {
  matieres: { param: "avec_matiere", libelle: "Matières", icon: <BookOpen size={18} /> },
  metier: { param: "avec_metier", libelle: "Métier", icon: <Briefcase size={18} /> },
  filiere: { param: "avec_filiere", libelle: "Filière", icon: <Milestone size={18} /> },
  domaine: { param: "avec_domaine", libelle: "Domaine", icon: <LayoutGrid size={18} /> },
  languesAfricaines: { param: "avec_langue_africaine", libelle: "Langues africaines", icon: <Globe size={18} /> },
  execution: { param: "avec_execution", libelle: "Exécution", icon: <Zap size={18} /> },
};

const SECTIONS: CleSection[] = ["matieres", "metier", "filiere", "domaine", "languesAfricaines", "execution"];

type AgentSection = {
  id: string;
  nom: string;
  icone_url?: string | null;
  description?: string;
};

export function SelecteurAgent() {
  const router = useRouter();
  const [ouverte, setOuverte] = useState<CleSection | null>(null);
  const [tiroirOuvert, setTiroirOuvert] = useState(false);
  // Repliée par défaut dès qu'une catégorie est choisie, même principe
  // que côté vitrine : plus de place pour les IA. Icônes seules + bouton
  // pour déplier/replier.
  const [barreRepliee, setBarreRepliee] = useState(true);
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);
  const [agentsParSection, setAgentsParSection] = useState<Partial<Record<CleSection, AgentSection[]>>>({});
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choixEnCours, setChoixEnCours] = useState<string | null>(null);

  async function ouvrir(section: CleSection) {
    setTiroirOuvert(false);
    if (ouverte === section) {
      setOuverte(null);
      return;
    }
    setOuverte(section);
    setErreur(null);
    if (agentsParSection[section]) return;

    setChargement(true);
    try {
      const { param } = CONFIG_SECTIONS[section];
      const reponse = await appelerApi(`/api/feed?${param}=true&limite=50`);
      setAgentsParSection((prev) => ({ ...prev, [section]: reponse.agents ?? [] }));
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setChargement(false);
    }
  }

  async function choisirAgent(agent: AgentSection) {
    setChoixEnCours(agent.id);
    setErreur(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await appelerApi("/api/profiles/me", {
          method: "PATCH",
          body: JSON.stringify({ premier_agent_id: agent.id }),
        });
      }

      router.push(`/agent/${agent.id}/chat`);
    } catch (e) {
      setErreur(messageErreur(e));
      setChoixEnCours(null);
    }
  }

  const agentsSectionOuverte = ouverte ? agentsParSection[ouverte] : undefined;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-5 py-14">
      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-dj-texte sm:text-4xl">
          Choisis ton IA
        </h1>
        <p className="mt-3 text-dj-texte-muet">
          Sélectionne une catégorie, puis l'agent avec qui tu veux discuter.
        </p>
      </div>

      {!ouverte ? (
        // --- Rien de sélectionné : liste empilée classique ---
        <div className="flex w-full max-w-xs flex-col gap-3 animate-dj-fade-up">
          {SECTIONS.map((cle) => {
            const { libelle, icon } = CONFIG_SECTIONS[cle];
            return (
              <button
                key={cle}
                type="button"
                onClick={() => ouvrir(cle)}
                aria-expanded={false}
                className="flex items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface px-5 py-4 text-left font-display text-base font-semibold text-dj-texte transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
              >
                <span className="text-dj-accent-1">{icon}</span>
                {libelle}
              </button>
            );
          })}
        </div>
      ) : (
        // --- Une catégorie sélectionnée : barre latérale (PC) / bouton +
        // tiroir (mobile) à côté des résultats, même redesign que la
        // vitrine (SectionsProduit.tsx, 01/08) ---
        <div className="flex w-full flex-col gap-4 animate-dj-fade-up sm:flex-row sm:items-start sm:gap-6">
          {/* Barre latérale PC -- rétractable (icônes seules) */}
          <div
            className={
              barreRepliee
                ? "hidden w-14 shrink-0 flex-col items-center gap-2 sm:flex"
                : "hidden w-52 shrink-0 flex-col gap-2 sm:flex"
            }
          >
            <button
              type="button"
              onClick={() => setBarreRepliee((v) => !v)}
              aria-label={barreRepliee ? "Déplier la liste des catégories" : "Replier la liste des catégories"}
              title={barreRepliee ? "Déplier" : "Replier"}
              className={
                barreRepliee
                  ? "mb-1 flex h-9 w-9 items-center justify-center rounded-lg border border-dj-bordure text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
                  : "mb-1 flex h-9 items-center justify-end gap-1 self-end rounded-lg border border-dj-bordure px-2.5 text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
              }
            >
              <ChevronDouble replie={barreRepliee} />
            </button>

            {SECTIONS.map((cle) => {
              const { libelle, icon } = CONFIG_SECTIONS[cle];
              return barreRepliee ? (
                <button
                  key={cle}
                  type="button"
                  onClick={() => ouvrir(cle)}
                  aria-expanded={ouverte === cle}
                  aria-label={libelle}
                  title={libelle}
                  className={
                    ouverte === cle
                      ? "flex h-11 w-11 items-center justify-center rounded-lg border border-dj-bordure-forte bg-dj-surface-haute text-dj-accent-1 transition-colors"
                      : "flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-dj-texte-muet transition-colors hover:border-dj-bordure hover:bg-dj-surface"
                  }
                >
                  {icon}
                </button>
              ) : (
                <button
                  key={cle}
                  type="button"
                  onClick={() => ouvrir(cle)}
                  aria-expanded={ouverte === cle}
                  className={
                    ouverte === cle
                      ? "flex items-center gap-2.5 rounded-lg border border-dj-bordure-forte bg-dj-surface-haute px-3.5 py-2.5 text-left text-sm font-semibold text-dj-texte transition-colors"
                      : "flex items-center gap-2.5 rounded-lg border border-transparent px-3.5 py-2.5 text-left text-sm font-semibold text-dj-texte-muet transition-colors hover:border-dj-bordure hover:bg-dj-surface"
                  }
                >
                  <span className="text-dj-accent-1">{icon}</span>
                  {libelle}
                </button>
              );
            })}
          </div>

          {/* Déclencheur tiroir mobile */}
          <div className="sm:hidden">
            <button
              type="button"
              onClick={() => setTiroirOuvert(true)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-dj-bordure bg-dj-surface px-5 py-3.5 text-left font-display text-sm font-semibold text-dj-texte transition-colors hover:border-dj-bordure-forte"
            >
              <span className="flex items-center gap-3">
                <span className="text-dj-accent-1">{CONFIG_SECTIONS[ouverte].icon}</span>
                {CONFIG_SECTIONS[ouverte].libelle}
              </span>
              <ChevronDown size={16} />
            </button>

            {monte &&
              tiroirOuvert &&
              createPortal(
                <div
                  className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:hidden"
                  onClick={() => setTiroirOuvert(false)}
                >
                  <div
                    className="w-full max-w-sm rounded-t-2xl border border-dj-bordure bg-dj-surface p-4 pb-6 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-dj-bordure" />
                    <div className="flex flex-col gap-2">
                      {SECTIONS.map((cle) => {
                        const { libelle, icon } = CONFIG_SECTIONS[cle];
                        return (
                          <button
                            key={cle}
                            type="button"
                            onClick={() => ouvrir(cle)}
                            aria-expanded={ouverte === cle}
                            className={
                              ouverte === cle
                                ? "flex items-center gap-3 rounded-xl border border-dj-bordure-forte bg-dj-surface-haute px-4 py-3 text-left text-sm font-semibold text-dj-texte transition-colors"
                                : "flex items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-left text-sm font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute"
                            }
                          >
                            <span className="text-dj-accent-1">{icon}</span>
                            {libelle}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>

          {/* Résultats */}
          <div className="w-full flex-1">
            {chargement ? (
              <div className="flex items-center justify-center gap-2 text-sm text-dj-texte-muet animate-dj-fade-in-rapide sm:justify-start">
                <Loader2 size={16} className="animate-spin text-dj-accent-1" />
                Chargement…
              </div>
            ) : erreur ? (
              <p className="text-center text-sm text-dj-texte-muet sm:text-left">{erreur}</p>
            ) : !agentsSectionOuverte || agentsSectionOuverte.length === 0 ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-dj-texte-muet">
                  Il n'y a pas encore d'IA dans cette catégorie, c'est l'occasion de créer la vôtre !
                </p>
                <BoutonDevenirCreateur
                  label="Devenir créateur"
                  explicationTitre="Comment ça marche"
                  explicationCorps="Choisis d'abord la matière de ton IA, puis remplis le formulaire de création (identité, comportement, base de connaissance...). Ton IA est publiée dès que tu la crées."
                  continuerLabel="Continuer"
                  annulerLabel="Annuler"
                  categoriePreselectionnee={ouverte}
                />
              </div>
            ) : (
              <div className="grid w-full gap-3 sm:grid-cols-2">
                {agentsSectionOuverte.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => choisirAgent(agent)}
                    disabled={choixEnCours !== null}
                    className="group flex items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface p-3 text-left transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute disabled:opacity-50"
                  >
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-dj-surface-haute">
                      {agent.icone_url ? (
                        <Image
                          src={agent.icone_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <IconeGenerique className="h-5 w-5 text-dj-accent-1" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-display text-sm font-bold text-dj-texte">
                        {agent.nom}
                      </span>
                      {agent.description && (
                        <span className="truncate text-xs text-dj-texte-muet">{agent.description}</span>
                      )}
                    </span>
                    {choixEnCours === agent.id && (
                      <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-dj-texte-muet animate-dj-fade-in-rapide">
                        <Loader2 size={12} className="animate-spin text-dj-accent-1" />
                        Ouverture…
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Reprise telle quelle de SectionsProduit.tsx (vitrine) -- pointe vers la
// droite quand repliée (action = déplier), vers la gauche quand dépliée
// (action = replier).
function ChevronDouble({ replie }: { replie: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: replie ? "none" : "rotate(180deg)" }}
    >
      <path d="m8 5 7 7-7 7" />
      <path d="m14 5 7 7-7 7" />
    </svg>
  );
}

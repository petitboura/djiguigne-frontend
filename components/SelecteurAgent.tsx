"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BookOpen, Briefcase, Milestone, LayoutGrid, Globe } from "lucide-react";
import { appelerApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { messageErreur } from "@/lib/erreurs";
import { BoutonDevenirCreateur } from "@/components/BoutonDevenirCreateur";

// Ajouté le 31/07 (Bourama : "je veux que ce soit l'interface d'un chat en
// premier") -- reprend le principe des 5 boutons de la page Services de la
// vitrine (djiguigne-ai/components/SectionsProduit.tsx), réécrit ici avec
// le design du frontend (cartes/couleurs dj-*) plutôt qu'un copier-coller.
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

type CleSection = "matieres" | "metier" | "filiere" | "domaine" | "languesAfricaines";

const CONFIG_SECTIONS: Record<CleSection, { param: string; libelle: string; icon: React.ReactNode }> = {
  matieres: { param: "avec_matiere", libelle: "Matières", icon: <BookOpen size={18} /> },
  metier: { param: "avec_metier", libelle: "Métier", icon: <Briefcase size={18} /> },
  filiere: { param: "avec_filiere", libelle: "Filière", icon: <Milestone size={18} /> },
  domaine: { param: "avec_domaine", libelle: "Domaine", icon: <LayoutGrid size={18} /> },
  languesAfricaines: { param: "avec_langue_africaine", libelle: "Langues africaines", icon: <Globe size={18} /> },
};

type AgentSection = {
  id: string;
  nom: string;
  icone_page?: string;
  image_vitrine_url?: string | null;
  description?: string;
};

export function SelecteurAgent() {
  const router = useRouter();
  const [ouverte, setOuverte] = useState<CleSection | null>(null);
  const [agentsParSection, setAgentsParSection] = useState<Partial<Record<CleSection, AgentSection[]>>>({});
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choixEnCours, setChoixEnCours] = useState<string | null>(null);

  async function ouvrir(section: CleSection) {
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
    <div className="mx-auto flex max-w-xl flex-col items-center gap-8 px-5 py-14">
      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-dj-texte sm:text-4xl">
          Choisis ton IA
        </h1>
        <p className="mt-3 text-dj-texte-muet">
          Sélectionne une catégorie, puis l'agent avec qui tu veux discuter.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {(Object.keys(CONFIG_SECTIONS) as CleSection[]).map((cle) => {
          const { libelle, icon } = CONFIG_SECTIONS[cle];
          const estOuverte = ouverte === cle;
          return (
            <button
              key={cle}
              type="button"
              onClick={() => ouvrir(cle)}
              aria-expanded={estOuverte}
              className={`flex items-center gap-3 rounded-xl border px-5 py-4 text-left font-display text-base font-semibold text-dj-texte transition-colors ${
                estOuverte
                  ? "border-dj-bordure-forte bg-dj-surface-haute"
                  : "border-dj-bordure bg-dj-surface hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
              }`}
            >
              <span className="text-dj-accent-1">{icon}</span>
              {libelle}
            </button>
          );
        })}
      </div>

      {ouverte && (
        <div className="w-full">
          {chargement ? (
            <p className="text-center text-sm text-dj-texte-muet">Chargement…</p>
          ) : erreur ? (
            <p className="text-center text-sm text-dj-texte-muet">{erreur}</p>
          ) : !agentsSectionOuverte || agentsSectionOuverte.length === 0 ? (
            // Message aligné le 31/07 sur components/SectionsProduit.tsx
            // (djiguigne-ai) : la distinction "bientôt" (catégorie sans
            // champ en base) vs "vide" (catégorie avec champ mais aucune
            // IA) a été abandonnée là-bas au profit d'un seul message +
            // CTA "Devenir créateur", donc on reprend pareil ici plutôt
            // que de garder l'ancien texte générique.
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
                    {agent.image_vitrine_url ? (
                      <Image
                        src={agent.image_vitrine_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <span className="text-lg leading-none">{agent.icone_page || "🤖"}</span>
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
                    <span className="ml-auto shrink-0 text-xs text-dj-texte-muet">Ouverture…</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

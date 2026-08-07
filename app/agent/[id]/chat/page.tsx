import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { appelerApiPublicOuNull } from "@/lib/api-serveur";
import { nettoyerUrlRetour } from "@/lib/retourExterne";
import { ChatAgentClient } from "@/components/chat/ChatAgentClient";

// Remplace chat.py (Streamlit sur Railway). Tout reste dans la même app Next.js/Vercel : plus de
// saut entre domaines, donc plus du tout le bug remonté par Bourama
// (plein écran / retour qui ouvraient une "nouvelle page" à chaque fois).
//
// Header du haut retiré le 2026-07-16 (Bourama : reproduire le visuel du
// chat Streamlit "comme si je n'avais pas quitté Streamlit") : chat.py
// n'a jamais eu de bandeau -- Retour/Partager/Historique/Avis vivent tous
// dans la sidebar (voir SidebarChat.tsx), pas dans un header séparé.
// Le bouton "Télécharger" (BoutonInstaller, ajouté juste avant dans le
// header) suit le même chemin : déplacé dans la sidebar plutôt que perdu.

type AgentDetailPublic = {
  id: string;
  nom: string;
  icone_url: string | null;
  titre_accueil: string;
  sous_titre_accueil: string;
  // Modeles premium (02/08/2026, voir core/fournisseurs_llm.py) -- deja
  // renvoyes par le backend (api/agents.py:AgentDetailPublic), juste
  // ajoutes ici pour que ce type local (utilise pour le SSR de cette
  // page) les laisse passer jusqu'a ChatAgentClient.
  modeles_disponibles?: { modele_id: string; label: string; distributeur: string; palier: string }[];
  modele_choisi?: string | null;
  // Agent "Nitrux" / contenu dynamique par matière (06/08/2026) -- voir
  // core/contenu_dynamique_matiere.py côté backend. Passé jusqu'à
  // ChatAgentClient pour afficher l'entrée "Matières" dans la sidebar.
  contenu_dynamique_par_matiere?: boolean;
};

async function chargerAgent(id: string): Promise<AgentDetailPublic | null> {
  return appelerApiPublicOuNull(`/api/agents/${id}`);
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const agent = await chargerAgent(params.id);
  if (!agent) return { title: "IA introuvable — Djiguignè AI" };
  return {
    title: `Discuter avec ${agent.nom} — Djiguignè AI`,
    // Installation par IA (Bourama, 2026-07-15) : ce manifest et cette
    // icône remplacent ceux de app/layout.tsx UNIQUEMENT sur cette page
    // -- voir app/agent/[id]/manifest.webmanifest/route.ts pour le
    // détail iOS/Android.
    manifest: `/agent/${agent.id}/manifest.webmanifest`,
    icons: { apple: `/agent/${agent.id}/icone?taille=192` },
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: agent.nom },
  };
}

// Retour vers l'IA d'origine après "Tester" depuis "L'IA de mes élèves"
// (06/08/2026, demande Bourama : ce cas -- déjà dans l'app, pas venu de
// la vitrine -- doit être traité différemment de ?retour=). Volontairement
// un chemin interne relatif uniquement (jamais une URL complète comme
// nettoyerUrlRetour ci-dessus) : on n'a besoin de rien d'autre pour
// revenir sur le chat d'un agent, et ça évite tout risque de redirection
// vers un domaine externe.
function nettoyerCheminRetourIA(valeur: string | undefined): string | undefined {
  if (!valeur) return undefined;
  return /^\/agent\/[a-zA-Z0-9_-]+\/chat$/.test(valeur) ? valeur : undefined;
}

export default async function PageChatAgent({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { retour?: string; retourIA?: string };
}) {
  const agent = await chargerAgent(params.id);
  if (!agent) notFound();

  return (
    <ChatAgentClient
      agent={agent}
      retourExterne={nettoyerUrlRetour(searchParams.retour)}
      retourIA={nettoyerCheminRetourIA(searchParams.retourIA)}
    />
  );
}

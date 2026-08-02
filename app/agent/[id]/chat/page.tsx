import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { appelerApiPublicOuNull } from "@/lib/api-serveur";
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
  icone_page: string;
  titre_accueil: string;
  sous_titre_accueil: string;
  // Modeles premium (02/08/2026, voir core/fournisseurs_llm.py) -- deja
  // renvoyes par le backend (api/agents.py:AgentDetailPublic), juste
  // ajoutes ici pour que ce type local (utilise pour le SSR de cette
  // page) les laisse passer jusqu'a ChatAgentClient.
  modeles_disponibles?: { modele_id: string; label: string; distributeur: string; palier: string }[];
  modele_choisi?: string | null;
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

// Support "retour vers la vitrine" (Bourama, 2026-07-30) : la vitrine peut
// lier directement vers le chat d'un agent choisi par le visiteur via
// ?retour=<url complète de la vitrine>. Si présent, le bouton "Retour à
// l'agent" de la sidebar renvoie vers cette URL externe au lieu de la page
// agent interne. On ne garde que http(s):// pour éviter tout schéma
// dangereux (javascript:, data:, etc.) glissé dans le paramètre.
function nettoyerUrlRetour(valeur: string | undefined): string | undefined {
  if (!valeur) return undefined;
  try {
    const url = new URL(valeur);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export default async function PageChatAgent({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { retour?: string };
}) {
  const agent = await chargerAgent(params.id);
  if (!agent) notFound();

  return <ChatAgentClient agent={agent} retourExterne={nettoyerUrlRetour(searchParams.retour)} />;
}

"use client";

import { useEffect, useState } from "react";
import { appelerApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { ChatIA } from "./ChatIA";
import { MessageAffiche, nettoyerMessageHistorique } from "./BulleMessage";
import { SidebarChat, FilConversation } from "./SidebarChat";
import { useHauteurVisuelle } from "@/lib/useHauteurVisuelle";

// Composant client qui porte l'état de "quel fil de conversation est
// affiché" -- ajouté le 2026-07-16 pour brancher la sidebar façon
// Streamlit (SidebarChat.tsx) sur ChatIA, qui elle ne gère plus son
// conversation_id en interne (voir ChatIA.tsx). ChatIA est remonté à
// chaque changement de fil via `key={cle}` : le plus simple pour repartir
// d'un état interne propre (messages, popup de feedback...) sans dupliquer
// sa logique ici.
export function ChatAgentClient({
  agent,
  retourExterne,
}: {
  agent: {
    id: string;
    nom: string;
    icone_page: string;
    titre_accueil: string;
    sous_titre_accueil: string;
    // Modeles premium (02/08/2026, voir core/fournisseurs_llm.py) --
    // renvoyes par GET /api/agents/{id} (AgentDetailPublic), optionnels
    // pour rester compatibles avec tout appelant qui ne les fournirait
    // pas encore (voir app/agent/[id]/chat/page.tsx).
    modeles_disponibles?: { modele_id: string; label: string; distributeur: string; palier: string }[];
    modele_choisi?: string | null;
  };
  retourExterne?: string;
}) {
  const [cle, setCle] = useState(() => crypto.randomUUID());
  const [messagesInitiaux, setMessagesInitiaux] = useState<MessageAffiche[]>([]);
  const [nbMessages, setNbMessages] = useState(0);
  useHauteurVisuelle();

  // Ajouté le 2026-08-01 (Bourama) : cliquer une IA depuis la vitrine doit
  // avoir le même effet que la choisir depuis le sélecteur de l'app
  // (SelecteurAgent.choisirAgent) -- elle devient le chat par défaut, donc
  // la prochaine ouverture de l'app y va directement. `retourExterne` sert
  // ici de marqueur "vient de la vitrine" (voir SectionsProduit.tsx côté
  // djiguigne-ai) ; sans lui, arriver sur un chat par un autre lien direct
  // ne touche pas au choix par défaut de l'utilisateur.
  useEffect(() => {
    if (!retourExterne) return;
    let annule = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || annule) return;
      try {
        await appelerApi("/api/profiles/me", {
          method: "PATCH",
          body: JSON.stringify({ premier_agent_id: agent.id }),
        });
      } catch {
        // Ne bloque jamais l'affichage du chat pour ça.
      }
    })();
    return () => {
      annule = true;
    };
  }, [retourExterne, agent.id]);

  function nouvelleConversation() {
    setCle(crypto.randomUUID());
    setMessagesInitiaux([]);
    setNbMessages(0);
  }

  async function selectionnerConversation(fil: FilConversation) {
    try {
      const cheminId = fil.conversation_id ?? "legacy";
      const lignes: { role: "user" | "assistant"; content: string; created_at: string }[] =
        await appelerApi(`/api/historique/${agent.id}/conversations/${cheminId}`);
      // Même règle que côté Streamlit (_charger_messages_conversation +
      // son appelant) : un fil "legacy" (conversation_id NULL en base)
      // repart sur un tout nouveau conversation_id pour les PROCHAINS
      // messages -- on ne continue jamais à écrire avec conversation_id
      // NULL, seulement à relire ce qui existait déjà avant cette
      // fonctionnalité. Conséquence identique à Streamlit : après avoir
      // rouvert un fil "legacy", aucune entrée de la liste ne réapparaît
      // comme "active" (fil.conversation_id est None, `cle` est un nouvel
      // uuid) -- pas une régression, le même comportement exact que
      // faces/vues/chat.py.
      setCle(fil.conversation_id ?? crypto.randomUUID());
      setMessagesInitiaux(
        lignes.map((l) => {
          // Seuls les messages UTILISATEUR sont enrichis côté client avant
          // envoi (voir ChatIA.tsx) -- une réponse assistant est déjà le
          // texte final tel quel, rien à nettoyer.
          if (l.role !== "user") {
            return { id: null, role: l.role, content: l.content, created_at: l.created_at };
          }
          const { texte, pieceJointe } = nettoyerMessageHistorique(l.content);
          return { id: null, role: l.role, content: texte, created_at: l.created_at, pieceJointe };
        })
      );
      setNbMessages(lignes.length);
    } catch {
      // Échec de rechargement : on laisse le fil courant tel quel plutôt
      // que de casser toute la page.
    }
  }

  return (
    <div
      className="flex h-dvh"
      // h-dvh (Tailwind) suffit sur la plupart des navigateurs récents ;
      // --vh-visuelle (posée par useHauteurVisuelle) prend le relais en
      // style inline uniquement là où le navigateur la calcule (iOS
      // Safari, voir lib/useHauteurVisuelle.ts) -- fallback sur 100dvh si
      // le JS n'a pas encore tourné (premier rendu SSR).
      style={{ height: "var(--vh-visuelle, 100dvh)" }}
    >
      <SidebarChat
        agentId={agent.id}
        retourExterne={retourExterne}
        aDesMessages={nbMessages > 0}
        conversationActiveId={cle}
        onNouvelleConversation={nouvelleConversation}
        onSelectionnerConversation={selectionnerConversation}
      />
      <div className="flex-1 overflow-hidden">
        <ChatIA
          key={cle}
          agentId={agent.id}
          nomAgent={agent.nom}
          titreAccueil={agent.titre_accueil}
          sousTitreAccueil={agent.sous_titre_accueil}
          conversationId={cle}
          messagesInitiaux={messagesInitiaux}
          onMessagesChange={setNbMessages}
          modelesDisponibles={agent.modeles_disponibles}
          modeleChoisi={agent.modele_choisi}
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { appelerApi } from "@/lib/api";
import { PleinEcran } from "@/components/PleinEcran";

// Ajouté le 2026-07-13 (Bourama : "conversation récente par membre de la
// plateforme qui se conserve pour chaque agent utilisée, et qui se met
// dans le tableau de bord, à gauche comme toute IA en fait"). Une entrée
// par agent avec qui l'utilisateur a déjà échangé (pas par message) --
// cliquer dessus rouvre le chat de cet agent précis, déjà connecté (même
// pont de session que components/BoutonUtiliser.tsx).
//
// Repositionné le 2026-07-13 (Bourama : la colonne fixe à gauche prenait
// trop de place pour ce que c'est -- déplacé dans une bulle déclenchée par
// un bouton "Historique", dans la même rangée que les autres boutons de
// "Mon espace", voir app/dashboard/page.tsx. Ce composant ne rend donc
// pas lui-même le déclencheur de la bulle (bouton + état ouvert/fermé),
// seulement le CONTENU -- la page parente gère quand l'afficher.
//
// Refonte du 2026-07-15 (Bourama : "pas comme ceci, non un vrai
// historique... et pas dans des bulles mais séparée, peut-être ligne") :
// l'affichage compact en bulles (icône + nom seul) est remplacé par une
// vraie liste de lignes séparées par des traits, chacune avec le dernier
// message en dessous du nom -- ce que dernier_message/dernier_message_role
// exposaient déjà côté API, juste pas affiché jusqu'ici. Bouton plein
// écran ajouté, géré ICI (état local) plutôt que par le parent : la bulle
// reste courte, le plein écran affiche la liste en grand sans changer qui
// déclenche quoi.
//
// Mis a jour le 25/07/2026 (suite au retrait complet de Streamlit) :
// ouvrirConversation naviguait vers une URL Streamlit (?agent=...) avec
// un pont de session par token dans l'URL. Le chat vit maintenant dans
// cette meme app Next.js (voir BoutonUtiliser.tsx, migration du
// 2026-07-15) : plus besoin de pont, un simple push interne suffit, la
// session Supabase deja active cote client s'applique directement.

type Conversation = {
  agent_id: string;
  agent_nom: string;
  agent_icone: string;
  dernier_message: string;
  dernier_message_role: string;
  derniere_activite: string;
};

function tempsRelatif(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  return `il y a ${jours} j`;
}

function LigneConversation({
  conv,
  onOuvrir,
}: {
  conv: Conversation;
  onOuvrir: (agentId: string) => void;
}) {
  const prefixe = conv.dernier_message_role === "user" ? "Toi : " : "";
  return (
    <button
      onClick={() => onOuvrir(conv.agent_id)}
      className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-dj-surface-haute"
    >
      <span className="mt-0.5 text-xl leading-none">{conv.agent_icone}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-bold text-dj-texte">{conv.agent_nom}</span>
          {conv.derniere_activite && (
            <span className="shrink-0 text-xs text-dj-texte-muet">
              {tempsRelatif(conv.derniere_activite)}
            </span>
          )}
        </div>
        {conv.dernier_message && (
          <p className="mt-0.5 truncate text-sm text-dj-texte-muet">
            {prefixe}
            {conv.dernier_message}
          </p>
        )}
      </div>
    </button>
  );
}

export function HistoriqueConversations() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [pleinEcran, setPleinEcran] = useState(false);

  useEffect(() => {
    appelerApi("/api/historique")
      .then(setConversations)
      .catch(() => setConversations([]));
  }, []);

  function ouvrirConversation(agentId: string) {
    router.push(`/agent/${agentId}/chat`);
  }

  if (conversations === null) {
    return <p className="px-3 py-3 text-sm text-dj-texte-muet">Chargement...</p>;
  }

  if (conversations.length === 0) {
    return (
      <p className="px-3 py-3 text-sm text-dj-texte-muet">
        Aucune conversation pour l&apos;instant.
      </p>
    );
  }

  return (
    <>
      <div className="flex max-h-80 flex-col overflow-y-auto">
        {conversations.map((conv, i) => (
          <div key={conv.agent_id} className={i > 0 ? "border-t border-dj-bordure" : ""}>
            <LigneConversation conv={conv} onOuvrir={ouvrirConversation} />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setPleinEcran(true)}
        className="mt-1 block w-full border-t border-dj-bordure px-3 py-2 text-center text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
      >
        Voir en plein écran ⤢
      </button>

      <PleinEcran ouvert={pleinEcran} onFermer={() => setPleinEcran(false)} titre="Historique">
        {conversations.map((conv, i) => (
          <div key={conv.agent_id} className={i > 0 ? "border-t border-dj-bordure" : ""}>
            <LigneConversation conv={conv} onOuvrir={ouvrirConversation} />
          </div>
        ))}
      </PleinEcran>
    </>
  );
}


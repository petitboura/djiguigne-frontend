"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronsLeft, ChevronsRight, ArrowLeft, MessageSquarePlus, History, Star, Share2, UserCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { appelerApi } from "@/lib/api";
import { NoteAgent } from "@/components/NoteAgent";
import { CommentairesAgent } from "@/components/CommentairesAgent";
import { BoutonInstaller } from "@/components/BoutonInstaller";
import { MonProfilAgent } from "@/components/MonProfilAgent";

// Reproduit la sidebar de faces/vues/chat.py (Streamlit) dans le chat
// Next.js -- demande de Bourama (2026-07-16) : "comme si j'avais pas
// quitté Streamlit en termes de visuel". Cinq éléments, dans le même
// ordre, avec le même style visuel que le thème Streamlit
// (theme_djiguigne.py) :
//   1. Retour à l'agent -- dégradé orange (comme le .stButton standard)
//   2. Nouvelle conversation -- SANS dégradé, seulement si le fil courant
//      a déjà des messages (voir chat.py : "n'a de sens que s'il y a
//      quelque chose à quitter")
//   3. Historique -- volet repliable, fils de discussion listés à plat
//      (pas de style bouton, séparateur presque invisible), fermé par
//      défaut, se referme après sélection
//   4. Avis sur cet agent -- volet repliable, réutilise les composants
//      existants NoteAgent + CommentairesAgent (déjà utilisés sur la page
//      agent, mêmes endpoints)
//   5. Partager -- dégradé orange plein largeur (voir chat.py, bouton
//      HTML/JS custom ; ici on réutilise juste la logique de partage déjà
//      dans components/BoutonPartager.tsx, avec un style différent, sans
//      toucher à ce composant partagé utilisé ailleurs)
//
// N'affecte jamais BarreDeSaisie.tsx ni l'espacement des bulles de
// message (BulleMessage.tsx) -- consigne explicite de Bourama.
//
// Rail permanent ajouté le 2026-07-27 (Bourama : "les boutons existants
// qui sont dans le sidebar, et qui apparaissent aussi") -- bande fine
// d'icônes (w-14) toujours visible à gauche du panneau, accès direct aux
// mêmes actions sans ouvrir le panneau entier. Desktop uniquement
// (hidden md:flex) : sur mobile l'audit responsive du 27/07 a
// spécifiquement retiré tout ce qui poussait le contenu du chat, donc le
// petit bouton bascule flottant existant reste seul sur petit écran
// (md:hidden) plutôt que d'ajouter une bande permanente supplémentaire
// qui grignoterait la largeur déjà réduite.

type FilConversation = {
  conversation_id: string | null;
  titre: string;
  derniere_activite: string;
};

export function SidebarChat({
  agentId,
  aDesMessages,
  conversationActiveId,
  onNouvelleConversation,
  onSelectionnerConversation,
}: {
  agentId: string;
  aDesMessages: boolean;
  conversationActiveId: string | null;
  onNouvelleConversation: () => void;
  onSelectionnerConversation: (fil: FilConversation) => void;
}) {
  const [ouverte, setOuverte] = useState(false);
  const [connecte, setConnecte] = useState<boolean | undefined>(undefined);
  const [fils, setFils] = useState<FilConversation[] | null>(null);
  const [historiqueDeplie, setHistoriqueDeplie] = useState(false);
  const [avisDeplie, setAvisDeplie] = useState(false);
  const [profilDeplie, setProfilDeplie] = useState(false);
  const [profilADesChamps, setProfilADesChamps] = useState(false);
  const [copie, setCopie] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const boutonBasculeRef = useRef<HTMLButtonElement>(null);
  const railRef = useRef<HTMLElement>(null);

  // Clic en dehors du panneau -> fermeture (2026-07-20, bug trouvé par
  // Bourama en test réel). mousedown plutôt que click : se déclenche
  // avant le click du bouton bascule lui-même, donc on exclut ce bouton
  // explicitement (via boutonBasculeRef) pour éviter un double-toggle
  // (fermeture par ce handler puis réouverture immédiate par le onClick
  // du bouton, dans le même geste). Même raison pour railRef depuis le
  // 27/07 : le rail permanent contient son propre bouton bascule.
  useEffect(() => {
    if (!ouverte) return;
    function gererClicExterieur(e: MouseEvent) {
      const cible = e.target as Node;
      if (asideRef.current?.contains(cible)) return;
      if (boutonBasculeRef.current?.contains(cible)) return;
      if (railRef.current?.contains(cible)) return;
      setOuverte(false);
    }
    document.addEventListener("mousedown", gererClicExterieur);
    return () => document.removeEventListener("mousedown", gererClicExterieur);
  }, [ouverte]);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) setOuverte(true);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setConnecte(!!session);
    });
  }, []);

  useEffect(() => {
    if (!connecte) return;
    appelerApi(`/api/historique/${agentId}/conversations`)
      .then((r: FilConversation[]) => setFils(r))
      .catch(() => setFils([]));
  }, [connecte, agentId, aDesMessages]);

  async function partager() {
    const url = `${window.location.origin}/agent/${agentId}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // Annulé par la personne -- flux normal du Web Share API.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      window.prompt("Copie ce lien :", url);
    }
  }

  function choisirFil(fil: FilConversation) {
    onSelectionnerConversation(fil);
    setHistoriqueDeplie(false);
  }

  // Bascule exclusive pour les 3 icônes du rail qui pilotent un volet
  // repliable (Historique/Avis/Mon profil) -- corrige deux bugs remontés
  // par Bourama le 28/07 : (1) un second clic sur la même icône ne
  // refermait jamais rien (les anciens onClick forçaient toujours
  // `true`) ; (2) cliquer une AUTRE icône ne changeait visiblement rien
  // tant que la section précédente restait ouverte en même temps, plus
  // bas dans un panneau déjà rempli -- un seul volet ouvert à la fois
  // rend le changement évident. Les boutons texte du panneau lui-même
  // (plus bas) gardent leur bascule indépendante d'origine, inchangée.
  function basculerVoletRail(section: "historique" | "avis" | "profil") {
    const dejaActif =
      (section === "historique" && historiqueDeplie) ||
      (section === "avis" && avisDeplie) ||
      (section === "profil" && profilDeplie);
    setHistoriqueDeplie(section === "historique" ? !dejaActif : false);
    setAvisDeplie(section === "avis" ? !dejaActif : false);
    setProfilDeplie(section === "profil" ? !dejaActif : false);
    setOuverte(true);
  }

  return (
    <>
      {/* Fond assombri : seulement sur mobile (< md), seulement quand le
          panneau est ouvert -- sur desktop il pousse le contenu comme
          avant, pas de fond nécessaire. Cliquer dessus ferme le panneau
          (redondant avec le clic-extérieur ci-dessus, gardé explicite
          pour l'accessibilité tactile). */}
      {ouverte && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOuverte(false)}
          aria-hidden="true"
        />
      )}

      {/* Bouton replier/déplier flottant -- MOBILE UNIQUEMENT depuis le
          27/07 (md:hidden) : sur desktop le même bouton vit maintenant
          dans le rail permanent ci-dessous. */}
      <button
        ref={boutonBasculeRef}
        onClick={() => setOuverte((v) => !v)}
        aria-label={ouverte ? "Replier le panneau" : "Déplier le panneau"}
        className="fixed left-2 top-2 z-40 flex h-8 w-8 items-center justify-center rounded-md bg-black/35 text-white hover:bg-black/50 md:hidden"
      >
        {ouverte ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
      </button>

      {/* Rail permanent -- desktop uniquement, voir note en tête de
          fichier. Les actions directes (Retour, Nouvelle conversation,
          Partager) s'exécutent sans ouvrir le panneau ; les volets
          repliables (Historique, Avis, Mon profil) ouvrent le panneau ET
          déplient la section correspondante. */}
      <nav
        ref={railRef}
        aria-label="Actions rapides"
        className="hidden w-14 flex-shrink-0 flex-col items-center gap-2 border-r border-dj-bordure bg-dj-fond py-3 md:flex"
      >
        <button
          onClick={() => setOuverte((v) => !v)}
          aria-label={ouverte ? "Replier le panneau" : "Déplier le panneau"}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
        >
          {ouverte ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
        </button>

        <div className="my-1 h-px w-8 bg-dj-bordure" />

        <Link
          href={`/agent/${agentId}`}
          title="Retour à l'agent"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-dj-gradient text-[#1A0D02] transition-transform hover:-translate-y-0.5"
        >
          <ArrowLeft size={18} />
        </Link>

        {connecte && aDesMessages && (
          <button
            onClick={onNouvelleConversation}
            title="Nouvelle conversation"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-dj-bordure text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
          >
            <MessageSquarePlus size={18} />
          </button>
        )}

        {connecte && fils && fils.length > 0 && (
          <button
            onClick={() => basculerVoletRail("historique")}
            title="Historique"
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              historiqueDeplie
                ? "bg-dj-surface-haute text-dj-accent-1"
                : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
            }`}
          >
            <History size={18} />
          </button>
        )}

        <button
          onClick={() => basculerVoletRail("avis")}
          title="Avis sur cet agent"
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
            avisDeplie
              ? "bg-dj-surface-haute text-dj-accent-1"
              : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
          }`}
        >
          <Star size={18} />
        </button>

        {connecte && profilADesChamps && (
          <button
            onClick={() => basculerVoletRail("profil")}
            title="Mon profil"
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              profilDeplie
                ? "bg-dj-surface-haute text-dj-accent-1"
                : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
            }`}
          >
            <UserCircle size={18} />
          </button>
        )}

        <div className="mt-auto">
          <button
            onClick={partager}
            title={copie ? "Copié !" : "Partager"}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-dj-gradient text-[#1A0D02] transition-transform hover:-translate-y-0.5"
          >
            <Share2 size={18} />
          </button>
        </div>
      </nav>

      {/* CORRIGÉ le 22/07/2026 (Bourama : "sursaute au lieu de glisser") :
          le panneau était monté/démonté d'un coup ({ouverte && ...}), donc
          aucune transition possible -- juste apparition/disparition
          instantanée. Maintenant toujours monté, seule la largeur du
          conteneur externe est animée (overflow-hidden pour clipper
          proprement), le contenu interne garde une largeur fixe pour ne
          jamais se tasser/reflow pendant l'animation. */}
      {/* AJUSTÉ le 22/07/2026 (Bourama : "la ligne droite efface au lieu
          que la barre glisse") : la largeur seule donne l'impression
          d'un balayage (le contenu reste immobile, juste dévoilé/masqué
          par le bord droit qui bouge). Le panneau interne se translate
          maintenant EN PLUS, dans le même sens et la même durée que le
          rétrécissement de largeur -- effet "tout le bloc part vers la
          gauche" plutôt qu'un simple dévoilement. */}
      {/* MOBILE (27/07/2026, audit responsive Bourama) : "fixed" +
          "md:relative" -- sur mobile ce conteneur sort du flux normal et
          flotte par-dessus le chat (overlay, avec le fond assombri
          ci-dessus) au lieu de pousser le contenu et écraser la zone de
          chat sur un petit écran ; sur desktop (md+), retour au
          comportement d'origine (in-flow, pousse le contenu). */}
      <div
        className={`fixed inset-y-0 left-0 z-40 shrink-0 overflow-hidden transition-[width] duration-300 ease-out md:relative md:inset-auto md:z-auto ${
          ouverte ? "w-72" : "w-0"
        }`}
      >
        <aside
          ref={asideRef}
          className={`flex h-full w-72 flex-col gap-3 overflow-y-auto border-r border-dj-bordure bg-dj-fond px-3 pb-4 pt-14 transition-transform duration-300 ease-out ${
            ouverte ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Link
            href={`/agent/${agentId}`}
            className="flex items-center justify-center gap-2 rounded-full bg-dj-gradient px-4 py-2.5 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5"
          >
            <ArrowLeft size={16} />
            Retour à l&apos;agent
          </Link>

          {connecte && aDesMessages && (
            <button
              onClick={onNouvelleConversation}
              className="flex items-center justify-center gap-2 rounded-[10px] border border-dj-bordure bg-dj-surface-haute px-4 py-2.5 text-sm text-dj-texte transition-colors hover:bg-dj-surface"
            >
              <MessageSquarePlus size={16} />
              Nouvelle conversation
            </button>
          )}

          {connecte && fils && fils.length > 0 && (
            <div className="rounded-xl border border-dj-bordure">
              <button
                onClick={() => setHistoriqueDeplie((v) => !v)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-dj-texte"
              >
                <History size={16} />
                Historique
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  historiqueDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col px-1 pb-1">
                    {fils.map((fil) => {
                      const estActive = fil.conversation_id === conversationActiveId;
                      return (
                        <button
                          key={fil.conversation_id ?? "legacy"}
                          onClick={() => !estActive && choisirFil(fil)}
                          disabled={estActive}
                          className={`border-b border-white/[0.06] px-2 py-2 text-left text-sm last:border-b-0 ${
                            estActive ? "text-dj-accent-1" : "text-dj-texte hover:text-dj-accent-1"
                          }`}
                        >
                          {estActive ? "● " : ""}
                          {fil.titre}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-dj-bordure">
            <button
              onClick={() => setAvisDeplie((v) => !v)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-dj-texte"
            >
              <Star size={16} />
              Avis sur cet agent
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                avisDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-4 px-3 pb-3">
                  <NoteAgent agentId={agentId} />
                  <CommentairesAgent agentId={agentId} />
                </div>
              </div>
            </div>
          </div>

          {connecte && (
            <div className={`rounded-xl border border-dj-bordure ${profilADesChamps ? "" : "hidden"}`}>
              <button
                onClick={() => setProfilDeplie((v) => !v)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-dj-texte"
              >
                <UserCircle size={16} />
                Mon profil
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  profilDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <MonProfilAgent agentId={agentId} onEtat={setProfilADesChamps} />
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto flex justify-center">
            <BoutonInstaller />
          </div>

          <button
            onClick={partager}
            className="flex items-center justify-center gap-2 rounded-[10px] bg-dj-gradient px-4 py-2.5 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5"
          >
            <Share2 size={16} />
            {copie ? "Copié !" : "Partager"}
          </button>
        </aside>
      </div>
    </>
  );
}

export type { FilConversation };

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
// qui sont dans le sidebar, et qui apparaissent aussi"), puis fusionné
// avec le panneau le 2026-07-28 (Bourama : "le rail qui s'élargit et
// devien exactement le panneau") -- sur desktop, UN SEUL élément dont la
// largeur bascule entre 56px (icônes seules) et 288px (icônes +
// libellés + contenu des volets), pas un rail fixe + un second panneau
// séparé. Mobile inchangé depuis l'audit responsive du 27/07 : petit
// bouton flottant + panneau plein-largeur en overlay, séparés du
// rail/panneau fusionné desktop (md:hidden sur l'un, hidden md:flex sur
// l'autre).

type FilConversation = {
  conversation_id: string | null;
  titre: string;
  derniere_activite: string;
};

// Libellé texte d'une ligne du rail -- corrige le "saut" du 28/07 (voir
// note plus bas) : reste monté en permanence, seule sa max-width et son
// opacity s'animent (même durée que la largeur du conteneur parent),
// jamais un changement de forme instantané.
function LibelleRail({ ouverte, children }: { ouverte: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`overflow-hidden whitespace-nowrap text-sm transition-[max-width,opacity] duration-300 ease-out ${
        ouverte ? "max-w-[180px] opacity-100" : "max-w-0 opacity-0"
      }`}
    >
      {children}
    </span>
  );
}

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
  const railRef = useRef<HTMLDivElement>(null);

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

      {/* Rail/panneau fusionnés -- desktop uniquement (Bourama, 28/07 :
          "le rail qui s'élargit et devien exactement le panneau", au
          lieu d'un second panneau séparé qui s'ouvrait à côté). UN SEUL
          élément dont la largeur bascule entre 56px (icônes seules) et
          288px (icônes + libellés + contenu des volets) -- pas de
          panneau distinct sur desktop. Le petit bouton flottant +
          l'ancien panneau plein-largeur plus bas restent utilisés sur
          MOBILE uniquement (md:hidden dessus), comportement inchangé
          depuis l'audit responsive du 27/07. */}
      {/* CORRIGÉ le 28/07/2026 (Bourama : "quand ça apparaît, on dirait
          que quelque chose de plus grand rétrécit... surtout le bouton
          retour") : la largeur du conteneur s'animait bien, mais le
          CONTENU à l'intérieur changeait de forme instantanément au clic
          ({ouverte && "texte"} + classes justify-center/px-0 <->
          justify-start/px-4 changées d'un coup) -- l'icône sautait de
          taille (16<->18) ET de position (centrée <-> alignée à gauche),
          ET le bouton Retour changeait de forme (pastille ronde <->
          pilule). Résultat : le contenu "sautait" à sa forme finale
          pendant que le conteneur était encore en train de s'élargir
          lentement autour de lui. Corrigé en gardant l'icône dans un
          emplacement fixe (toujours 40x40, jamais recentrée) et en
          animant seulement l'apparition du libellé (max-width + opacity,
          même durée que la largeur du conteneur) -- rien ne change de
          forme ou de taille au clic, seul le texte se révèle
          progressivement. */}
      <div
        ref={railRef}
        className={`hidden flex-shrink-0 flex-col overflow-hidden border-r border-dj-bordure bg-dj-fond px-2 py-3 transition-[width] duration-300 ease-out md:flex ${
          ouverte ? "md:w-72" : "md:w-14"
        }`}
      >
        <button
          onClick={() => setOuverte((v) => !v)}
          aria-label={ouverte ? "Replier le panneau" : "Déplier le panneau"}
          className="flex w-full items-center gap-2 rounded-xl text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
            {ouverte ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
          </span>
          <LibelleRail ouverte={ouverte}>Replier</LibelleRail>
        </button>

        <div className="my-2 h-px w-full bg-dj-bordure" />

        <Link
          href={`/agent/${agentId}`}
          className="flex w-full items-center gap-2 rounded-xl bg-dj-gradient font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
            <ArrowLeft size={18} />
          </span>
          <LibelleRail ouverte={ouverte}>Retour à l&apos;agent</LibelleRail>
        </Link>

        {connecte && aDesMessages && (
          <button
            onClick={onNouvelleConversation}
            className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dj-bordure text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
              <MessageSquarePlus size={18} />
            </span>
            <LibelleRail ouverte={ouverte}>Nouvelle conversation</LibelleRail>
          </button>
        )}

        {connecte && fils && fils.length > 0 && (
          <div className="mt-2 rounded-xl border border-dj-bordure">
            <button
              onClick={() => basculerVoletRail("historique")}
              title="Historique"
              className={`flex w-full items-center gap-2 rounded-xl transition-colors ${
                historiqueDeplie ? "text-dj-accent-1" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
              }`}
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                <History size={18} />
              </span>
              <LibelleRail ouverte={ouverte}>Historique</LibelleRail>
            </button>
            {ouverte && (
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
            )}
          </div>
        )}

        <div className="mt-2 rounded-xl border border-dj-bordure">
          <button
            onClick={() => basculerVoletRail("avis")}
            title="Avis sur cet agent"
            className={`flex w-full items-center gap-2 rounded-xl transition-colors ${
              avisDeplie ? "text-dj-accent-1" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
            }`}
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
              <Star size={18} />
            </span>
            <LibelleRail ouverte={ouverte}>Avis sur cet agent</LibelleRail>
          </button>
          {ouverte && (
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
          )}
        </div>

        {connecte && profilADesChamps && (
          <div className="mt-2 rounded-xl border border-dj-bordure">
            <button
              onClick={() => basculerVoletRail("profil")}
              title="Mon profil"
              className={`flex w-full items-center gap-2 rounded-xl transition-colors ${
                profilDeplie ? "text-dj-accent-1" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
              }`}
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                <UserCircle size={18} />
              </span>
              <LibelleRail ouverte={ouverte}>Mon profil</LibelleRail>
            </button>
            {ouverte && (
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  profilDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <MonProfilAgent agentId={agentId} onEtat={setProfilADesChamps} />
                </div>
              </div>
            )}
          </div>
        )}

        {ouverte && (
          <div className="mt-auto flex justify-center pt-2">
            <BoutonInstaller />
          </div>
        )}

        <button
          onClick={partager}
          className={`flex w-full items-center gap-2 rounded-xl bg-dj-gradient font-bold text-[#1A0D02] transition-[transform,margin-top] duration-300 hover:-translate-y-0.5 ${
            ouverte ? "mt-2" : "mt-auto"
          }`}
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
            <Share2 size={18} />
          </span>
          <LibelleRail ouverte={ouverte}>{copie ? "Copié !" : "Partager"}</LibelleRail>
        </button>
      </div>

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
      {/* MOBILE UNIQUEMENT depuis le 28/07 (md:hidden ajouté) : ce
          panneau plein-largeur (overlay, avec le fond assombri
          ci-dessus) ne sert plus que sur petit écran -- desktop utilise
          désormais le rail/panneau fusionné ci-dessus à la place. */}
      <div
        className={`fixed inset-y-0 left-0 z-40 shrink-0 overflow-hidden transition-[width] duration-300 ease-out md:hidden ${
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

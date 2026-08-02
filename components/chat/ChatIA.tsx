"use client";

import { useEffect, useRef, useState } from "react";
import { appelerApiStream, uploaderImageChat, uploaderDocumentChat, uploaderVideoChat, transcrireAudioChat } from "@/lib/api";
import { useNotificationsPush, proposerNotificationsPushUneFois } from "@/lib/useNotificationsPush";
import { BulleMessage, MessageAffiche } from "./BulleMessage";
import { BarreDeSaisie, LongueurReponse, LocalisationJointe } from "./BarreDeSaisie";
import { PopupFeedback } from "./PopupFeedback";
import { StatutOutil, EtatStatut } from "./StatutOutil";
import { ConfirmationOutil } from "./ConfirmationOutil";
import { messageErreur } from "@/lib/erreurs";
import { IconeMatrix } from "@/components/icones/IconeMatrix";

// Même cas particulier que AgentCard.tsx / page.tsx (02/08, Bourama) :
// l'écran d'accueil de cet agent affichait 🎓 (stocké dans le champ
// titre_accueil en base) -- retiré du texte côté Supabase, remplacé ici
// par l'icône dessinée devant le titre.
const AGENTS_SANS_IMAGE_VITRINE = new Set(["math-matique"]);

// Page de chat qui remplace chat.py (Streamlit). Consomme la
// nouvelle route /api/chat (api/chat.py) en streaming, au lieu d'appeler
// chat() directement en process comme le faisait Streamlit.
//
// conversationId/messagesInitiaux contrôlés par le parent depuis le
// 2026-07-16 (ajout de la sidebar façon Streamlit, voir SidebarChat.tsx) :
// permet de recharger un ancien fil (Historique) ou d'en démarrer un
// nouveau en remontant simplement ce composant (key={conversationId} côté
// parent), sans changer sa logique interne d'envoi/streaming.
export function ChatIA({
  agentId,
  nomAgent,
  titreAccueil,
  sousTitreAccueil,
  conversationId,
  messagesInitiaux = [],
  onMessagesChange,
  modelesDisponibles = [],
  modeleChoisi = null,
}: {
  agentId: string;
  nomAgent: string;
  titreAccueil?: string;
  sousTitreAccueil?: string;
  conversationId: string;
  messagesInitiaux?: MessageAffiche[];
  onMessagesChange?: (nbMessages: number) => void;
  // Modeles premium (02/08/2026, voir core/fournisseurs_llm.py) : liste
  // vide = agent sans abonnement premium debloque, BarreDeSaisie
  // n'affiche alors AUCUN selecteur (comportement identique a avant
  // cette feature). `modeleChoisi` = preference par defaut du createur
  // (AgentEditable.modele_choisi cote backend), simple valeur initiale --
  // l'utilisateur peut la changer pour la session via le selecteur.
  modelesDisponibles?: { modele_id: string; label: string; distributeur: string; palier: string }[];
  modeleChoisi?: string | null;
}) {
  const [modeleSelectionne, setModeleSelectionne] = useState<string | null>(modeleChoisi);
  const [messages, setMessages] = useState<MessageAffiche[]>(messagesInitiaux);
  // Correctif mobile (2026-07-30, demande Bourama) : aucun scroll auto
  // n'existait avant -- sur desktop le "scroll anchoring" natif du
  // navigateur masquait le problème la plupart du temps, mais sur mobile
  // (redimensionnement du viewport visible à l'ouverture du clavier +
  // barre de saisie qui grandit sur plusieurs lignes) ça ne suffit plus :
  // le bas de la conversation (donc la barre de saisie et le début de la
  // réponse en cours) reste hors champ. `collePresBasRef` retient si
  // l'utilisateur était déjà proche du bas AVANT le changement -- on ne
  // force le scroll que dans ce cas, jamais s'il a remonté lire l'historique.
  const conteneurMessagesRef = useRef<HTMLDivElement>(null);
  const finDesMessagesRef = useRef<HTMLDivElement>(null);
  const collePresBasRef = useRef(true);
  const { activer: activerNotificationsPush } = useNotificationsPush();
  const [genEnCours, setGenEnCours] = useState(false);
  const [statuts, setStatuts] = useState<{ texte: string; etat: EtatStatut }[]>([]);
  // Raisonnement interne du modèle (24/07, voir RaisonnementBulle.tsx) --
  // enCours est un flag transitoire (vrai seulement pendant que LE
  // dernier message est en train de réfléchir) ; le texte lui-même est
  // stocké directement sur le message concerné (message.raisonnement,
  // voir MessageAffiche dans BulleMessage.tsx) depuis le 26/07 -- corrige
  // un bug où raisonnement/sources disparaissaient dès la question
  // suivante (ils ne vivaient qu'un state séparé rattaché au "dernier"
  // message, jamais persistés sur le message lui-même).
  const [raisonnementEnCours, setRaisonnementEnCours] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    nomLisible: string;
    agentNom?: string | null;
    arguments: Record<string, unknown>;
    etatReprise: unknown;
  } | null>(null);
  const [confirmationEnAttente, setConfirmationEnAttente] = useState(false);
  const [popupFeedback, setPopupFeedback] = useState<{
    type: "positif" | "negatif";
    messageId: number;
    questionMessageId: number | null;
  } | null>(null);

  function majMessages(fabriqueSuivant: (prec: MessageAffiche[]) => MessageAffiche[]) {
    setMessages((prec) => {
      const suivant = fabriqueSuivant(prec);
      onMessagesChange?.(suivant.length);
      return suivant;
    });
  }

  // Partagé entre l'envoi normal (envoyerMessage) et la reprise après
  // confirmation (repriseApresConfirmation) -- même flux d'événements SSE
  // dans les deux cas (voir core/main.py:chat(), docstring).
  function traiterEvenement(evenement: any) {
    if (evenement.type === "reponse") {
      // Le texte de la réponse arrive : la phase "outils" est terminée,
      // on efface les indicateurs de statut plutôt que de les laisser
      // traîner sous la réponse qui commence à s'afficher. Le raisonnement
      // (s'il y en a eu) se fige/replie ici plutôt que d'être effacé --
      // voir RaisonnementBulle.tsx.
      setStatuts([]);
      setRaisonnementEnCours(false);
      majMessages((prec) => {
        const copie = [...prec];
        const dernier = copie[copie.length - 1];
        copie[copie.length - 1] = { ...dernier, content: dernier.content + evenement.texte };
        return copie;
      });
    } else if (evenement.type === "raisonnement") {
      setRaisonnementEnCours(true);
      majMessages((prec) => {
        const copie = [...prec];
        const dernier = copie[copie.length - 1];
        copie[copie.length - 1] = { ...dernier, raisonnement: (dernier.raisonnement || "") + evenement.texte };
        return copie;
      });
    } else if (evenement.type === "meta") {
      // `evenement.modele` = modele_id brut (voir core/main.py --
      // _sauvegarder_echange renvoie desormais ce champ pour TOUTE
      // reponse, Groq/Gemini par defaut inclus). On ne resout un label
      // affichable QUE s'il correspond a un modele premium connu de CET
      // agent (modelesDisponibles) -- un id Groq/Gemini interne ne
      // matche jamais rien ici et reste donc invisible, comme demande.
      const modeleLabel = modelesDisponibles.find((m) => m.modele_id === evenement.modele)?.label ?? null;
      majMessages((prec) => {
        const copie = [...prec];
        const iAssistant = copie.length - 1;
        const iUser = copie.length - 2;
        copie[iAssistant] = {
          ...copie[iAssistant],
          id: evenement.message_id_assistant ?? copie[iAssistant].id,
          created_at: evenement.created_at_assistant ?? copie[iAssistant].created_at,
          qualiteReduite: evenement.modele_qualite_reduite === true,
          modele: modeleLabel,
        };
        if (iUser >= 0) copie[iUser] = { ...copie[iUser], id: evenement.message_id_user };
        return copie;
      });
    } else if (evenement.type === "statut") {
      setStatuts((prec) => [...prec, { texte: evenement.texte, etat: "en_cours" as EtatStatut }]);
    } else if (evenement.type === "statut_termine") {
      // Met à jour le dernier statut "en_cours" plutôt que d'en empiler un
      // nouveau -- voir StatutOutil.tsx, transition douce entre les deux
      // états (jamais un remplacement sec).
      setStatuts((prec) => {
        const copie = [...prec];
        const iDernierEnCours = [...copie].reverse().findIndex((s) => s.etat === "en_cours");
        if (iDernierEnCours === -1) {
          copie.push({ texte: evenement.texte, etat: "termine" });
        } else {
          const i = copie.length - 1 - iDernierEnCours;
          copie[i] = { texte: evenement.texte, etat: evenement.texte.includes("annulée") ? "annule" : "termine" };
        }
        return copie;
      });
    } else if (evenement.type === "sources") {
      // Rattachées à l'entrée outilsResultats CONCERNÉE, pas à un champ
      // séparé du message (26/07, retour Bourama : les sources doivent
      // apparaître juste après le résultat de LEUR outil, pas dans un
      // bloc "Sources" à part en bas -- voir OutilResultatBulle.tsx).
      // Fiable : le backend émet toujours outil_resultat puis sources
      // pour un même appel, l'un juste après l'autre (voir
      // core/main.py:_traiter_appels), donc le dernier élément de
      // outilsResultats à ce moment précis est forcément le bon.
      majMessages((prec) => {
        const copie = [...prec];
        const dernier = copie[copie.length - 1];
        const outils = dernier.outilsResultats || [];
        if (!outils.length) return prec; // sources sans outil_resultat correspondant -- ne devrait pas arriver
        const iDernierOutil = outils.length - 1;
        const existantes = outils[iDernierOutil].sources || [];
        const urlsExistantes = new Set(existantes.map((s) => s.url));
        const nouvelles = (evenement.sources || []).filter((s: { url: string }) => !urlsExistantes.has(s.url));
        if (!nouvelles.length) return prec;
        const outilsCopie = [...outils];
        outilsCopie[iDernierOutil] = { ...outilsCopie[iDernierOutil], sources: [...existantes, ...nouvelles] };
        copie[copie.length - 1] = { ...dernier, outilsResultats: outilsCopie };
        return copie;
      });
    } else if (evenement.type === "outil_resultat") {
      // Généralisation (26/07, demande Bourama) : un élément par appel
      // d'outil, PAS de dédoublonnage (contrairement à "sources") -- deux
      // appels au même outil dans le même tour (ex: deux recherches
      // distinctes) doivent chacun garder leur propre résultat affiché.
      majMessages((prec) => {
        const copie = [...prec];
        const dernier = copie[copie.length - 1];
        const existants = dernier.outilsResultats || [];
        copie[copie.length - 1] = {
          ...dernier,
          outilsResultats: [
            ...existants,
            { nomOutil: evenement.nom_outil, nomLisible: evenement.nom_lisible, resultat: evenement.resultat },
          ],
        };
        return copie;
      });
    } else if (evenement.type === "fichiers_generes") {
      // Lien(s) de fichier(s) générés, détectés côté backend de façon
      // garantie (28/07, demande Bourama) -- indépendant de ce que le
      // modèle écrit dans sa réponse texte. Un élément par appel d'outil,
      // même logique d'accumulation que outil_resultat (pas de
      // dédoublonnage : deux générations distinctes dans le même tour
      // gardent chacune leur entrée).
      majMessages((prec) => {
        const copie = [...prec];
        const dernier = copie[copie.length - 1];
        const existants = dernier.fichiersGeneres || [];
        copie[copie.length - 1] = {
          ...dernier,
          fichiersGeneres: [
            ...existants,
            { nomOutil: evenement.nom_outil, fichiers: evenement.fichiers || [] },
          ],
        };
        return copie;
      });
    } else if (evenement.type === "confirmation_requise") {
      setConfirmation({
        nomLisible: evenement.nom_lisible,
        agentNom: evenement.agent_nom,
        arguments: evenement.arguments || {},
        etatReprise: evenement.etat_reprise,
      });
    } else if (evenement.type === "outils_suggeres") {
      // Routeur d'outils (28/07) : le backend n'a PAS généré de réponse
      // ce tour-ci (voir core/main.py) -- le message assistant reste
      // vide, seuls les boutons s'affichent (voir BulleMessage.tsx).
      setStatuts([]);
      setRaisonnementEnCours(false);
      majMessages((prec) => {
        const copie = [...prec];
        copie[copie.length - 1] = { ...copie[copie.length - 1], outilsSuggeres: evenement.outils };
        return copie;
      });
    }
  }

  async function envoyerMessage(
    texte: string,
    longueur: LongueurReponse,
    fichier: File | null,
    localisation: LocalisationJointe = null,
    texteColle: string | null = null,
    rechercheForcee: boolean = false,
    outilsForces: string[] = [],
    ignorerRouteurOutils: boolean = false
  ) {
    // Demande de Bourama (2026-07-22) : proposer l'activation des
    // notifications push dès la première vraie action (envoyer un
    // message = utiliser l'IA), pas au chargement de la page -- voir
    // proposerNotificationsPushUneFois pour le garde-fou "une seule
    // fois par appareil, jamais si déjà répondu avant".
    proposerNotificationsPushUneFois(activerNotificationsPush);

    const typePieceJointe: "image" | "document" | "video" | "audio" | null = fichier
      ? fichier.type.startsWith("image/")
        ? "image"
        : fichier.type.startsWith("video/")
        ? "video"
        : fichier.type.startsWith("audio/")
        ? "audio"
        : "document"
      : null;
    const messageUtilisateur: MessageAffiche = {
      id: null,
      role: "user",
      content: texte,
      created_at: new Date().toISOString(),
      pieceJointe:
        fichier && typePieceJointe
          ? {
              nom: fichier.name,
              type: typePieceJointe,
              previewUrl: URL.createObjectURL(fichier),
            }
          : null,
    };
    const historiquePourApi = messages.map((m) => ({ role: m.role, content: m.content }));

    majMessages((prec) => [...prec, messageUtilisateur, { id: null, role: "assistant", content: "" }]);
    setGenEnCours(true);
    setStatuts([]);
    setRaisonnementEnCours(false);
    setConfirmation(null);

    // Upload/traitement du fichier AVANT le message texte :
    // - image -> /api/chat a besoin de l'URL finale dans image_url (voir
    //   api/chat.py + core/main.py:chat(), branche image_url -- routage
    //   direct vers Gemini, seul modèle multimodal de la cascade).
    // - PDF/Word/Excel -> texte extrait côté backend (voir
    //   api/uploads.py:uploader_document_chat) et injecté APRÈS le texte
    //   de l'étudiant, jamais à la place -- le cascade Groq habituel le
    //   traite comme du texte normal, aucun changement de modèle requis.
    // - vidéo (2026-07-20) -> traitement combiné : la piste audio est
    //   transcrite (Whisper) et injectée comme texte (comme un document),
    //   les frames image sont envoyées à Gemini (comme des images) --
    //   voir api/uploads.py:uploader_video_chat et core/main.py:chat(),
    //   paramètre images_base64.
    let imageUrl: string | null = null;
    let imagesBase64: string[] | null = null;
    let texteEnrichi = texteColle ? `${texte}\n\n[Texte collé joint]\n${texteColle}` : texte;
    const typeFichier = typePieceJointe;
    if (fichier) {
      try {
        if (typeFichier === "image") {
          imageUrl = await uploaderImageChat(fichier);
          // Le lien réel doit aussi être en TEXTE dans le message, pas
          // seulement envoyé à part pour l'analyse visuelle (image_url) --
          // sinon l'IA "voit" l'image via la vision mais n'a jamais son
          // adresse réelle en mémoire, et invente un lien si on la lui
          // redemande plus tard (repéré en test réel, 2026-07-23).
          texteEnrichi = `${texte}\n\n[Image jointe : ${imageUrl}]`;
        } else if (typeFichier === "audio") {
          const { texte: texteAudio, url: urlAudio } = await transcrireAudioChat(fichier);
          const lienAudio = urlAudio ? `\n[Lien réel du fichier : ${urlAudio}]` : "";
          texteEnrichi = `${texte}\n\n[Audio joint : ${fichier.name} -- transcription]\n${texteAudio}${lienAudio}`;
        } else if (typeFichier === "video") {
          const { transcript, frames_base64, url: urlVideo } = await uploaderVideoChat(fichier);
          imagesBase64 = frames_base64.length ? frames_base64 : null;
          const lienVideo = urlVideo ? `\n[Lien réel du fichier : ${urlVideo}]` : "";
          texteEnrichi = transcript
            ? `${texte}\n\n[Vidéo jointe : ${fichier.name} -- transcription audio]\n${transcript}${lienVideo}`
            : `${texte}\n\n[Vidéo jointe : ${fichier.name} -- pas de son exploitable, images seules]${lienVideo}`;
        } else {
          const { texte: texteDocument, tronque, url: urlDocument, url_apercu: urlApercu } = await uploaderDocumentChat(fichier);
          const lienDocument = urlDocument ? `\n[Lien réel du fichier : ${urlDocument}]` : "";
          // Aperçu PDF (25/07) : lien séparé, volontairement en .pdf --
          // FichierChip.tsx détecte l'extension et affiche automatiquement
          // le visualiseur PDF intégré pour ce lien, sans aucun changement
          // nécessaire dans FichierChip.tsx lui-même (voir core/conversion_pdf.py).
          const lienApercu = urlApercu ? `\n[Aperçu visuel du fichier (PDF) : ${urlApercu}]` : "";
          texteEnrichi =
            `${texte}\n\n[Document joint : ${fichier.name}${tronque ? " (tronqué)" : ""}]\n${texteDocument}${lienDocument}${lienApercu}`;
        }
      } catch (e) {
        // Même correction que pour la dictée vocale (2026-07-20) : le
        // message générique masquait la vraie cause (format refusé,
        // fichier trop lourd, erreur serveur précise...) derrière un seul
        // texte, impossible à diagnostiquer depuis le retour utilisateur.
        const detail = messageErreur(e);
        const prefixe =
          typeFichier === "image"
            ? "Je n'ai pas pu envoyer l'image jointe"
            : typeFichier === "video"
            ? "Je n'ai pas pu traiter la vidéo jointe"
            : "Je n'ai pas pu lire le document joint";
        majMessages((prec) => {
          const copie = [...prec];
          copie[copie.length - 1] = {
            ...copie[copie.length - 1],
            content: detail ? `${prefixe} : ${detail}` : `${prefixe}, réessaie.`,
          };
          return copie;
        });
        setGenEnCours(false);
        return;
      }
    }

    try {
      await appelerApiStream(
        "/api/chat",
        {
          message: texteEnrichi,
          agent_id: agentId,
          historique: historiquePourApi,
          conversation_id: conversationId,
          longueur_reponse: longueur,
          image_url: imageUrl,
          images_base64: imagesBase64,
          localisation,
          // Fuseau du navigateur, pas une valeur figée côté code -- voir
          // core/main.py:chat(), paramètre fuseau_horaire.
          fuseau_horaire: Intl.DateTimeFormat().resolvedOptions().timeZone,
          // Bouton Outils (2026-07-25, TEST agent nucleos) -- voir
          // BarreDeSaisie.tsx:OUTILS_DISPONIBLES et
          // core/mcp_tools.py:lister_tous_les_outils côté backend.
          outil_force: outilsForces,
          // Bouton "Aucun" (31/07, demande Bourama) -- voir
          // ignorerSuggestionOutils ci-dessous.
          ignorer_suggestion_outils: ignorerRouteurOutils,
          // Selecteur de modele premium (02/08/2026) -- null tant que
          // l'agent n'a rien debloque ou que l'utilisateur n'a pas
          // change le defaut, voir modeleSelectionne plus haut. Revalide
          // cote backend avant d'etre honore (api/chat.py:_resoudre_modele_force).
          modele: modeleSelectionne,
        },
        (evenement) => traiterEvenement(evenement)
      );
    } catch (e) {
      majMessages((prec) => {
        const copie = [...prec];
        copie[copie.length - 1] = {
          ...copie[copie.length - 1],
          content: "Une erreur est survenue, réessaie dans un instant.",
        };
        return copie;
      });
    } finally {
      setGenEnCours(false);
    }
  }

  function regenererDepuis(index: number) {
    // index = position du message ASSISTANT à régénérer ; on renvoie le
    // message utilisateur juste avant, et on retire les deux de la liste
    // affichée avant de les recréer via envoyerMessage.
    const messageUtilisateur = messages[index - 1];
    if (!messageUtilisateur) return;
    majMessages((prec) => prec.slice(0, index - 1));
    envoyerMessage(messageUtilisateur.content, "moyenne", null);
  }

  function relancerAvecOutils(index: number, nomsOutils: string[]) {
    // Validation d'une sélection (un ou plusieurs) parmi les boutons
    // suggérés par le routeur d'outils (28/07, multi-sélection demandée
    // par Bourama) -- même mécanique que regenererDepuis (on retire la
    // paire et on renvoie la question d'origine), sauf qu'on force ces
    // outils précis au lieu de laisser le routeur redécider -- exactement
    // comme une sélection manuelle via le menu Outils (BarreDeSaisie.tsx).
    if (!nomsOutils.length) return;
    const messageUtilisateur = messages[index - 1];
    if (!messageUtilisateur) return;
    majMessages((prec) => prec.slice(0, index - 1));
    envoyerMessage(messageUtilisateur.content, "moyenne", null, null, null, false, nomsOutils);
  }

  function ignorerSuggestionOutils(index: number) {
    // Bouton "Aucun" (31/07, demande Bourama : le routeur se trompe
    // souvent -- suggère un outil sans rapport avec la question, et
    // l'utilisateur se retrouvait bloqué devant des boutons à choisir
    // pour rien). Même mécanique que relancerAvecOutils (retire la paire,
    // renvoie la question d'origine), mais avec ignorerRouteurOutils=true
    // pour que le backend réponde normalement SANS repasser par le
    // routeur (sinon la même suggestion inutile pourrait réapparaître).
    const messageUtilisateur = messages[index - 1];
    if (!messageUtilisateur) return;
    majMessages((prec) => prec.slice(0, index - 1));
    envoyerMessage(messageUtilisateur.content, "moyenne", null, null, null, false, [], true);
  }

  function editerMessage(index: number, nouveauTexte: string) {
    // Tronque tout ce qui suit (y compris la réponse assistant concernée)
    // et relance avec le message modifié -- section 3.1.
    majMessages((prec) => prec.slice(0, index));
    envoyerMessage(nouveauTexte, "moyenne", null);
  }

  function expliquerSelection(texteSelectionne: string) {
    // Signal non textuel (sélection de souris/tactile dans une réponse
    // assistant) converti en message texte classique -- pas de nouveau
    // champ backend, juste un prompt construit côté frontend.
    envoyerMessage(`Peux-tu expliquer ce passage : "${texteSelectionne}"`, "moyenne", null);
  }

  async function repriseApresConfirmation(approuve: boolean) {
    if (!confirmation) return;
    setConfirmationEnAttente(true);
    setGenEnCours(true);
    try {
      await appelerApiStream(
        "/api/chat",
        { reprise: { etat_reprise: confirmation.etatReprise, approuve } },
        (evenement) => traiterEvenement(evenement)
      );
    } catch (e) {
      majMessages((prec) => {
        const copie = [...prec];
        copie[copie.length - 1] = {
          ...copie[copie.length - 1],
          content: "Une erreur est survenue, réessaie dans un instant.",
        };
        return copie;
      });
    } finally {
      setConfirmation(null);
      setConfirmationEnAttente(false);
      setGenEnCours(false);
    }
  }

  // Marge de tolérance : "proche du bas" plutôt qu'exactement au pixel
  // près, pour rester collé même avec une légère imprécision de mesure
  // (fréquent sur mobile pendant l'animation d'ouverture du clavier).
  function estPresDuBas() {
    const el = conteneurMessagesRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  useEffect(() => {
    if (collePresBasRef.current) {
      finDesMessagesRef.current?.scrollIntoView({ block: "end" });
    }
    // Se redéclenche à chaque octet reçu en streaming (content grandit),
    // pas seulement à l'ajout d'un message -- sinon le scroll se fige dès
    // la première ligne d'une réponse longue.
  }, [messages, statuts, raisonnementEnCours]);

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      <div
        ref={conteneurMessagesRef}
        onScroll={() => {
          collePresBasRef.current = estPresDuBas();
        }}
        className="flex-1 space-y-5 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          titreAccueil ? (
            <div className="mb-4 mt-6">
              <div className="flex items-center gap-2">
                {AGENTS_SANS_IMAGE_VITRINE.has(agentId) && (
                  <IconeMatrix className="h-6 w-6 shrink-0 text-dj-accent-1" />
                )}
                <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-dj-texte">{titreAccueil}</h1>
              </div>
              {sousTitreAccueil && <p className="mt-1 text-sm text-dj-texte-muet">{sousTitreAccueil}</p>}
            </div>
          ) : (
            <p className="mt-10 text-center text-sm text-dj-texte-muet">Pose ta question à {nomAgent}...</p>
          )
        )}
        {messages.map((message, index) => {
          const estDernier = index === messages.length - 1;
          return (
            <BulleMessage
              key={index}
              message={message}
              nomAgent={nomAgent}
              // Rattachés à CE message précis plutôt qu'en bloc séparé plus
              // bas dans la liste (retour Bourama 24/07 : trop loin du
              // message, le raisonnement semblait "disparaître" une fois
              // replié en bas). enAttente : rien reçu encore (ni statut, ni
              // raisonnement, ni texte) -- disparaît dès le premier des
              // trois.
              enAttente={
                estDernier &&
                genEnCours &&
                message.role === "assistant" &&
                message.content === "" &&
                statuts.length === 0 &&
                !message.raisonnement
              }
              raisonnement={message.raisonnement}
              raisonnementEnCours={estDernier ? raisonnementEnCours : false}
              outilsResultats={message.outilsResultats}
              outilsSuggeres={message.outilsSuggeres}
              fichiersGeneres={message.fichiersGeneres}
              onOutilsChoisis={(noms) => relancerAvecOutils(index, noms)}
              onIgnorerSuggestion={() => ignorerSuggestionOutils(index)}
              onRegenerer={
                message.role === "assistant"
                  ? () => regenererDepuis(index)
                  : () => envoyerMessage(message.content, "moyenne", null)
              }
              onEditer={message.role === "user" ? (texte) => editerMessage(index, texte) : undefined}
              onLike={
                message.role === "assistant"
                  ? () =>
                      message.id
                        ? setPopupFeedback({ type: "positif", messageId: message.id!, questionMessageId: messages[index - 1]?.id ?? null })
                        : alert("Connecte-toi pour noter cette IA.")
                  : undefined
              }
              onDislike={
                message.role === "assistant"
                  ? () =>
                      message.id
                        ? setPopupFeedback({ type: "negatif", messageId: message.id!, questionMessageId: messages[index - 1]?.id ?? null })
                        : alert("Connecte-toi pour noter cette IA.")
                  : undefined
              }
              onExpliquerSelection={message.role === "assistant" ? expliquerSelection : undefined}
            />
          );
        })}

        {statuts.length > 0 && (
          <div className="max-w-[80%]">
            {statuts.map((s, i) => (
              <StatutOutil key={i} texte={s.texte} etat={s.etat} />
            ))}
          </div>
        )}

        {confirmation && (
          <ConfirmationOutil
            nomLisible={confirmation.nomLisible}
            agentNom={confirmation.agentNom}
            arguments={confirmation.arguments}
            enAttente={confirmationEnAttente}
            onConfirmer={() => repriseApresConfirmation(true)}
            onAnnuler={() => repriseApresConfirmation(false)}
          />
        )}
        <div ref={finDesMessagesRef} />
      </div>

      {/* pb-[env(safe-area-inset-bottom)] (2026-07-30) : marge pour la
          barre d'accueil iOS (encoche du bas) en plus du pb-6 existant --
          s'additionne, ne le remplace pas (viewport-fit=cover posé dans
          app/layout.tsx rend cette variable non nulle sur iPhone). */}
      <div className="px-4 [padding-bottom:calc(env(safe-area-inset-bottom)+1.5rem)]">
        <BarreDeSaisie
          onEnvoyer={envoyerMessage}
          desactive={genEnCours}
          agentId={agentId}
          modelesDisponibles={modelesDisponibles}
          modeleSelectionne={modeleSelectionne}
          onModeleChange={setModeleSelectionne}
        />
      </div>

      {popupFeedback && (
        <PopupFeedback
          type={popupFeedback.type}
          conversationId={conversationId}
          messageId={popupFeedback.messageId}
          questionMessageId={popupFeedback.questionMessageId}
          agentId={agentId}
          onFerme={() => setPopupFeedback(null)}
          onEnvoye={() => setPopupFeedback(null)}
        />
      )}
    </div>
  );
}

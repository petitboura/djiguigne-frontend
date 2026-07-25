"use client";

import { useState } from "react";
import { appelerApiStream, uploaderImageChat, uploaderDocumentChat, uploaderVideoChat, transcrireAudioChat } from "@/lib/api";
import { useNotificationsPush, proposerNotificationsPushUneFois } from "@/lib/useNotificationsPush";
import { BulleMessage, MessageAffiche } from "./BulleMessage";
import { BarreDeSaisie, LongueurReponse, LocalisationJointe } from "./BarreDeSaisie";
import { PopupFeedback } from "./PopupFeedback";
import { StatutOutil, EtatStatut } from "./StatutOutil";
import { ConfirmationOutil } from "./ConfirmationOutil";

// Page de chat qui remplace chat.py (Streamlit) -- voir
// MIGRATION_CHAT_VERS_NEXTJS.md, section 0 et phase 2. Consomme la
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
}: {
  agentId: string;
  nomAgent: string;
  titreAccueil?: string;
  sousTitreAccueil?: string;
  conversationId: string;
  messagesInitiaux?: MessageAffiche[];
  onMessagesChange?: (nbMessages: number) => void;
}) {
  const [messages, setMessages] = useState<MessageAffiche[]>(messagesInitiaux);
  const { activer: activerNotificationsPush } = useNotificationsPush();
  const [genEnCours, setGenEnCours] = useState(false);
  const [statuts, setStatuts] = useState<{ texte: string; etat: EtatStatut }[]>([]);
  // Raisonnement interne du modèle (24/07, voir RaisonnementBulle.tsx) --
  // accumulé au fil des événements {"type": "raisonnement"}, puis figé
  // (raisonnementEnCours=false) dès que la réponse elle-même commence.
  const [raisonnement, setRaisonnement] = useState("");
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
      setRaisonnement((prec) => prec + evenement.texte);
    } else if (evenement.type === "meta") {
      majMessages((prec) => {
        const copie = [...prec];
        const iAssistant = copie.length - 1;
        const iUser = copie.length - 2;
        copie[iAssistant] = {
          ...copie[iAssistant],
          id: evenement.message_id_assistant,
          created_at: evenement.created_at_assistant,
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
    } else if (evenement.type === "confirmation_requise") {
      setConfirmation({
        nomLisible: evenement.nom_lisible,
        agentNom: evenement.agent_nom,
        arguments: evenement.arguments || {},
        etatReprise: evenement.etat_reprise,
      });
    }
  }

  async function envoyerMessage(
    texte: string,
    longueur: LongueurReponse,
    fichier: File | null,
    localisation: LocalisationJointe = null,
    texteColle: string | null = null
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
    setRaisonnement("");
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
          const { texte: texteDocument, tronque, url: urlDocument } = await uploaderDocumentChat(fichier);
          const lienDocument = urlDocument ? `\n[Lien réel du fichier : ${urlDocument}]` : "";
          texteEnrichi =
            `${texte}\n\n[Document joint : ${fichier.name}${tronque ? " (tronqué)" : ""}]\n${texteDocument}${lienDocument}`;
        }
      } catch (e) {
        // Même correction que pour la dictée vocale (2026-07-20) : le
        // message générique masquait la vraie cause (format refusé,
        // fichier trop lourd, erreur serveur précise...) derrière un seul
        // texte, impossible à diagnostiquer depuis le retour utilisateur.
        const detail = e instanceof Error ? e.message : null;
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

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          titreAccueil ? (
            <div className="mb-4 mt-6">
              <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-dj-texte">{titreAccueil}</h1>
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
                !raisonnement
              }
              raisonnement={estDernier ? raisonnement : undefined}
              raisonnementEnCours={estDernier ? raisonnementEnCours : undefined}
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
      </div>

      <div className="px-4 pb-6">
        <BarreDeSaisie onEnvoyer={envoyerMessage} desactive={genEnCours} agentId={agentId} />
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

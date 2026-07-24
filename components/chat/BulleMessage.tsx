"use client";

import { useEffect, useRef, useState, isValidElement, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import { Copy, RotateCw, Pencil, Volume2, ThumbsUp, ThumbsDown, Check, MessageSquareQuote, FileText, X } from "lucide-react";
import { formaterHeure } from "@/lib/formatageHeure";
import { BlocCode } from "./BlocCode";
import { Mermaid } from "./Mermaid";
import { GraphiqueDonnees } from "./GraphiqueDonnees";
import { CarteMessage } from "./CarteMessage";
import { WidgetSandbox } from "./WidgetSandbox";
import { ImageMessage } from "./ImageMessage";
import { TableauMessage } from "./TableauMessage";
import { FichierChip, extensionFichier } from "./FichierChip";
import { FichierCode, extensionCode } from "./FichierCode";
import { LecteurMedia, typeMedia } from "./LecteurMedia";
import { LinkPreview } from "./LinkPreview";

// Extrait le texte brut d'un enfant React -- nécessaire pour récupérer le
// contenu source d'un bloc de code (```lang ... ```) tel que ReactMarkdown
// le structure : <pre><code className="language-xxx">texte brut</code></pre>.
function texteBrut(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(texteBrut).join("");
  if (isValidElement(node)) return texteBrut((node.props as { children?: ReactNode }).children);
  return "";
}

// Nettoie le markdown avant lecture à voix haute (Web Speech API, voir
// lireAVoixHaute() dans le composant) -- sans ça, la synthèse vocale lit
// les symboles bruts tels quels (dièses, astérisques, syntaxe de lien),
// ce qui donne une lecture pénible à l'oreille. Volontairement simple
// (regex, pas un vrai parseur) : le but est une lecture agréable, pas
// une reconstruction fidèle -- les blocs de code sont carrément sautés
// (lire du code à voix haute n'a pas de sens).
function nettoyerMarkdownPourLecture(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, " ") // blocs de code entiers
    .replace(/`([^`]+)`/g, "$1") // code inline -> juste le texte
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // liens -> juste le libellé
    .replace(/^#{1,6}\s+/gm, "") // titres
    .replace(/\*\*([^*]+)\*\*/g, "$1") // gras
    .replace(/\*([^*]+)\*/g, "$1") // italique
    .replace(/^[-*+]\s+/gm, "") // puces de liste
    .replace(/^\d+\.\s+/gm, "") // listes numérotées
    .trim();
}

// Le modèle mélange parfois du HTML brut dans son Markdown (le plus
// courant : "<br>" pour forcer un retour à la ligne dans une liste ou une
// cellule de tableau -- signalé par Bourama, ça s'affichait juste comme
// du texte littéral "<br>-"). Sans plugin dédié, remark/react-markdown
// n'interprète JAMAIS le HTML brut du Markdown source : il l'échappe et
// l'affiche tel quel, par sécurité. rehype-raw le fait redevenir de
// vraies balises ; rehype-sanitize passe juste derrière pour retirer tout
// ce qui serait dangereux (<script>, attributs on*...) si jamais le
// modèle en générait -- le schéma par défaut (celui de GitHub) autorise
// déjà <br>, les tableaux, listes, etc.

// Le modèle (GPT-OSS/Groq) écrit ses formules avec les délimiteurs
// \( \) et \[ \] (convention OpenAI-like). Mais en Markdown (CommonMark,
// ce que suit remark), un backslash suivi de ponctuation ( \( \) \[ \] )
// est traité comme un caractère ÉCHAPPÉ : le backslash est supprimé AVANT
// même que remark-math ne voie le texte, ce qui laisse des crochets/
// parenthèses nus et casse tout rendu LaTeX (même bug que dans l'ancien
// chat.py Streamlit, voir _normaliser_latex -- même cause, même remède,
// juste porté ici côté JS). On convertit donc systématiquement vers les
// délimiteurs $ $ / $$ $$, que remark-math sait consommer directement et
// que CommonMark ne touche pas (le $ n'a pas de sens spécial pour lui).
function normaliserLatex(texte: string): string {
  return texte
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, formule) => `$$${formule}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, formule) => `$${formule}$`);
}

export interface MessageAffiche {
  id: number | null; // id historique_conversations (null tant que non persisté, ex: pendant le streaming)
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  // Ajouté 2026-07-20 (bug trouvé par Bourama : aucun aperçu du fichier
  // envoyé, ni avant ni après envoi) -- previewUrl est une URL locale
  // (URL.createObjectURL, voir BarreDeSaisie.tsx) pour une image, donc
  // valable seulement le temps de la session ; pas besoin de la faire
  // survivre à un rechargement de page, juste de montrer ce qui a été
  // envoyé dans le fil de la conversation en cours.
  pieceJointe?: { nom: string; type: "image" | "document" | "video" | "audio"; previewUrl?: string } | null;
}

// Ajouté le 2026-07-23 (bug repéré par Bourama : en rechargeant un fil de
// conversation depuis l'historique, la bulle utilisateur affichait le
// texte "enrichi" tel quel -- transcription audio/vidéo complète, texte
// extrait d'un document, bloc [Lien réel du fichier : ...] -- au lieu du
// message réellement tapé. Cause : ChatIA.tsx construit ce texte enrichi
// côté client puis l'envoie à /api/chat comme SEUL "message" ; le backend
// le sauvegarde tel quel (pas de champ séparé pour le texte "propre" vs
// le contexte destiné au modèle). Pendant la session en cours, la bulle
// affichée utilise encore `texte` (la variable propre, jamais écrasée) --
// le problème n'apparaît qu'au rechargement, une fois qu'il ne reste plus
// que le contenu persisté en base à afficher.
//
// Corrige l'AFFICHAGE seul (aucun changement backend) : détecte les 4
// marqueurs injectés par ChatIA.tsx et reconstruit un texte propre + un
// pieceJointe (avec l'URL réelle du fichier, toujours valable après
// rechargement contrairement à previewUrl qui était une URL locale
// éphémère).
const MARQUEURS_PIECE_JOINTE: { motif: RegExp; type: "image" | "document" | "video" | "audio" }[] = [
  { motif: /\n\n\[Image jointe : /, type: "image" },
  { motif: /\n\n\[Audio joint : /, type: "audio" },
  { motif: /\n\n\[Vidéo jointe : /, type: "video" },
  { motif: /\n\n\[Document joint : /, type: "document" },
];

export function nettoyerMessageHistorique(content: string): {
  texte: string;
  pieceJointe: MessageAffiche["pieceJointe"];
} {
  // Texte collé (2026-07-23) : pas un "fichier" comme les 4 marqueurs
  // ci-dessous (pas d'URL, pas de pieceJointe type -- juste un pavé de
  // texte à ne pas réafficher en entier au rechargement, même bug que
  // celui corrigé plus haut pour audio/vidéo/image/document). Repli
  // simple : on le retire du texte affiché, sans reconstruire de puce.
  const collageMotif = /\n\n\[Texte collé joint\]\n[\s\S]*$/;
  content = content.replace(collageMotif, "");

  for (const { motif, type } of MARQUEURS_PIECE_JOINTE) {
    const correspondance = motif.exec(content);
    if (!correspondance) continue;

    const texte = content.slice(0, correspondance.index);
    const bloc = content.slice(correspondance.index);

    // Nom du fichier : entre "jointe/joint : " et le premier "]" ou " -- ".
    // Cas particulier image : le marqueur ne contient que l'URL, pas de nom
    // -- on prend le dernier segment du chemin en repli.
    const nomMatch = /(?:Audio joint|Vidéo jointe|Document joint) : ([^\]\n]+?)(?:\]| -- )/.exec(bloc);
    let nom = nomMatch ? nomMatch[1].trim() : "fichier";
    if (type === "image") {
      const urlImage = /\[Image jointe : (.+?)\]/.exec(bloc)?.[1] ?? "";
      nom = urlImage.split("/").pop()?.split("?")[0] || "image";
    }
    // Retire un éventuel " (tronqué)" laissé par le marqueur document.
    nom = nom.replace(/\s*\(tronqué\)$/, "");

    // URL réelle du fichier : toujours en toute fin de bloc si présente
    // (image : c'est directement le contenu entre crochets ; les 3
    // autres : "[Lien réel du fichier : URL]" en dernière ligne).
    const urlMatch =
      type === "image"
        ? /\[Image jointe : (.+?)\]/.exec(bloc)
        : /\[Lien réel du fichier : (.+?)\]/.exec(bloc);
    const url = urlMatch ? urlMatch[1].trim() : undefined;

    return {
      texte,
      pieceJointe: { nom, type, previewUrl: url },
    };
  }
  return { texte: content, pieceJointe: null };
}

// Voir MIGRATION_CHAT_VERS_NEXTJS.md, section 3.1 :
// - heure affichée sous le message UTILISATEUR uniquement
// - boutons différents selon le rôle
export function BulleMessage({
  message,
  onRegenerer,
  onEditer,
  onLike,
  onDislike,
  onExpliquerSelection,
}: {
  message: MessageAffiche;
  onRegenerer?: () => void;
  onEditer?: (nouveauTexte: string) => void;
  onLike?: () => void;
  onDislike?: () => void;
  onExpliquerSelection?: (texteSelectionne: string) => void;
}) {
  const [copie, setCopie] = useState(false);
  const [pieceJointeOuverte, setPieceJointeOuverte] = useState(false);
  const [enEdition, setEnEdition] = useState(false);
  const [texteEdition, setTexteEdition] = useState(message.content);
  const [enLecture, setEnLecture] = useState(false);
  const estUtilisateur = message.role === "user";

  // Sélection de texte -> "expliquer ce passage" (2026-07-20). Signal
  // utilisateur non textuel : on capte la sélection native du navigateur
  // dans la bulle assistant, pas un nouveau composant de sélection custom.
  const conteneurRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ texte: string; x: number; y: number } | null>(null);

  function gererFinSelection() {
    if (!onExpliquerSelection || estUtilisateur) return;
    const sel = window.getSelection();
    const texte = sel?.toString().trim();
    if (!sel || !texte || sel.rangeCount === 0 || !conteneurRef.current?.contains(sel.anchorNode)) {
      setSelection(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setSelection({ texte, x: rect.left + rect.width / 2, y: rect.top });
  }

  function copier() {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    });
  }

  // Lecture à voix haute (2026-07-23, bouton jusqu'ici un placeholder) --
  // Web Speech API native du navigateur, pas de clé/coût/backend. Toggle :
  // cliquer pendant la lecture l'arrête (speechSynthesis.cancel()) plutôt
  // que de relancer une deuxième lecture par-dessus.
  function lireAVoixHaute() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("La lecture à voix haute n'est pas prise en charge par ce navigateur.");
      return;
    }
    if (enLecture) {
      window.speechSynthesis.cancel();
      setEnLecture(false);
      return;
    }
    // Un seul message lu à la fois sur toute la page -- annule toute
    // lecture en cours (y compris d'un autre message) avant de démarrer.
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(nettoyerMarkdownPourLecture(message.content));
    utterance.lang = "fr-FR";
    utterance.onend = () => setEnLecture(false);
    utterance.onerror = () => setEnLecture(false);
    setEnLecture(true);
    window.speechSynthesis.speak(utterance);
  }

  // Coupe la lecture si la bulle disparaît pendant qu'elle parle (ex:
  // régénération de la réponse, changement de conversation).
  useEffect(() => {
    return () => {
      if (enLecture && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (enEdition) {
    return (
      <div className="ml-auto max-w-[80%] rounded-2xl bg-dj-surface-haute p-3">
        <textarea
          value={texteEdition}
          onChange={(e) => setTexteEdition(e.target.value)}
          className="w-full resize-none rounded-lg bg-transparent text-sm text-dj-texte outline-none"
          rows={3}
          autoFocus
        />
        <div className="mt-2 flex justify-end gap-2 text-xs">
          <button
            onClick={() => setEnEdition(false)}
            className="rounded-md px-3 py-1.5 text-dj-texte-muet hover:text-dj-texte"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              setEnEdition(false);
              onEditer?.(texteEdition);
            }}
            className="rounded-md bg-dj-gradient px-3 py-1.5 font-semibold text-[#1A0D02]"
          >
            Renvoyer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex flex-col ${estUtilisateur ? "items-end" : "items-start"}`}>
      <div
        className={
          estUtilisateur
            ? "max-w-[80%] rounded-2xl bg-dj-surface-haute px-4 py-2.5 text-[15px] text-dj-texte"
            : "max-w-[80%] px-1 py-1 text-[15px] leading-relaxed text-dj-texte"
        }
      >
        {message.pieceJointe && (
          <div className="mb-2">
            {message.pieceJointe.type === "image" && message.pieceJointe.previewUrl ? (
              <button
                onClick={() => setPieceJointeOuverte(true)}
                aria-label="Agrandir l'image"
                className="block max-h-48 overflow-hidden rounded-xl border border-dj-bordure"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (URL.createObjectURL), pas un asset à optimiser */}
                <img src={message.pieceJointe.previewUrl} alt={message.pieceJointe.nom} className="max-h-48 w-auto" />
              </button>
            ) : (message.pieceJointe.type === "video" || message.pieceJointe.type === "audio") && message.pieceJointe.previewUrl ? (
              // Lecteur jouable directement dans le message envoyé
              // (2026-07-23) -- avant, seul un nom de fichier cliquable qui
              // ouvrait un nouvel onglet, aucun moyen d'écouter/regarder
              // sans quitter le chat.
              <div className="w-full max-w-xs">
                <LecteurMedia href={message.pieceJointe.previewUrl} type={message.pieceJointe.type} />
              </div>
            ) : (
              <button
                onClick={() => message.pieceJointe?.previewUrl && window.open(message.pieceJointe.previewUrl, "_blank")}
                aria-label="Ouvrir le fichier"
                className="flex w-fit items-center gap-2 rounded-xl border border-dj-bordure bg-dj-fond/40 px-3 py-2 text-xs text-dj-texte-muet hover:text-dj-texte"
              >
                <FileText size={14} />
                <span className="max-w-[220px] truncate">{message.pieceJointe.nom}</span>
              </button>
            )}
          </div>
        )}
        {/* Rendu Markdown unique et cohérent (gras/liens/tableaux/listes en
            une seule fois) -- voir MIGRATION_CHAT_VERS_NEXTJS.md 1.1 : ceci
            règle définitivement le bug hérité de Streamlit (bloc HTML brut
            qui empêchait toute transformation Markdown). Couleur des liens
            fixée sur l'accent de la charte, jamais bleu (voir 1.2). */}
        <div
          ref={conteneurRef}
          onMouseUp={gererFinSelection}
          className="dj-markdown [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 last:[&_p]:mb-0 [&_h1]:font-display [&_h1]:font-bold [&_h1]:tracking-[-0.01em] [&_h1]:text-dj-texte [&_h1]:text-xl [&_h1]:mb-2 [&_h1]:mt-3 [&_h2]:font-display [&_h2]:font-bold [&_h2]:tracking-[-0.01em] [&_h2]:text-dj-texte [&_h2]:text-lg [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:font-display [&_h3]:font-bold [&_h3]:tracking-[-0.01em] [&_h3]:text-dj-texte [&_h3]:text-base [&_h3]:mb-1.5 [&_h3]:mt-2"
        >
          {/* remarkGfm (tableaux/gras/liens) + remarkMath/rehypeKatex
              (LaTeX) tournent dans LA MÊME passe de parsing -- c'est ça
              qui évite le jeu de whack-a-mole où corriger le gras/les
              tableaux à la main cassait le LaTeX (ou l'inverse) : un seul
              moteur, cohérent, jamais de manipulation du texte brut à
              part la normalisation des délimiteurs ci-dessus. */}
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, defaultSchema], rehypeKatex]}
            components={{
              // Bloc de code (```lang ... ```) : ReactMarkdown structure ça
              // en <pre><code className="language-xxx">...</code></pre> --
              // on intercepte au niveau `pre` pour router selon le langage
              // déclaré AVANT toute coloration syntaxique, pendant qu'on a
              // encore le texte source intact (nécessaire pour Mermaid/
              // Chart/Carte/Widget, qui ont besoin du texte brut, pas
              // d'un HTML déjà transformé).
              pre({ children }) {
                const enfant = Array.isArray(children) ? children[0] : children;
                if (!isValidElement(enfant)) return <pre>{children}</pre>;

                const props = enfant.props as { className?: string; children?: ReactNode };
                const langage = (props.className || "").replace("language-", "").trim();
                const code = texteBrut(props.children).replace(/\n$/, "");

                switch (langage) {
                  case "mermaid":
                    return <Mermaid definition={code} />;
                  case "chart":
                    return <GraphiqueDonnees code={code} />;
                  case "carte":
                    return <CarteMessage code={code} />;
                  case "widget":
                  case "html":
                    return <WidgetSandbox code={code} />;
                  default:
                    return <BlocCode langage={langage} code={code} />;
                }
              },
              // Code inline (`texte`) : ne passe jamais par `pre` ci-dessus
              // -- juste un style discret, pas de coloration (pas assez de
              // contexte pour un langage sur un fragment isolé).
              code({ children }) {
                return (
                  <code className="rounded bg-dj-surface-haute px-1.5 py-0.5 font-mono text-[13px] text-dj-accent-1">
                    {children}
                  </code>
                );
              },
              img({ src, alt }) {
                return <ImageMessage src={typeof src === "string" ? src : undefined} alt={alt} />;
              },
              table({ children }) {
                return <TableauMessage>{children}</TableauMessage>;
              },
              // Lien : bascule vers une carte fichier, un lecteur média, ou
              // un aperçu (LinkPreview) selon ce que l'URL justifie -- le
              // lien texte brut est désormais le CAS DE REPLI, plus le
              // défaut (demande de Bourama, 2026-07-20 : un aperçu partout,
              // comme sur les autres plateformes, le lien nu seulement si
              // rien d'autre n'est exploitable).
              a({ href, children }) {
                if (!href) return <>{children}</>;
                const media = typeMedia(href);
                if (media) return <LecteurMedia href={href} type={media} />;
                if (extensionCode(href)) {
                  return <FichierCode href={href} nom={texteBrut(children) || href} />;
                }
                if (extensionFichier(href)) {
                  return <FichierChip href={href} nom={texteBrut(children) || href} />;
                }
                if (/^https?:\/\//i.test(href)) {
                  return <LinkPreview href={href} texteLien={texteBrut(children) || href} compact={estUtilisateur} />;
                }
                // mailto:/tel:/ancres internes -- un aperçu n'a pas de sens ici.
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dj-accent-1 underline hover:text-dj-accent-2"
                  >
                    {children}
                  </a>
                );
              },
            }}
          >
            {normaliserLatex(message.content)}
          </ReactMarkdown>
        </div>

        {/* Bulle flottante "Expliquer" -- apparaît uniquement sur une
            sélection de texte dans une réponse assistant. position:fixed,
            calée sur la sélection native du navigateur. */}
        {selection && (
          <button
            onClick={() => {
              onExpliquerSelection?.(selection.texte);
              setSelection(null);
              window.getSelection()?.removeAllRanges();
            }}
            style={{ left: selection.x, top: selection.y - 40 }}
            className="fixed z-20 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-dj-gradient px-3 py-1.5 text-xs font-semibold text-[#1A0D02] shadow-lg"
          >
            <MessageSquareQuote size={13} />
            Expliquer
          </button>
        )}
      </div>

      {/* Heure : uniquement sous le message utilisateur (correction du
          2026-07-15 -- pas sous l'assistant, voir section 3.1). */}
      {estUtilisateur && message.created_at && (
        <span className="mt-1 text-[11px] text-dj-inactif">{formaterHeure(message.created_at)}</span>
      )}

      <div className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={copier} aria-label="Copier" className="rounded-md p-1.5 text-dj-texte-muet hover:text-dj-texte">
          {copie ? <Check size={14} /> : <Copy size={14} />}
        </button>

        {estUtilisateur ? (
          <>
            <button onClick={onRegenerer} aria-label="Renvoyer" className="rounded-md p-1.5 text-dj-texte-muet hover:text-dj-texte">
              <RotateCw size={14} />
            </button>
            <button
              onClick={() => setEnEdition(true)}
              aria-label="Éditer"
              className="rounded-md p-1.5 text-dj-texte-muet hover:text-dj-texte"
            >
              <Pencil size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={lireAVoixHaute}
              aria-label={enLecture ? "Arrêter la lecture" : "Lire à voix haute"}
              className={`rounded-md p-1.5 hover:text-dj-texte ${enLecture ? "text-dj-accent-1" : "text-dj-texte-muet"}`}
            >
              <Volume2 size={14} />
            </button>
            <button onClick={onLike} aria-label="Retour positif" className="rounded-md p-1.5 text-dj-texte-muet hover:text-dj-texte">
              <ThumbsUp size={14} />
            </button>
            <button onClick={onDislike} aria-label="Retour négatif" className="rounded-md p-1.5 text-dj-texte-muet hover:text-dj-texte">
              <ThumbsDown size={14} />
            </button>
            <button onClick={onRegenerer} aria-label="Régénérer" className="rounded-md p-1.5 text-dj-texte-muet hover:text-dj-texte">
              <RotateCw size={14} />
            </button>
          </>
        )}
      </div>

      {pieceJointeOuverte && message.pieceJointe?.previewUrl && (
        <div
          className="fixed inset-0 z-50 flex animate-dj-fade-in items-center justify-center bg-black/85 p-6"
          onClick={() => setPieceJointeOuverte(false)}
        >
          <button aria-label="Fermer" className="absolute right-5 top-5 text-dj-texte-muet hover:text-dj-texte">
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={message.pieceJointe.previewUrl} alt="" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}

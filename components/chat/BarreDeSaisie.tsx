"use client";

import { useEffect, useRef, useState } from "react";
import { Pin, Mic, Square, AudioLines, ArrowUp, X, MapPin, Github, FileText, Maximize2, Minimize2, Search, Code } from "lucide-react";
import { transcrireAudioChat, statutConnexion, demarrerConnexion, depotsGithub } from "@/lib/api";
import { LecteurMedia } from "./LecteurMedia";
import { BlocCode } from "./BlocCode";
import hljs from "highlight.js";
import katex from "katex";

export type LongueurReponse = "courte" | "moyenne" | "longue";
export type LocalisationJointe = { latitude: number; longitude: number } | null;

// Détection de langage pour un collage de code (2026-07-25, demande de
// Bourama : coller du code aujourd'hui atterrit comme texte brut, sans
// aucun traitement). Testé manuellement le 25/07 : s'appuyer uniquement
// sur `hljs.highlightAuto(...).relevance` pour décider "est-ce du code ?"
// ne fonctionne PAS -- un énoncé de maths en français obtient un score
// PLUS élevé (8) qu'un vrai extrait JavaScript (5), et hljs se trompe
// aussi de langage sur des extraits courts (JS détecté "ada", Java
// détecté "csharp"). Approche retenue à la place : des motifs de syntaxe
// propres à chaque langage (accolades+mots-clés, pas de simple score de
// probabilité), hljs.highlightAuto seulement en dernier recours si rien
// de spécifique n'a matché mais que ça ressemble quand même à du code.
const REGEX_LATEX = /\\(begin|end)\{|\\frac|\\int|\\sum|\\sqrt|\\alpha|\\beta|\$\$/;
const PATTERNS_LANGAGE: [string, RegExp][] = [
  ["python", /\bdef\s+\w+\s*\(.*\)\s*:/],
  ["python", /^\s*import\s+\w+(\s+as\s+\w+)?\s*$/m],
  ["javascript", /\bconsole\.log\s*\(/],
  ["javascript", /=>\s*\{/],
  ["javascript", /\b(const|let|var)\s+\w+\s*=/],
  ["java", /\bpublic\s+static\s+void\s+main\b/],
  ["java", /\bpublic\s+(static\s+)?class\b/],
  ["cpp", /^\s*#include\s*</m],
  ["php", /<\?php/],
];
// Signal générique "ressemble à du code" mais sans langage identifiable
// directement -- hljs sert alors juste à deviner un nom, en dernier recours.
const PATTERNS_CODE_GENERIQUE = [/;\s*$/m, /^\s*\}\s*;?\s*$/m];
const SEUIL_RELEVANCE_CODE = 6;
const NOMS_LANGAGE: Record<string, string> = {
  python: "Python", javascript: "JavaScript", typescript: "TypeScript",
  java: "Java", cpp: "C++", php: "PHP", latex: "LaTeX",
};

function libellePieceJointe(langageDetecte: string | null, texteColle: string): string {
  if (langageDetecte === "latex") return "Formule collée -- LaTeX";
  if (langageDetecte) return `Code collé -- ${NOMS_LANGAGE[langageDetecte] || langageDetecte}`;
  return `Texte collé -- ${texteColle.length.toLocaleString("fr-FR")} caractères`;
}

function detecterLangageCode(texte: string): string | null {
  // Un extrait de code fait rarement une seule ligne -- évite de
  // convertir "x = 5" ou une simple formule collée en pièce jointe.
  if (texte.trim().split("\n").length < 3) return null;
  if (REGEX_LATEX.test(texte)) return "latex";
  for (const [langage, motif] of PATTERNS_LANGAGE) {
    if (motif.test(texte)) return langage;
  }
  if (PATTERNS_CODE_GENERIQUE.some((p) => p.test(texte))) {
    try {
      const resultat = hljs.highlightAuto(texte);
      if (resultat.language && resultat.relevance >= SEUIL_RELEVANCE_CODE) {
        return resultat.language;
      }
    } catch {
      // Détection auto peut échouer sur du texte inhabituel -- traité
      // comme "pas du code" plutôt que de faire planter le collage.
    }
  }
  return null;
}

const REGEX_URL = /(https?:\/\/[^\s]+)/g;

// Découpe le texte en segments {texte, lien} pour le calque de
// superposition -- coloration/soulignement des liens PENDANT la frappe
// (avant envoi), demande explicite de Bourama (2026-07-23) : un
// <textarea> natif ne peut pas colorer une sous-partie de son propre
// texte, donc on superpose un calque en lecture seule qui, lui, peut
// styler chaque morceau, pendant que le vrai <textarea> (texte rendu
// invisible via text-transparent) reste en dessous pour la saisie/le
// curseur/la sélection réels. Voir le rendu plus bas pour la
// synchronisation de défilement entre les deux calques.
function segmenterTexteAvecLiens(texte: string): { texte: string; lien: boolean }[] {
  const segments: { texte: string; lien: boolean }[] = [];
  let dernierIndex = 0;
  for (const trouve of texte.matchAll(REGEX_URL)) {
    const index = trouve.index ?? 0;
    if (index > dernierIndex) segments.push({ texte: texte.slice(dernierIndex, index), lien: false });
    segments.push({ texte: trouve[0], lien: true });
    dernierIndex = index + trouve[0].length;
  }
  if (dernierIndex < texte.length) segments.push({ texte: texte.slice(dernierIndex), lien: false });
  return segments;
}

// Types acceptés par le sélecteur de fichier -- élargi le 2026-07-20 pour
// couvrir images (Gemini vision), documents PDF/Word/Excel (extraction
// texte) ET vidéo (audio transcrit + frames analysées par Gemini), voir
// api/uploads.py.
const TYPES_FICHIERS_ACCEPTES =
  "image/jpeg,image/png,image/webp," +
  "application/pdf," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "video/mp4,video/webm,video/quicktime," +
  // Upload d'un vrai fichier audio (2026-07-22, préparé par Bourama --
  // distinct de la dictée micro juste en dessous, qui passe par le même
  // endpoint /audio-chat mais un chemin de code différent, voir
  // ChatIA.tsx:envoyerMessage).
  "audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/aac";

export function BarreDeSaisie({
  onEnvoyer,
  desactive,
  agentId,
}: {
  onEnvoyer: (
    texte: string,
    longueur: LongueurReponse,
    fichier: File | null,
    localisation: LocalisationJointe,
    texteColle: string | null,
    rechercheForcee: boolean
  ) => void;
  desactive?: boolean;
  agentId?: string;
}) {
  const [texte, setTexte] = useState("");
  const [longueur, setLongueur] = useState<LongueurReponse>("moyenne");
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercuFichier, setApercuFichier] = useState<string | null>(null);
  const [imageOuverte, setImageOuverte] = useState(false);
  // Icône de recherche web (2026-07-23, demande de Bourama : "une icône
  // dans la barre de saisie mais peut s'activer automatiquement") --
  // forçage manuel EN PLUS de l'activation automatique déjà possible
  // (le modèle décide seul d'utiliser Tavily via le tool-calling normal,
  // dès lors que le serveur est activé pour l'agent, voir
  // core/registre_outils.py). Un clic garantit la recherche pour LE
  // PROCHAIN message envoyé, puis se désactive (pas un mode permanent).
  const [rechercheForcee, setRechercheForcee] = useState(false);
  // Collage long -> pièce jointe texte (2026-07-23, demande de Bourama :
  // comportement Claude -- coller un gros pavé de texte ne l'insère pas
  // tel quel dans le champ, ça devient une pièce jointe séparée qu'on
  // peut retirer/relire, comme un fichier joint mais sans upload : le
  // texte est déjà là côté client, pas besoin d'aller-retour serveur).
  const SEUIL_COLLAGE_LONG = 800;
  const [texteColle, setTexteColle] = useState<string | null>(null);
  const [texteColleOuvert, setTexteColleOuvert] = useState(false);
  // Langage détecté si le collage est du code (2026-07-25) -- null pour
  // un collage de texte normal (>800 caractères, comportement existant
  // inchangé), une valeur hljs (ex. "python") sinon.
  const [langageDetecte, setLangageDetecte] = useState<string | null>(null);
  // Plein écran de la saisie (2026-07-23, demande de Bourama : l'agrandissement
  // auto restait trop limité pour écrire un long message confortablement).
  const [pleinEcranSaisie, setPleinEcranSaisie] = useState(false);
  const inputFichierRef = useRef<HTMLInputElement>(null);
  const zoneTexteRef = useRef<HTMLTextAreaElement>(null);
  const calqueRef = useRef<HTMLDivElement>(null);
  // Calque/textarea séparés pour le plein écran -- reste monté en même
  // temps que le composer compact (juste recouvert par l'overlay), donc
  // impossible de partager les mêmes refs entre les deux.
  const zoneTextePleinEcranRef = useRef<HTMLTextAreaElement>(null);
  const calquePleinEcranRef = useRef<HTMLDivElement>(null);

  // Aperçu du fichier joint AVANT envoi (2026-07-20, bug trouvé par
  // Bourama : jusqu'ici juste le nom du fichier en texte, aucune vignette).
  // URL.createObjectURL uniquement pour les images -- documents/vidéos
  // gardent le chip icône+nom (une vraie prévisualisation vidéo ou PDF
  // demanderait un lecteur/rendu dédié, hors scope de ce correctif ciblé).
  function choisirFichier(f: File | null) {
    setApercuFichier((prec) => {
      if (prec) URL.revokeObjectURL(prec);
      return f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null;
    });
    setFichier(f);
  }

  // Auto-agrandissement du textarea (2026-07-20, bug trouvé par Bourama en
  // test réel) -- rows={1} fixait la hauteur à une seule ligne sans aucune
  // logique de croissance : dès qu'on passait à la ligne, le texte
  // défilait DANS cette unique ligne au lieu que le cadre grandisse, donc
  // tout ce qui était au-dessus du curseur sortait du cadre visible.
  // Approche standard (pas de lib) : hauteur remise à "auto" puis fixée à
  // scrollHeight à chaque frappe -- le CSS max-h-40 (voir plus bas) prend
  // le relais au-delà pour repasser en défilement interne plutôt que de
  // grandir indéfiniment.
  function ajusterHauteurTexte() {
    const el = zoneTexteRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    ajusterHauteurTexte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dictée vocale (2026-07-20) : enregistrement micro réel via
  // MediaRecorder, transcrit par Whisper/Groq (api/uploads.py:
  // uploader_audio_chat) puis ajouté au texte -- pas d'envoi automatique,
  // l'étudiant garde la main pour relire/corriger avant d'envoyer.
  const [dictant, setDictant] = useState(false);
  const [transcriptionEnCours, setTranscriptionEnCours] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Localisation (2026-07-20) : jointe explicitement via ce bouton, jamais
  // capturée en silence -- voir core/main.py:chat(), paramètre
  // `localisation`, injecté en contexte de prompt système.
  const [localisation, setLocalisation] = useState<LocalisationJointe>(null);
  const [localisationEnCours, setLocalisationEnCours] = useState(false);

  // Connexion GitHub (2026-07-22) : bouton dédié, style de l'app (pas les
  // couleurs de marque GitHub) -- voir connexions/oauth_generique.py et
  // core/serveur_mcp_github.py côté backend. `null` = statut pas encore
  // connu (chargement), évite un flash "non connecté" au premier rendu.
  const [githubConnecte, setGithubConnecte] = useState<boolean | null>(null);
  const [githubEnCours, setGithubEnCours] = useState(false);
  // Sélecteur de dépôts (2026-07-22) : ouvert au clic quand déjà connecté
  // -- cliquer un dépôt insère son lien dans le champ, pas d'envoi
  // automatique (la personne garde la main pour écrire sa question).
  const [depots, setDepots] = useState<{ nom_complet: string; prive: boolean; description: string | null }[] | null>(
    null
  );
  const [selecteurOuvert, setSelecteurOuvert] = useState(false);
  const selecteurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selecteurOuvert) return;
    function gererClicExterieur(e: MouseEvent) {
      if (selecteurRef.current && !selecteurRef.current.contains(e.target as Node)) {
        setSelecteurOuvert(false);
      }
    }
    document.addEventListener("mousedown", gererClicExterieur);
    return () => document.removeEventListener("mousedown", gererClicExterieur);
  }, [selecteurOuvert]);

  useEffect(() => {
    statutConnexion("github")
      .then((r) => setGithubConnecte(r.connecte))
      .catch(() => setGithubConnecte(false));
  }, []);

  async function cliquerGithub() {
    if (!githubConnecte) {
      setGithubEnCours(true);
      try {
        const { url, erreur } = await demarrerConnexion("github", agentId);
        if (url) {
          window.location.href = url;
        } else {
          alert(erreur || "Connexion GitHub indisponible pour le moment.");
          setGithubEnCours(false);
        }
      } catch (e) {
        // Corrigé le 2026-07-23 : masquait la vraie cause (erreur réseau,
        // 401/500 côté backend, session expirée...) derrière le même
        // texte générique à chaque fois -- même correction que pour la
        // dictée vocale et l'upload de fichiers plus tôt dans la session.
        alert(e instanceof Error ? e.message : "Connexion GitHub indisponible pour le moment.");
        setGithubEnCours(false);
      }
      return;
    }

    // Déjà connecté : ouvre/ferme le sélecteur de dépôts, en chargeant la
    // liste au premier clic seulement (pas re-fetché à chaque ouverture).
    setSelecteurOuvert((prec) => !prec);
    if (depots === null) {
      setGithubEnCours(true);
      try {
        const { depots: liste, erreur } = await depotsGithub();
        setDepots(liste);
        if (erreur) alert(erreur);
      } catch (e) {
        setDepots([]);
        alert(e instanceof Error ? e.message : "Impossible de récupérer tes dépôts pour le moment.");
      } finally {
        setGithubEnCours(false);
      }
    }
  }

  function choisirDepot(nomComplet: string) {
    setTexte((prec) => (prec.trim() ? `${prec} https://github.com/${nomComplet}` : `https://github.com/${nomComplet}`));
    setSelecteurOuvert(false);
    requestAnimationFrame(ajusterHauteurTexte);
  }

  function pasDisponible() {
    alert("Pas disponible pour le moment.");
  }

  function gererCollage(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const texteColleBrut = e.clipboardData.getData("text/plain");
    const langage = detecterLangageCode(texteColleBrut);
    if (texteColleBrut.length > SEUIL_COLLAGE_LONG || langage) {
      e.preventDefault();
      setTexteColle(texteColleBrut);
      setLangageDetecte(langage);
    }
  }

  function envoyer() {
    if ((!texte.trim() && !texteColle) || desactive) return;
    onEnvoyer(texte, longueur, fichier, localisation, texteColle, rechercheForcee);
    setTexte("");
    choisirFichier(null);
    setLocalisation(null);
    setTexteColle(null);
    setLangageDetecte(null);
    setRechercheForcee(false);
    requestAnimationFrame(ajusterHauteurTexte);
  }

  async function demarrerDictee() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((piste) => piste.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setTranscriptionEnCours(true);
        try {
          const fichierAudio = new File([blob], "dictee.webm", { type: blob.type });
          const { texte: transcrit } = await transcrireAudioChat(fichierAudio);
          setTexte((prec) => (prec.trim() ? `${prec} ${transcrit}` : transcrit));
          requestAnimationFrame(ajusterHauteurTexte);
        } catch (e) {
          // Message générique remplacé le 2026-07-20 : masquait la vraie
          // cause (non connecté / audio vide-silencieux / vraie erreur
          // serveur) derrière un seul texte, impossible à diagnostiquer
          // depuis le retour utilisateur.
          alert(e instanceof Error ? e.message : "Je n'ai pas compris, réessaie.");
        } finally {
          setTranscriptionEnCours(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setDictant(true);
    } catch {
      alert("Micro indisponible ou refusé.");
    }
  }

  function arreterDictee() {
    mediaRecorderRef.current?.stop();
    setDictant(false);
  }

  function toggleLocalisation() {
    if (localisation) {
      setLocalisation(null);
      return;
    }
    if (!navigator.geolocation) {
      alert("Géolocalisation non disponible sur cet appareil.");
      return;
    }
    setLocalisationEnCours(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocalisation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocalisationEnCours(false);
      },
      () => {
        alert("Position refusée ou indisponible.");
        setLocalisationEnCours(false);
      }
    );
  }

  return (
    <div className="w-full">
      {/* Vignettes d'aperçu (fichier joint / position jointe), avant envoi. */}
      {(fichier || localisation || texteColle) && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {fichier && (
            apercuFichier ? (
              <div className="relative w-fit">
                <button
                  onClick={() => setImageOuverte(true)}
                  aria-label="Agrandir l'image"
                  className="block h-16 w-16 overflow-hidden rounded-xl border border-dj-bordure"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (URL.createObjectURL) */}
                  <img src={apercuFichier} alt={fichier.name} className="h-full w-full object-cover" />
                </button>
                <button
                  onClick={() => choisirFichier(null)}
                  aria-label="Retirer le fichier"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-dj-fond text-dj-texte-muet hover:text-dj-texte"
                >
                  <X size={12} />
                </button>
              </div>
            ) : fichier.type.startsWith("video/") || fichier.type.startsWith("audio/") ? (
              // Aperçu jouable avant envoi (2026-07-23, demande de Bourama :
              // avant on ne voyait qu'un nom de fichier cliquable, aucun
              // moyen d'écouter/regarder avant d'envoyer) -- même lecteur
              // que celui utilisé pour un lien reçu, sur une URL locale
              // (blob), pas encore uploadée.
              <div className="relative w-full max-w-xs">
                <LecteurMedia
                  href={URL.createObjectURL(fichier)}
                  type={fichier.type.startsWith("video/") ? "video" : "audio"}
                />
                <button
                  onClick={() => choisirFichier(null)}
                  aria-label="Retirer le fichier"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-dj-fond text-dj-texte-muet hover:text-dj-texte"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="flex w-fit items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-xs text-dj-texte-muet">
                <button
                  onClick={() => window.open(URL.createObjectURL(fichier), "_blank")}
                  aria-label="Ouvrir le fichier"
                  className="flex items-center gap-2 hover:text-dj-texte"
                >
                  <FileText size={14} />
                  <span className="max-w-[180px] truncate">{fichier.name}</span>
                </button>
                <button onClick={() => choisirFichier(null)} aria-label="Retirer le fichier" className="hover:text-dj-texte">
                  <X size={14} />
                </button>
              </div>
            )
          )}
          {localisation && (
            <div className="flex w-fit items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-xs text-dj-texte-muet">
              <MapPin size={14} />
              <span>Position jointe</span>
              <button onClick={() => setLocalisation(null)} aria-label="Retirer la position" className="hover:text-dj-texte">
                <X size={14} />
              </button>
            </div>
          )}
          {texteColle && (
            <button
              onClick={() => setTexteColleOuvert(true)}
              className="flex w-fit items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-xs text-dj-texte-muet hover:text-dj-texte"
            >
              {langageDetecte ? <Code size={14} /> : <FileText size={14} />}
              <span>{libellePieceJointe(langageDetecte, texteColle)}</span>
              <span
                role="button"
                aria-label="Retirer le texte collé"
                onClick={(e) => {
                  e.stopPropagation();
                  setTexteColle(null);
                  setLangageDetecte(null);
                }}
                className="hover:text-dj-texte"
              >
                <X size={14} />
              </span>
            </button>
          )}
        </div>
      )}

      {/* Rectangle à coins arrondis (plus une pilule ovale complète), tous
          les éléments alignés en bas -- voir section 3.3. */}
      <div className="rounded-3xl border border-dj-bordure bg-dj-surface-haute px-4 py-3 focus-within:border-dj-bordure-forte">
        <div className="relative">
          {/* Calque de couleur -- lecture seule, non interactif
              (pointer-events-none), affiche EXACTEMENT le même texte que
              le textarea réel juste au-dessus dans le DOM (même police/
              taille/interligne/césure), avec les liens en dj-accent-1
              souligné. Le vrai texte du textarea est rendu invisible
              (text-transparent, voir plus bas) -- c'est ce calque qui
              porte toute la couleur visible. */}
          <div
            ref={calqueRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 max-h-64 overflow-hidden whitespace-pre-wrap break-words text-[15px] leading-normal text-dj-texte"
          >
            {texte
              ? segmenterTexteAvecLiens(texte).map((s, i) =>
                  s.lien ? (
                    <span key={i} className="text-dj-accent-1 underline">
                      {s.texte}
                    </span>
                  ) : (
                    <span key={i}>{s.texte}</span>
                  )
                )
              : null}
            {/* Espace de fin pour que le calque ait la même hauteur que le
                textarea même quand le texte se termine par un retour à la
                ligne (sinon scrollHeight des deux diverge légèrement). */}
            {texte.endsWith("\n") && "\u200b"}
          </div>
          <textarea
            ref={zoneTexteRef}
            value={texte}
            onChange={(e) => {
              setTexte(e.target.value);
              ajusterHauteurTexte();
            }}
            onPaste={gererCollage}
            onScroll={(e) => {
              if (calqueRef.current) calqueRef.current.scrollTop = e.currentTarget.scrollTop;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                envoyer();
              }
            }}
            placeholder={transcriptionEnCours ? "Transcription en cours..." : "Pose ta question..."}
            rows={1}
            className="relative max-h-64 w-full resize-none overflow-y-auto bg-transparent text-[15px] leading-normal text-transparent caret-dj-texte outline-none placeholder:text-dj-texte-muet"
          />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Punaise (remplace le "+"), contour monochrome, même fonction
                (upload fichier) -- section 3.3. Accepte images ET documents
                depuis le 2026-07-20 (voir TYPES_FICHIERS_ACCEPTES). */}
            <button
              onClick={() => inputFichierRef.current?.click()}
              aria-label="Joindre un fichier"
              className="text-dj-texte-muet transition-colors hover:text-dj-texte"
            >
              <Pin size={18} />
            </button>
            <input
              ref={inputFichierRef}
              type="file"
              accept={TYPES_FICHIERS_ACCEPTES}
              className="hidden"
              onChange={(e) => choisirFichier(e.target.files?.[0] ?? null)}
            />

            {/* Connexion GitHub (2026-07-22) : icône de marque, couleurs et
                style de l'app (dj-texte-muet/dj-accent-1), pas les couleurs
                GitHub -- voir connexions/oauth_generique.py côté backend.
                Point vert discret quand déjà connecté. Une fois connecté,
                le clic ouvre un sélecteur de dépôts (au lieu de ne rien
                faire) -- cliquer un dépôt insère son lien dans le champ. */}
            <div className="relative" ref={selecteurRef}>
              <button
                onClick={cliquerGithub}
                disabled={githubEnCours}
                aria-label={githubConnecte ? "Choisir un dépôt GitHub" : "Connecter GitHub"}
                title={githubConnecte ? "Choisir un dépôt GitHub" : "Connecter GitHub"}
                className={
                  githubConnecte
                    ? "relative text-dj-accent-1 transition-colors"
                    : "relative text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-60"
                }
              >
                <Github size={18} />
                {githubConnecte && (
                  <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-green-500" />
                )}
              </button>

              {selecteurOuvert && (
                <div className="absolute bottom-full left-0 z-30 mb-2 max-h-64 w-72 overflow-y-auto rounded-xl border border-dj-bordure bg-dj-surface-haute p-1 shadow-xl">
                  {depots === null && (
                    <p className="px-3 py-2 text-xs text-dj-texte-muet">Chargement de tes dépôts...</p>
                  )}
                  {depots?.length === 0 && (
                    <p className="px-3 py-2 text-xs text-dj-texte-muet">Aucun dépôt trouvé.</p>
                  )}
                  {depots?.map((d) => (
                    <button
                      key={d.nom_complet}
                      type="button"
                      onClick={() => choisirDepot(d.nom_complet)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-dj-texte transition-colors hover:bg-dj-surface"
                    >
                      <span className="flex items-center gap-1.5">
                        {d.nom_complet}
                        {d.prive && (
                          <span className="rounded bg-dj-surface px-1.5 py-0.5 text-[10px] text-dj-texte-muet">
                            privé
                          </span>
                        )}
                      </span>
                      {d.description && (
                        <span className="line-clamp-1 text-xs text-dj-texte-muet">{d.description}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Position (2026-07-20) : jointe/retirée à chaque message,
                jamais capturée automatiquement -- clic = permission navigateur. */}
            <button
              onClick={toggleLocalisation}
              disabled={localisationEnCours}
              aria-label={localisation ? "Retirer la position" : "Joindre ma position"}
              className={
                localisation
                  ? "text-dj-texte transition-colors"
                  : "text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-60"
              }
            >
              <MapPin size={18} />
            </button>

            {/* Recherche web (2026-07-23) -- forçage manuel pour le
                prochain message ; se désactive après envoi (pas un mode
                permanent, voir état rechercheForcee). Le modèle peut de
                toute façon décider seul d'utiliser Tavily sans ce bouton
                (activation automatique via le tool-calling normal). */}
            <button
              onClick={() => setRechercheForcee((v) => !v)}
              aria-label={rechercheForcee ? "Recherche web activée pour le prochain message" : "Forcer une recherche web"}
              title={rechercheForcee ? "Recherche web activée pour le prochain message" : "Forcer une recherche web"}
              className={
                rechercheForcee
                  ? "text-dj-accent-1 transition-colors"
                  : "text-dj-texte-muet transition-colors hover:text-dj-texte"
              }
            >
              <Search size={18} />
            </button>

            {/* Sélecteur Courte/Moyenne/Longue (remplace "Sonnet 5/Moyen"),
                modifiable à chaque message -- section 3.3. */}
            <select
              value={longueur}
              onChange={(e) => setLongueur(e.target.value as LongueurReponse)}
              className="rounded-md bg-transparent text-xs text-dj-texte-muet outline-none"
            >
              <option value="courte">Courte</option>
              <option value="moyenne">Moyenne</option>
              <option value="longue">Longue</option>
            </select>

            <button
              type="button"
              onClick={() => setPleinEcranSaisie(true)}
              aria-label="Agrandir en plein écran"
              className="text-dj-texte-muet transition-colors hover:text-dj-texte"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {dictant ? (
              <button
                onClick={arreterDictee}
                aria-label="Arrêter la dictée"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-dj-accent-2 text-white"
              >
                <Square size={14} />
              </button>
            ) : texte.trim() || texteColle ? (
              <button
                onClick={envoyer}
                disabled={desactive}
                aria-label="Envoyer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-dj-gradient text-[#1A0D02] disabled:opacity-60"
              >
                <ArrowUp size={16} />
              </button>
            ) : (
              <>
                {/* Micro = dictée vocale, branché le 2026-07-20 (voir
                    demarrerDictee/arreterDictee ci-dessus). Waveform = mode
                    vocal complet (conversation continue) -- PAS branché,
                    portée bien plus large qu'une simple dictée, laissé de
                    côté pour l'instant. */}
                <button
                  onClick={demarrerDictee}
                  disabled={transcriptionEnCours}
                  aria-label="Dictée vocale"
                  className="text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-60"
                >
                  <Mic size={18} />
                </button>
                <button onClick={pasDisponible} aria-label="Mode vocal" className="text-dj-texte-muet transition-colors hover:text-dj-texte">
                  <AudioLines size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {texteColleOuvert && texteColle && (
        <div
          className="fixed inset-0 z-50 flex animate-dj-fade-in flex-col bg-dj-fond p-6"
          onClick={() => setTexteColleOuvert(false)}
        >
          <div className="flex items-center justify-between pb-4">
            <span className="text-sm text-dj-texte-muet">{libellePieceJointe(langageDetecte, texteColle)}</span>
            <button
              onClick={() => setTexteColleOuvert(false)}
              aria-label="Fermer"
              className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-2.5 py-1.5 text-xs text-dj-texte-muet hover:text-dj-texte"
            >
              <X size={14} /> Fermer
            </button>
          </div>
          {langageDetecte === "latex" ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="min-h-0 flex-1 overflow-auto rounded-xl border border-dj-bordure bg-dj-surface-haute p-6 text-dj-texte"
              // Rendu direct en formule (fractions, intégrales, racines...),
              // pas en texte source coloré -- demande Bourama (25/07) : "le
              // latex, ça pourrait être direct, ça s'affiche en gros les
              // fractions etc". KaTeX gère \begin{equation}...\end{equation}
              // nativement, pas besoin de passer par remark-math/$ $ ici
              // puisque tout le contenu collé EST du LaTeX (pas du markdown
              // mélangé comme dans une réponse de l'IA).
              dangerouslySetInnerHTML={{
                __html: (() => {
                  try {
                    return katex.renderToString(texteColle, { displayMode: true, throwOnError: false });
                  } catch {
                    return texteColle.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
                  }
                })(),
              }}
            />
          ) : langageDetecte ? (
            <div onClick={(e) => e.stopPropagation()} className="min-h-0 flex-1 overflow-auto">
              <BlocCode langage={langageDetecte} code={texteColle} />
            </div>
          ) : (
            <div
              onClick={(e) => e.stopPropagation()}
              className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-dj-texte"
            >
              {texteColle}
            </div>
          )}
        </div>
      )}

      {imageOuverte && apercuFichier && (
        <div
          className="fixed inset-0 z-50 flex animate-dj-fade-in items-center justify-center bg-black/85 p-6"
          onClick={() => setImageOuverte(false)}
        >
          <button aria-label="Fermer" className="absolute right-5 top-5 text-dj-texte-muet hover:text-dj-texte">
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={apercuFichier} alt="" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" />
        </div>
      )}

      {pleinEcranSaisie && (
        // Plein écran de la saisie : même état `texte`/`onEnvoyer` que le
        // composer normal (pas de duplication de logique), juste une zone
        // d'écriture plus grande + bouton envoyer intégré pour ne pas avoir
        // à fermer le plein écran avant d'envoyer (demande de Bourama,
        // 2026-07-23). Coloration des liens reprise ici aussi (2026-07-23,
        // suite) via le même calque que le composer compact, juste sur des
        // refs séparées.
        <div className="fixed inset-0 z-50 flex flex-col animate-dj-fade-in bg-dj-fond p-6">
          <div className="flex items-center justify-between pb-4">
            <span className="text-sm text-dj-texte-muet">Écris ton message</span>
            <button
              onClick={() => setPleinEcranSaisie(false)}
              aria-label="Rétrécir"
              className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-2.5 py-1.5 text-xs text-dj-texte-muet hover:text-dj-texte"
            >
              <Minimize2 size={14} /> Rétrécir
            </button>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {/* Même technique de calque que le composer compact (voir plus
                haut, segmenterTexteAvecLiens) -- coloration des liens
                pendant la frappe, demande de Bourama (2026-07-23) : le
                plein écran ne doit pas perdre cette fonctionnalité. */}
            <div
              ref={calquePleinEcranRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-base leading-relaxed text-dj-texte"
            >
              {texte
                ? segmenterTexteAvecLiens(texte).map((s, i) =>
                    s.lien ? (
                      <span key={i} className="text-dj-accent-1 underline">
                        {s.texte}
                      </span>
                    ) : (
                      <span key={i}>{s.texte}</span>
                    )
                  )
                : null}
              {texte.endsWith("\n") && "\u200b"}
            </div>
            <textarea
              ref={zoneTextePleinEcranRef}
              autoFocus
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              onPaste={gererCollage}
              onScroll={(e) => {
                if (calquePleinEcranRef.current) calquePleinEcranRef.current.scrollTop = e.currentTarget.scrollTop;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  envoyer();
                  setPleinEcranSaisie(false);
                }
              }}
              placeholder="Pose ta question..."
              className="relative h-full w-full resize-none overflow-y-auto bg-transparent text-base leading-relaxed text-transparent caret-dj-texte outline-none placeholder:text-dj-texte-muet"
            />
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={() => {
                envoyer();
                setPleinEcranSaisie(false);
              }}
              disabled={(!texte.trim() && !texteColle) || desactive}
              aria-label="Envoyer"
              className="flex items-center gap-2 rounded-full bg-dj-gradient px-5 py-2.5 text-sm font-medium text-[#1A0D02] disabled:opacity-60"
            >
              Envoyer <ArrowUp size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

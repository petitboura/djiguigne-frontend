"use client";

import { useEffect, useRef, useState } from "react";
import { Pin, Mic, Square, AudioLines, ArrowUp, X, MapPin, Github, FileText, Maximize2, Minimize2, Search, Code, PenLine, Wrench, FileSearch, Globe, Map, BookOpen, FileType, FileSpreadsheet, Presentation, FolderSearch, Package, Archive, Download, Image as IconImage, Rocket, Bell, FolderTree, FileCode, Edit3, Sigma, Check, AppWindow, ChevronDown } from "lucide-react";
import { transcrireAudioChat, statutConnexion, demarrerConnexion, depotsGithub, extraireFormuleImage } from "@/lib/api";
import { LecteurMedia } from "./LecteurMedia";
import { CanvasDessin } from "./CanvasDessin";
import { EditeurFormule } from "./EditeurFormule";
import { BlocCode } from "./BlocCode";
import hljs from "highlight.js";
import katex from "katex";

export type LongueurReponse = "courte" | "moyenne" | "longue";
export type LocalisationJointe = { latitude: number; longitude: number } | null;

// Bouton "Outils" (2026-07-25, TEST agent nucleos) -- liste statique
// côté frontend, doit rester synchronisée à la main avec la liste réelle
// envoyée par core/registre_outils.py + agents_outils_generation (pas de
// requête dédiée pour l'instant, phase de test). Voir échange avec
// Bourama du 25/07 pour le détail de chaque groupe.
//
// Classement en onglets (2026-07-28, demande Bourama) :
// - "generer" -> Générer
// - "rechercher" -> Rechercher / Explorer
// - "action_app" -> Action dans l'app -- outils qui passent par un service
//   tiers CONNECTÉ (GitHub aujourd'hui, Notion demain par ex.) ; le champ
//   `appli` (nom d'une entrée de APPLIS_DISPONIBLES) les regroupe sous
//   l'icône+nom de leur appli dans cet onglet, en accordéon.
// - "utilitaires" -> Utilitaires -- tout le reste, y compris les 4
//   anciennes icônes autonomes (préfixe "ui_", voir plus bas)
export type OngletOutil = "generer" | "rechercher" | "action_app" | "utilitaires";

export const OUTILS_DISPONIBLES: { nom: string; label: string; Icone: typeof Search; onglet: OngletOutil; appli?: string }[] = [
  { nom: "generer_document", label: "Générer un PDF/texte", Icone: FileText, onglet: "generer" },
  { nom: "generer_document_word", label: "Générer un Word", Icone: FileType, onglet: "generer" },
  { nom: "generer_document_excel", label: "Générer un Excel", Icone: FileSpreadsheet, onglet: "generer" },
  { nom: "generer_document_powerpoint", label: "Générer un PowerPoint", Icone: Presentation, onglet: "generer" },
  { nom: "generer_code", label: "Générer du code", Icone: Code, onglet: "generer" },
  { nom: "generer_site_zip", label: "Générer un site (zip)", Icone: Package, onglet: "generer" },
  { nom: "generer_bundle", label: "Générer une archive", Icone: Archive, onglet: "generer" },
  { nom: "generer_image", label: "Générer une image", Icone: IconImage, onglet: "generer" },

  { nom: "tavily_search", label: "Recherche web", Icone: Search, onglet: "rechercher" },
  { nom: "tavily_extract", label: "Extraire une page", Icone: FileSearch, onglet: "rechercher" },
  { nom: "tavily_crawl", label: "Explorer un site", Icone: Globe, onglet: "rechercher" },
  { nom: "tavily_map", label: "Cartographier un site", Icone: Map, onglet: "rechercher" },
  { nom: "tavily_research", label: "Recherche approfondie", Icone: BookOpen, onglet: "rechercher" },
  { nom: "chercher_fichier", label: "Chercher un fichier", Icone: FolderSearch, onglet: "rechercher" },

  { nom: "explorer_depot_github", label: "Explorer un dépôt GitHub", Icone: FolderTree, onglet: "action_app", appli: "github" },
  { nom: "lire_fichier_depot_github", label: "Lire un fichier GitHub", Icone: FileCode, onglet: "action_app", appli: "github" },
  { nom: "modifier_fichier_depot_github", label: "Modifier un fichier GitHub", Icone: Edit3, onglet: "action_app", appli: "github" },

  { nom: "exporter_donnees", label: "Exporter des données", Icone: Download, onglet: "utilitaires" },
  { nom: "deployer_site", label: "Déployer un site", Icone: Rocket, onglet: "utilitaires" },
  { nom: "planifier_rappel", label: "Planifier un rappel", Icone: Bell, onglet: "utilitaires" },
  // Actions locales (2026-07-28, refonte barre de saisie demandée par
  // Bourama) -- ces 4 entrées ne sont PAS des outils envoyés au backend
  // pour le tool-calling du modèle (contrairement à tout ce qui précède
  // dans cette liste) : ce sont d'anciennes icônes autonomes de la barre
  // (localisation, éditeur formule, recherche web forcée, dessin) qui
  // rejoignent désormais la même liste "Outils" pour libérer de la place.
  // Préfixe "ui_" utilisé comme marqueur de traitement spécial -- voir
  // estOutilActif/executerActionOutil plus bas, qui interceptent ce
  // préfixe au lieu de pousser vers `outilsForces` (backend).
  { nom: "ui_localisation", label: "Joindre ma position", Icone: MapPin, onglet: "utilitaires" },
  { nom: "ui_formule", label: "Insérer une formule / réaction chimique", Icone: Sigma, onglet: "utilitaires" },
  { nom: "ui_recherche", label: "Forcer une recherche web", Icone: Search, onglet: "utilitaires" },
  { nom: "ui_dessin", label: "Dessiner (géométrie, graphe, croquis)", Icone: PenLine, onglet: "utilitaires" },
];

export const ONGLETS_OUTILS: { id: OngletOutil; label: string }[] = [
  { id: "generer", label: "Générer" },
  { id: "rechercher", label: "Rechercher / Explorer" },
  { id: "action_app", label: "Action dans l'app" },
  { id: "utilitaires", label: "Utilitaires" },
];

// Liste "Appli" (2026-07-28) -- pendant symétrique à OUTILS_DISPONIBLES,
// mais réservée à ce qui nécessite une connexion/authentification
// utilisateur (OAuth, session tierce...). Une seule entrée pour l'instant
// (GitHub) -- structure prête à en accueillir d'autres sans retoucher la
// logique de récence/slot variable ci-dessous. Sert aussi de source pour
// les en-têtes de groupe (icône + nom) de l'onglet "Action dans l'app"
// ci-dessus, via le champ `appli` des entrées de OUTILS_DISPONIBLES.
export const APPLIS_DISPONIBLES: { nom: string; label: string; Icone: typeof Github }[] = [
  { nom: "github", label: "GitHub", Icone: Github },
];

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

// Aperçu formules (2026-07-27, demande de Bourama : le champ de saisie
// reste un <textarea> brut -- LaTeX visible tel quel ($...$) pendant la
// frappe -- mais un aperçu séparé au-dessus affiche le même texte avec
// les formules rendues via KaTeX, mis à jour en direct à chaque frappe.
// Alternative volontairement plus légère qu'un vrai éditeur riche
// (contenteditable) : celui-ci demanderait de refaire toute la gestion
// du curseur/de la sélection déjà en place (insertion à la position du
// curseur, sélection -> "Expliquer", détection de collage, etc.) --
// voir échange avec Bourama à ce sujet. `$$...$$` est traité avant
// `$...$` pour ne pas couper un bloc display au milieu.
const REGEX_FORMULE = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;

function segmenterTexteAvecFormules(texte: string): { texte: string; formule: boolean; bloc?: boolean }[] {
  const segments: { texte: string; formule: boolean; bloc?: boolean }[] = [];
  let dernierIndex = 0;
  for (const trouve of texte.matchAll(REGEX_FORMULE)) {
    const index = trouve.index ?? 0;
    if (index > dernierIndex) segments.push({ texte: texte.slice(dernierIndex, index), formule: false });
    const estBloc = trouve[1] !== undefined;
    segments.push({ texte: estBloc ? trouve[1] : trouve[2], formule: true, bloc: estBloc });
    dernierIndex = index + trouve[0].length;
  }
  if (dernierIndex < texte.length) segments.push({ texte: texte.slice(dernierIndex), formule: false });
  return segments;
}

function rendreFormuleKatex(latex: string, bloc: boolean): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: bloc });
  } catch {
    return latex;
  }
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
    rechercheForcee: boolean,
    outilsForces: string[]
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
  // Bouton "Outils" (2026-07-25, étendu à la MULTI-sélection le 26/07 --
  // voir core/mcp_tools.py:lister_tous_les_outils). AUCUN outil n'est
  // envoyé au modèle par défaut, sur aucun agent : il faut en
  // sélectionner un ou plusieurs manuellement ici pour qu'ils soient
  // disponibles pour le prochain message. Sélection cumulative (clic sur
  // un outil déjà actif le retire, clic sur un autre l'ajoute à la liste
  // sans désélectionner le reste) -- demande explicite de Bourama, la
  // sélection unique précédente ne permettait pas de combiner par ex.
  // recherche web + GitHub sur un même message.
  const [outilsForces, setOutilsForces] = useState<string[]>([]);
  const [menuOutilsOuvert, setMenuOutilsOuvert] = useState(false);
  const menuOutilsRef = useRef<HTMLDivElement>(null);
  const boutonOutilsRef = useRef<HTMLButtonElement>(null);
  // Onglets du menu Outils (2026-07-28) -- voir ONGLETS_OUTILS en haut du
  // fichier. "generer" ouvert par défaut au premier affichage.
  const [ongletOutilActif, setOngletOutilActif] = useState<OngletOutil>("generer");
  // Groupes d'applis dépliés dans l'onglet "Action dans l'app" -- accordéon
  // à dépliage multiple (demande explicite de Bourama : "option B", pas un
  // seul groupe ouvert à la fois).
  const [groupesAppliDeplies, setGroupesAppliDeplies] = useState<string[]>([]);

  // Slots variables (2026-07-28, refonte barre de saisie demandée par
  // Bourama) -- 3 emplacements "derniers outils utilisés" + 1 emplacement
  // "dernière appli utilisée", à côté des icônes fixes (pin, ouvrir liste
  // outils, ouvrir liste appli). Le plus récent en tête de tableau.
  // Volontairement en mémoire (pas de persistance localStorage) : recommence
  // à vide à chaque rechargement de page, pas de demande explicite pour
  // que ça survive à un refresh.
  const NB_SLOTS_OUTILS_RECENTS = 3;
  const [outilsRecents, setOutilsRecents] = useState<string[]>([]);
  // Un seul slot appli -> "github" par défaut puisque c'est la seule appli
  // disponible pour l'instant (avant cette refonte c'était une icône fixe,
  // donc on ne veut pas que le slot parte vide au premier chargement).
  const [appliRecente, setAppliRecente] = useState<string | null>("github");
  const [menuAppliOuvert, setMenuAppliOuvert] = useState(false);
  const menuAppliRef = useRef<HTMLDivElement>(null);
  const boutonAppliRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuAppliOuvert) return;
    function gererClicExterieur(e: MouseEvent) {
      const cible = e.target as Node;
      if (menuAppliRef.current?.contains(cible)) return;
      if (boutonAppliRef.current?.contains(cible)) return;
      setMenuAppliOuvert(false);
    }
    document.addEventListener("mousedown", gererClicExterieur);
    return () => document.removeEventListener("mousedown", gererClicExterieur);
  }, [menuAppliOuvert]);

  function enregistrerUtilisationOutil(nom: string) {
    setOutilsRecents((prec) => [nom, ...prec.filter((n) => n !== nom)].slice(0, NB_SLOTS_OUTILS_RECENTS));
  }

  function enregistrerUtilisationAppli(nom: string) {
    setAppliRecente(nom);
  }

  // Accordéon "Action dans l'app" (2026-07-28) -- dépliage multiple, chaque
  // groupe d'appli se toggle indépendamment des autres (option B validée
  // par Bourama).
  function toggleGroupeAppli(nomAppli: string) {
    setGroupesAppliDeplies((prec) =>
      prec.includes(nomAppli) ? prec.filter((n) => n !== nomAppli) : [...prec, nomAppli]
    );
  }

  // Certaines entrées de OUTILS_DISPONIBLES (préfixe "ui_") ne sont pas des
  // outils backend forcés mais d'anciennes icônes autonomes de la barre --
  // ces deux fonctions font le routage, que l'entrée soit cliquée depuis le
  // menu "Outils" ou depuis son propre slot variable (même comportement).
  function estOutilActif(nom: string): boolean {
    switch (nom) {
      case "ui_localisation":
        return !!localisation;
      case "ui_recherche":
        return rechercheForcee;
      case "ui_formule":
        return editeurFormuleOuvert;
      case "ui_dessin":
        return canvasOuvert;
      default:
        return outilsForces.includes(nom);
    }
  }

  function executerActionOutil(nom: string) {
    switch (nom) {
      case "ui_localisation":
        toggleLocalisation();
        break;
      case "ui_recherche":
        setRechercheForcee((v) => !v);
        break;
      case "ui_formule":
        setEditeurFormuleOuvert((v) => !v);
        break;
      case "ui_dessin":
        setCanvasOuvert(true);
        break;
      default:
        setOutilsForces((prec) => (prec.includes(nom) ? prec.filter((o) => o !== nom) : [...prec, nom]));
    }
    enregistrerUtilisationOutil(nom);
  }

  // Une seule entrée pour l'instant (github) -- switch prêt à en accueillir
  // d'autres sans retoucher les slots/le menu.
  function executerActionAppli(nom: string) {
    switch (nom) {
      case "github":
        cliquerGithub();
        break;
    }
    enregistrerUtilisationAppli(nom);
  }

  // Clic en dehors du menu Outils -> fermeture (même pattern que
  // SidebarChat.tsx, demande de Bourama 25/07 : "il ne se ferme que
  // quand tu cliques sur le bouton"). mousedown (pas click) pour se
  // déclencher avant le onClick du bouton lui-même, exclu explicitement
  // pour éviter un double-toggle fermeture-puis-réouverture immédiate.
  useEffect(() => {
    if (!menuOutilsOuvert) return;
    function gererClicExterieur(e: MouseEvent) {
      const cible = e.target as Node;
      if (menuOutilsRef.current?.contains(cible)) return;
      if (boutonOutilsRef.current?.contains(cible)) return;
      setMenuOutilsOuvert(false);
    }
    document.addEventListener("mousedown", gererClicExterieur);
    return () => document.removeEventListener("mousedown", gererClicExterieur);
  }, [menuOutilsOuvert]);
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
  // Canvas de dessin (2026-07-25) -- géométrie/graphe/croquis, voir
  // CanvasDessin.tsx. Le résultat rejoint le même état `fichier` qu'un
  // upload classique (choisirFichier), donc suit exactement le même
  // chemin d'envoi/aperçu, aucun état séparé nécessaire pour l'envoi.
  const [canvasOuvert, setCanvasOuvert] = useState(false);
  // Éditeur de formule maths/chimie (2026-07-25) -- voir EditeurFormule.tsx.
  const [editeurFormuleOuvert, setEditeurFormuleOuvert] = useState(false);
  // Insertion live (2026-07-27, demande Bourama : "les symboles s'insèrent
  // automatiquement, pas de bouton insérer/effacer") -- plutôt qu'un clic
  // "Insérer" qui pousse le résultat final d'un coup, on garde la trace de
  // la portion de `texte` qui correspond à la formule en cours de
  // construction (`plageFormuleLive`), et on la remplace en entier à
  // chaque frappe dans le champ maths/chimie. `null` = rien en cours de
  // construction -- la prochaine frappe insère une nouvelle formule à la
  // position actuelle du curseur plutôt que d'en remplacer une existante.
  const [plageFormuleLive, setPlageFormuleLive] = useState<{ debut: number; fin: number } | null>(null);
  // OCR ciblé formule (2026-07-26, priorité maths de Bourama) -- image
  // jointe -> LaTeX extrait par Gemini -> ouvert dans EditeurFormule pour
  // relecture/correction avant insertion (jamais inséré tel quel sans
  // passage par l'éditeur, une transcription OCR peut se tromper).
  const [extractionFormuleEnCours, setExtractionFormuleEnCours] = useState(false);
  const [formuleInitiale, setFormuleInitiale] = useState<string | undefined>(undefined);

  async function extraireFormuleDeImage() {
    if (!fichier || extractionFormuleEnCours) return;
    setExtractionFormuleEnCours(true);
    try {
      const latex = await extraireFormuleImage(fichier);
      setFormuleInitiale(latex);
      setEditeurFormuleOuvert(true);
    } catch (e) {
      alert(e instanceof Error && e.message.includes("Aucune formule") ? "Aucune formule détectée dans cette image." : "Échec de l'extraction, réessaie.");
    } finally {
      setExtractionFormuleEnCours(false);
    }
  }
  const inputFichierRef = useRef<HTMLInputElement>(null);
  const zoneTexteRef = useRef<HTMLTextAreaElement>(null);
  const calqueRef = useRef<HTMLDivElement>(null);
  // Aperçu formules (2026-07-27, retour Bourama : l'aperçu restait figé
  // à son ancienne position de défilement -- en ajoutant des lignes, ce
  // qu'on venait de taper se retrouvait hors de la zone visible, donnant
  // l'impression que rien ne s'écrivait. Fait défiler automatiquement
  // vers le bas à chaque changement du texte, pour toujours montrer la
  // dernière ligne tapée.
  const apercuFormulesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (apercuFormulesRef.current) {
      apercuFormulesRef.current.scrollTop = apercuFormulesRef.current.scrollHeight;
    }
  }, [texte]);
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

  // Mise à jour live de la formule en construction (2026-07-27, "les
  // symboles s'insèrent automatiquement, pas de bouton insérer/effacer").
  // `contenuAffiche` est déjà le texte final ($...$) à placer -- si une
  // portion est déjà en cours de construction (plageFormuleLive), on la
  // remplace entièrement ; sinon on insère à la position actuelle du
  // curseur et on commence à la suivre. Ne touche jamais le focus/la
  // sélection du textarea -- le focus reste dans le champ MathLive/chimie
  // pendant que la personne tape, sans quoi chaque frappe lui volerait le
  // clavier.
  function mettreAJourFormuleLive(contenuAffiche: string) {
    if (plageFormuleLive) {
      const nouveauTexte = texte.slice(0, plageFormuleLive.debut) + contenuAffiche + texte.slice(plageFormuleLive.fin);
      setTexte(nouveauTexte);
      setPlageFormuleLive(contenuAffiche ? { debut: plageFormuleLive.debut, fin: plageFormuleLive.debut + contenuAffiche.length } : null);
    } else if (contenuAffiche) {
      const ref = pleinEcranSaisie ? zoneTextePleinEcranRef : zoneTexteRef;
      const el = ref.current;
      const debut = el?.selectionStart ?? texte.length;
      const fin = el?.selectionEnd ?? texte.length;
      const nouveauTexte = texte.slice(0, debut) + contenuAffiche + texte.slice(fin);
      setTexte(nouveauTexte);
      setPlageFormuleLive({ debut, fin: debut + contenuAffiche.length });
    }
    setFormuleInitiale(undefined);
    requestAnimationFrame(ajusterHauteurTexte);
  }

  // Arrête de suivre la portion en cours (changement d'onglet Maths<->
  // Chimie, ou fermeture du panneau) -- le texte déjà inséré reste tel
  // quel, mais une frappe suivante commencera une NOUVELLE formule
  // ailleurs plutôt que de continuer à réécrire par-dessus celle-ci.
  function finaliserFormuleLive() {
    setPlageFormuleLive(null);
  }

  function gererCollage(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const texteColleBrut = e.clipboardData.getData("text/plain");
    const langage = detecterLangageCode(texteColleBrut);

    // LaTeX (2026-07-27, corrige un conflit signalé par Bourama) : ne
    // part plus vers la pièce jointe "Formule collée" -- ça empêchait
    // l'aperçu en direct au-dessus du champ (segmenterTexteAvecFormules)
    // de jamais voir cette formule, puisqu'elle n'atteignait jamais
    // `texte`, les deux mécanismes se marchant dessus. Un collage LaTeX
    // s'insère maintenant normalement dans le champ, entouré de $$...$$
    // s'il ne l'était pas déjà, pour que l'aperçu le rende tout de suite.
    if (langage === "latex") {
      e.preventDefault();
      const contenuDelimite = /\$/.test(texteColleBrut) ? texteColleBrut : `$$${texteColleBrut.trim()}$$`;
      const ref = pleinEcranSaisie ? zoneTextePleinEcranRef : zoneTexteRef;
      const el = ref.current;
      const debut = el?.selectionStart ?? texte.length;
      const fin = el?.selectionEnd ?? texte.length;
      const nouveauTexte = texte.slice(0, debut) + contenuDelimite + texte.slice(fin);
      setTexte(nouveauTexte);
      requestAnimationFrame(() => {
        el?.focus();
        const pos = debut + contenuDelimite.length;
        el?.setSelectionRange(pos, pos);
        ajusterHauteurTexte();
      });
      return;
    }

    if (texteColleBrut.length > SEUIL_COLLAGE_LONG || langage) {
      e.preventDefault();
      setTexteColle(texteColleBrut);
      setLangageDetecte(langage);
    }
  }

  function envoyer() {
    if ((!texte.trim() && !texteColle) || desactive) return;
    onEnvoyer(texte, longueur, fichier, localisation, texteColle, rechercheForcee, outilsForces);
    setTexte("");
    choisirFichier(null);
    setLocalisation(null);
    setTexteColle(null);
    setLangageDetecte(null);
    setRechercheForcee(false);
    setOutilsForces([]);
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
                {/* OCR ciblé formule (2026-07-26) -- extrait le LaTeX de
                    l'image et l'ouvre dans EditeurFormule pour relecture
                    avant insertion, plutôt que d'envoyer l'image telle
                    quelle et espérer que Nucleos la lise correctement. */}
                <button
                  onClick={extraireFormuleDeImage}
                  disabled={extractionFormuleEnCours}
                  aria-label="Extraire la formule de cette image"
                  title="Extraire la formule"
                  className="absolute -bottom-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-dj-accent-1 text-white disabled:opacity-60"
                >
                  <Sigma size={11} className={extractionFormuleEnCours ? "animate-pulse" : ""} />
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
      <div className="relative rounded-3xl border border-dj-bordure bg-dj-surface-haute px-4 py-3 focus-within:border-dj-bordure-forte">
        {/* Aperçu formules (2026-07-27) -- affiché seulement si le
            brouillon contient au moins un "$", pour ne pas dupliquer
            inutilement un simple message texte sans maths. Placé
            au-dessus du textarea (demande explicite de Bourama), lecture
            seule, pas de curseur/sélection ici -- seulement pour
            visualiser le rendu final avant envoi. */}
        {texte.includes("$") && (
          <div
            ref={apercuFormulesRef}
            className="mb-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2 text-[15px] leading-relaxed text-dj-texte"
          >
            {segmenterTexteAvecFormules(texte).map((s, i) =>
              s.formule ? (
                <span key={i} dangerouslySetInnerHTML={{ __html: rendreFormuleKatex(s.texte, !!s.bloc) }} />
              ) : (
                <span key={i}>{s.texte}</span>
              )
            )}
          </div>
        )}
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

        {/* Éditeur maths/chimie fusionné (2026-07-27, demande Bourama :
            "plus de popup") -- s'ouvre SOUS le champ de texte, qui lui
            reste toujours en haut, fixe. Contrôlé par le seul bouton Σ
            de la barre d'outils ci-dessous (voir EditeurFormule.tsx pour
            le détail : onglets Maths/Chimie, champ MathLive + son
            clavier virtuel complet, palette chimie). */}
        {editeurFormuleOuvert && (
          <EditeurFormule
            onChangeLive={mettreAJourFormuleLive}
            onChangerOnglet={finaliserFormuleLive}
            onFermer={() => {
              setEditeurFormuleOuvert(false);
              setFormuleInitiale(undefined);
              finaliserFormuleLive();
            }}
            valeurInitiale={formuleInitiale}
          />
        )}

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

            {/* Slots variables "Outils" (2026-07-28, refonte demandée par
                Bourama) -- jusqu'à 3 raccourcis vers les derniers outils
                utilisés, qu'il s'agisse d'un outil backend forcé ou d'une
                des anciennes icônes autonomes (localisation, formule,
                recherche, dessin) qui vivent maintenant uniquement dans
                OUTILS_DISPONIBLES. Même comportement qu'un clic dans le
                menu Outils juste en dessous, sans avoir à l'ouvrir. */}
            {outilsRecents.map((nom) => {
              const entree = OUTILS_DISPONIBLES.find((o) => o.nom === nom);
              if (!entree) return null;
              const actif = estOutilActif(nom);
              return (
                <button
                  key={nom}
                  onClick={() => executerActionOutil(nom)}
                  disabled={nom === "ui_localisation" && localisationEnCours}
                  aria-label={entree.label}
                  title={entree.label}
                  className={
                    "animate-dj-fade-in-rapide " +
                    (actif ? "text-dj-texte transition-colors" : "text-dj-texte-muet transition-colors hover:text-dj-texte") +
                    " disabled:opacity-60"
                  }
                >
                  <entree.Icone size={18} />
                </button>
              );
            })}

            {/* Slot variable "Appli" (2026-07-28) -- 1 seul emplacement,
                pour la dernière appli utilisée (une seule existe pour
                l'instant : GitHub, voir APPLIS_DISPONIBLES). Cas GitHub
                traité à part pour conserver le sélecteur de dépôts déjà en
                place -- les futures applis passeront par executerActionAppli
                seul, sans dropdown dédié, tant qu'elles n'en ont pas besoin. */}
            {appliRecente === "github" && (
              <div className="relative" ref={selecteurRef}>
                <button
                  onClick={() => executerActionAppli("github")}
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
                  <div className="absolute bottom-full left-0 z-30 mb-2 max-h-64 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-dj-bordure bg-dj-surface-haute p-1 shadow-xl">
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
            )}

            {/* Bouton Outils (2026-07-25, multi-sélection depuis le 26/07) --
                icône FIXE (ne varie jamais) : ouvre la liste complète des
                outils, y compris les entrées "ui_" ci-dessus.
                sélection cumulative de PLUSIEURS outils pour le prochain
                message, voir OUTILS_DISPONIBLES en haut du fichier et
                core/mcp_tools.py:lister_tous_les_outils côté backend. */}
            <div className="relative">
              <button
                ref={boutonOutilsRef}
                onClick={() => setMenuOutilsOuvert((v) => !v)}
                aria-label={
                  outilsForces.length
                    ? `${outilsForces.length} outil(s) sélectionné(s) : ${outilsForces.join(", ")}`
                    : "Choisir un ou plusieurs outils"
                }
                title={
                  outilsForces.length
                    ? `${outilsForces.length} outil(s) sélectionné(s) : ${outilsForces.join(", ")}`
                    : "Choisir un ou plusieurs outils"
                }
                className={
                  "relative rounded-full p-1 transition-colors " +
                  (outilsForces.length || menuOutilsOuvert
                    ? "bg-dj-accent-1/10 text-dj-accent-1"
                    : "text-dj-texte-muet hover:text-dj-texte")
                }
              >
                <Wrench size={18} />
                {outilsForces.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-dj-accent-1 px-0.5 text-[9px] font-semibold leading-none text-white">
                    {outilsForces.length}
                  </span>
                )}
              </button>
              <div
                ref={menuOutilsRef}
                className={
                  "absolute bottom-full left-0 z-20 mb-2 w-72 max-w-[calc(100vw-2rem)] origin-bottom-left overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface shadow-lg transition-all duration-150 ease-out " +
                  (menuOutilsOuvert
                    ? "translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none translate-y-1 scale-95 opacity-0")
                }
              >
                {/* Barre d'onglets (2026-07-28, demande Bourama) -- voir
                    ONGLETS_OUTILS en haut du fichier. */}
                <div className="flex items-center gap-1 overflow-x-auto border-b border-dj-bordure px-1 pb-1 pt-1">
                  {ONGLETS_OUTILS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setOngletOutilActif(id)}
                      className={
                        "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors " +
                        (ongletOutilActif === id
                          ? "bg-dj-accent-1/10 text-dj-accent-1"
                          : "text-dj-texte-muet hover:text-dj-texte")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Hauteur FIXE (2026-07-28, demande Bourama : "la fenêtre
                    d'outils garde sa taille, pas en fonction de combien
                    d'outils à l'onglet") -- h-64, pas max-h-64 : ne rétrécit
                    plus pour un onglet avec peu d'entrées (ex. "Action dans
                    l'app" replié). Défilement interne si un onglet dépasse. */}
                <div className="h-64 overflow-y-auto p-1">
                  {/* Fondu à chaque changement d'onglet (2026-07-28, demande
                      Bourama : "rien ne doit s'afficher brut") -- `key`
                      force un remount du contenu à chaque clic d'onglet,
                      ce qui relance l'animation dj-fade-in-rapide. */}
                  <div key={ongletOutilActif} className="animate-dj-fade-in-rapide">
                  {ongletOutilActif === "action_app" ? (
                    // Onglet "Action dans l'app" (2026-07-28) -- groupé par
                    // appli (icône + nom, trié A→Z) plutôt qu'en liste plate ;
                    // clic sur une appli déplie ses actions liées en dessous,
                    // triées A→Z elles aussi. Accordéon à dépliage multiple.
                    [...APPLIS_DISPONIBLES]
                      .filter((a) => OUTILS_DISPONIBLES.some((o) => o.appli === a.nom))
                      .sort((a, b) => a.label.localeCompare(b.label, "fr"))
                      .map(({ nom: nomAppli, label: labelAppli, Icone: IconeAppli }) => {
                        const deplie = groupesAppliDeplies.includes(nomAppli);
                        const actionsAppli = OUTILS_DISPONIBLES.filter((o) => o.appli === nomAppli).sort((a, b) =>
                          a.label.localeCompare(b.label, "fr")
                        );
                        return (
                          <div key={nomAppli}>
                            <button
                              onClick={() => toggleGroupeAppli(nomAppli)}
                              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs text-dj-texte transition-colors hover:bg-dj-surface-haute"
                            >
                              <IconeAppli size={14} />
                              <span className="flex-1 font-medium">{labelAppli}</span>
                              <ChevronDown
                                size={13}
                                className={"transition-transform duration-200 ease-out " + (deplie ? "rotate-0" : "-rotate-90")}
                              />
                            </button>
                            {/* Glissement ouvert/fermé (2026-07-28, demande
                                Bourama) -- toujours monté (pas de retrait/
                                remontage conditionnel qui saccaderait), le
                                triplet grid-rows/opacity anime la hauteur en
                                douceur via la technique CSS grid-rows-[0fr →
                                1fr] (pas besoin de mesurer la hauteur en JS). */}
                            <div
                              className={
                                "grid transition-all duration-200 ease-out " +
                                (deplie ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
                              }
                            >
                              <div className="ml-3 overflow-hidden border-l border-dj-bordure pl-2">
                                {actionsAppli.map(({ nom, label, Icone }) => {
                                  const actif = estOutilActif(nom);
                                  return (
                                    <button
                                      key={nom}
                                      onClick={() => executerActionOutil(nom)}
                                      className={
                                        "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs transition-colors " +
                                        (actif ? "bg-dj-accent-1/10 text-dj-accent-1" : "text-dj-texte hover:bg-dj-surface-haute")
                                      }
                                    >
                                      <Icone size={14} />
                                      <span className="flex-1">{label}</span>
                                      {actif && <Check size={13} />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    [...OUTILS_DISPONIBLES]
                      .filter((o) => o.onglet === ongletOutilActif)
                      .sort((a, b) => a.label.localeCompare(b.label, "fr"))
                      .map(({ nom, label, Icone }) => {
                        const actif = estOutilActif(nom);
                        return (
                          <button
                            key={nom}
                            onClick={() => {
                              executerActionOutil(nom);
                              // Menu volontairement laissé ouvert (contrairement
                              // à l'ancienne sélection unique) : cumuler
                              // plusieurs outils demande plusieurs clics
                              // d'affilée sans rouvrir le menu à chaque fois.
                              // Les entrées "ui_" (localisation, formule,
                              // recherche, dessin) ferment quand même leur
                              // propre panneau/permission au clic, donc laisser
                              // le menu ouvert ne gêne pas.
                            }}
                            className={
                              "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs transition-colors " +
                              (actif ? "bg-dj-accent-1/10 text-dj-accent-1" : "text-dj-texte hover:bg-dj-surface-haute")
                            }
                          >
                            <Icone size={14} />
                            <span className="flex-1">{label}</span>
                            {actif && <Check size={13} />}
                          </button>
                        );
                      })
                  )}
                  </div>
                </div>
              </div>
            </div>

            {/* Icône Appli (2026-07-28) -- icône FIXE (ne varie jamais),
                pendante de l'icône Outils juste au-dessus : ouvre la liste
                complète des applis (nécessitant une connexion utilisateur),
                voir APPLIS_DISPONIBLES en haut du fichier. Une seule appli
                pour l'instant (GitHub), le menu est prêt à en accueillir
                d'autres sans changement. */}
            <div className="relative">
              <button
                ref={boutonAppliRef}
                onClick={() => setMenuAppliOuvert((v) => !v)}
                aria-label="Choisir une application"
                title="Choisir une application"
                className={
                  "relative rounded-full p-1 transition-colors " +
                  (menuAppliOuvert ? "bg-dj-accent-1/10 text-dj-accent-1" : "text-dj-texte-muet hover:text-dj-texte")
                }
              >
                <AppWindow size={18} />
              </button>
              <div
                ref={menuAppliRef}
                className={
                  "absolute bottom-full left-0 z-20 mb-2 max-h-72 w-56 origin-bottom-left overflow-y-auto rounded-2xl border border-dj-bordure bg-dj-surface p-1 shadow-lg transition-all duration-150 ease-out " +
                  (menuAppliOuvert
                    ? "translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none translate-y-1 scale-95 opacity-0")
                }
              >
                {[...APPLIS_DISPONIBLES]
                  .sort((a, b) => a.label.localeCompare(b.label, "fr"))
                  .map(({ nom, label, Icone }) => (
                  <button
                    key={nom}
                    onClick={() => {
                      executerActionAppli(nom);
                      setMenuAppliOuvert(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs text-dj-texte transition-colors hover:bg-dj-surface-haute"
                  >
                    <Icone size={14} />
                    <span className="flex-1">{label}</span>
                  </button>
                ))}
              </div>
            </div>

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

      {canvasOuvert && (
        <CanvasDessin
          onFermer={() => setCanvasOuvert(false)}
          onValider={(fichier) => {
            // Rejoint le pipeline "Joindre un fichier" existant -- le
            // dessin est traité en tout point comme une image uploadée
            // (aperçu + vision Gemini côté backend, aucun code séparé).
            choisirFichier(fichier);
            setCanvasOuvert(false);
          }}
        />
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

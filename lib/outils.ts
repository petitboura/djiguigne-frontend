import {
  MapPin,
  FileText,
  Search,
  Code,
  PenLine,
  FileSearch,
  Globe,
  Map,
  BookOpen,
  FileType,
  FileSpreadsheet,
  Presentation,
  FolderSearch,
  Package,
  Archive,
  Download,
  Image as IconImage,
  Rocket,
  Bell,
  FolderTree,
  FileCode,
  Edit3,
  Sigma,
  AudioLines,
  Github,
  Calculator,
} from "lucide-react";

// Extrait de components/chat/BarreDeSaisie.tsx le 01/08 (Bourama : "est-ce
// que ça varie en fonction de quel outil est ajouté ou enlevé" --
// app/dashboard/applications/page.tsx dupliquait cette liste à la main,
// donc désynchronisée dès qu'un outil/appli est ajouté ou enlevé ici).
// Source UNIQUE désormais pour BarreDeSaisie.tsx, BulleMessage.tsx,
// OutilResultatBulle.tsx et app/dashboard/applications/page.tsx -- ne
// jamais redéfinir ces listes ailleurs, toujours importer d'ici.
//
// Classement en onglets (2026-07-28, demande Bourama) :
// - "generer" -> Générer
// - "rechercher" -> Rechercher / Explorer
// - "action_app" -> Action dans l'app -- outils qui passent par un service
//   tiers CONNECTÉ (GitHub, Notion) ; le champ `appli` (nom d'une entrée
//   de APPLIS_DISPONIBLES) les regroupe sous l'icône+nom de leur appli
//   dans cet onglet, en accordéon.
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
  // Notion activé à 100% côté backend (01/08, demande Bourama, voir
  // registre_outils.py) -- seul notion-search est un vrai outil LLM ici,
  // les 9 autres outils de lecture (notion-fetch, notion-get-comments...)
  // et les 10 d'écriture (notion-create-pages...) restent utilisables par
  // le modèle (au choix du LLM une fois le tool-calling actif) mais n'ont
  // pas chacun leur propre icône dans cette barre -- seul le point d'entrée
  // "rechercher" est exposé ici, cohérent avec le sélecteur de page
  // ci-dessous qui sert à donner un contexte, pas à naviguer tout Notion.
  { nom: "notion-search", label: "Rechercher dans Notion", Icone: BookOpen, onglet: "action_app", appli: "notion" },

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
  // estOutilActif/executerActionOutil dans BarreDeSaisie.tsx, qui
  // interceptent ce préfixe au lieu de pousser vers `outilsForces` (backend).
  { nom: "ui_localisation", label: "Joindre ma position", Icone: MapPin, onglet: "utilitaires" },
  { nom: "ui_formule", label: "Insérer une formule / réaction chimique", Icone: Sigma, onglet: "utilitaires" },
  // Éditeur riche à part (01/08, demande Bourama : "un vrai éditeur latex
  // live, comme barre de saisie à part, pas touche au clavier existant")
  // -- distinct de ui_formule ci-dessus (popup une seule formule) : un
  // vrai document TipTap mélangeant texte et plusieurs formules live à la
  // suite, voir components/chat/EditeurMathsRiche.tsx.
  { nom: "ui_editeur_maths", label: "Éditeur maths live (texte + formules)", Icone: Calculator, onglet: "utilitaires" },
  { nom: "ui_recherche", label: "Forcer une recherche web", Icone: Search, onglet: "utilitaires" },
  { nom: "ui_dessin", label: "Dessiner (géométrie, graphe, croquis)", Icone: PenLine, onglet: "utilitaires" },
  // Retiré de la barre comme bouton dédié le 28/07 (Bourama) : n'était
  // pas branché ("Pas disponible pour le moment" au clic), déplacé ici
  // en attendant une vraie implémentation.
  { nom: "ui_mode_vocal", label: "Mode vocal (bientôt disponible)", Icone: AudioLines, onglet: "utilitaires" },
];

export const ONGLETS_OUTILS: { id: OngletOutil; label: string }[] = [
  { id: "generer", label: "Générer" },
  { id: "rechercher", label: "Rechercher / Explorer" },
  { id: "action_app", label: "Action dans l'app" },
  { id: "utilitaires", label: "Utilitaires" },
];

// Liste "Appli" (2026-07-28) -- pendant symétrique à OUTILS_DISPONIBLES,
// mais réservée à ce qui nécessite une connexion/authentification
// utilisateur (OAuth, session tierce...). Notion ajouté le 01/08 (deuxième
// entrée) -- la structure était déjà prête à en accueillir d'autres sans
// retoucher la logique de récence/slot variable de BarreDeSaisie.tsx. Sert
// aussi de source pour les en-têtes de groupe (icône + nom) de l'onglet
// "Action dans l'app" ci-dessus, via le champ `appli` des entrées de
// OUTILS_DISPONIBLES -- et pour app/dashboard/applications/page.tsx (liste
// des applis connectables).
export const APPLIS_DISPONIBLES: { nom: string; label: string; Icone: typeof Github }[] = [
  { nom: "github", label: "GitHub", Icone: Github },
  { nom: "notion", label: "Notion", Icone: BookOpen },
];

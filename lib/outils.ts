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
  Divide,
  Paperclip,
  FilePlus,
  Move,
  Copy,
  Database,
  Settings2,
  MessageSquare,
  MessagesSquare,
  Clock,
  Users,
  UserCog,
  Table2,
  LayoutGrid,
  StickyNote,
  PanelsTopLeft,
  SlidersHorizontal,
} from "lucide-react";
import { IconeNotion } from "@/components/icons/IconeNotion";

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
  { nom: "calculer_symbolique", label: "Calcul symbolique (résoudre, dériver, intégrer)", Icone: Divide, onglet: "generer" },

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
  // registre_outils.py) -- une icône PAR outil désormais (01/08, demande
  // Bourama : "regarde comment pour github ça fonctionne"), même
  // granularité 1:1 que les 3 entrées GitHub ci-dessus, plutôt qu'un
  // point d'entrée unique. Sans ça, le bouton Outils ne pouvait jamais
  // envoyer au LLM que notion-search : une entrée = un vrai nom d'outil
  // du serveur MCP Notion (voir liste dans core/registre_outils.py),
  // c'est cette correspondance exacte qui rend l'outil sélectionnable.
  { nom: "notion-search", label: "Rechercher dans Notion", Icone: IconeNotion, onglet: "action_app", appli: "notion" },
  { nom: "notion-fetch", label: "Ouvrir une page/base Notion", Icone: FileSearch, onglet: "action_app", appli: "notion" },
  { nom: "notion-query-data-sources", label: "Interroger une base Notion (SQL)", Icone: Table2, onglet: "action_app", appli: "notion" },
  { nom: "notion-query-database-view", label: "Interroger une vue Notion", Icone: LayoutGrid, onglet: "action_app", appli: "notion" },
  { nom: "notion-query-meeting-notes", label: "Chercher dans mes notes de réunion", Icone: StickyNote, onglet: "action_app", appli: "notion" },
  { nom: "notion-get-comments", label: "Lire les commentaires Notion", Icone: MessagesSquare, onglet: "action_app", appli: "notion" },
  { nom: "notion-get-async-task", label: "Suivre une tâche Notion en cours", Icone: Clock, onglet: "action_app", appli: "notion" },
  { nom: "notion-get-teams", label: "Lister les équipes Notion", Icone: Users, onglet: "action_app", appli: "notion" },
  { nom: "notion-get-users", label: "Lister les utilisateurs Notion", Icone: UserCog, onglet: "action_app", appli: "notion" },
  { nom: "notion-download-attachment", label: "Télécharger une pièce jointe Notion", Icone: Download, onglet: "action_app", appli: "notion" },
  { nom: "notion-create-pages", label: "Créer une page Notion", Icone: FilePlus, onglet: "action_app", appli: "notion" },
  { nom: "notion-update-page", label: "Modifier une page Notion", Icone: Edit3, onglet: "action_app", appli: "notion" },
  { nom: "notion-move-pages", label: "Déplacer une page Notion", Icone: Move, onglet: "action_app", appli: "notion" },
  { nom: "notion-duplicate-page", label: "Dupliquer une page Notion", Icone: Copy, onglet: "action_app", appli: "notion" },
  { nom: "notion-create-database", label: "Créer une base Notion", Icone: Database, onglet: "action_app", appli: "notion" },
  { nom: "notion-update-data-source", label: "Modifier le schéma d'une base Notion", Icone: Settings2, onglet: "action_app", appli: "notion" },
  { nom: "notion-create-comment", label: "Commenter dans Notion", Icone: MessageSquare, onglet: "action_app", appli: "notion" },
  { nom: "notion-create-attachment", label: "Joindre un fichier dans Notion", Icone: Paperclip, onglet: "action_app", appli: "notion" },
  { nom: "notion-create-view", label: "Créer une vue Notion", Icone: PanelsTopLeft, onglet: "action_app", appli: "notion" },
  { nom: "notion-update-view", label: "Modifier une vue Notion", Icone: SlidersHorizontal, onglet: "action_app", appli: "notion" },

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

// "utilitaires" retiré de cette liste le 01/08 (demande Bourama : "les
// utilitaires seront un autre bouton à part, plus dans outils") -- ces 9
// entrées (onglet: "utilitaires" dans OUTILS_DISPONIBLES ci-dessus)
// n'apparaissent donc plus comme onglet du menu Outils, mais sont
// rendues par leur propre bouton dédié dans BarreDeSaisie.tsx (filtre
// direct sur onglet === "utilitaires", pas besoin de les retirer du
// type OngletOutil ni de OUTILS_DISPONIBLES, qui restent la source
// unique partagée avec BulleMessage.tsx / OutilResultatBulle.tsx /
// app/dashboard/applications/page.tsx).
export const ONGLETS_OUTILS: { id: OngletOutil; label: string }[] = [
  { id: "generer", label: "Générer" },
  { id: "rechercher", label: "Rechercher / Explorer" },
  { id: "action_app", label: "Action dans l'app" },
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
  // BookOpen (icône générique) remplacée par le vrai logo Notion (01/08,
  // demande Bourama) -- même logique que Github juste au-dessus : le
  // trait suit la couleur du bouton (text-dj-accent-1 / text-dj-texte-muet),
  // jamais une couleur de marque figée. Voir components/icons/IconeNotion.tsx.
  { nom: "notion", label: "Notion", Icone: IconeNotion },
];

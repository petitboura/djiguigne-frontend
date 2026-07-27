import { FileText, FileSpreadsheet, Presentation, FileArchive, FileJson, FileCode, Image, Box, File, Download } from "lucide-react";
import { BlocExpansible } from "./BlocExpansible";

const EXTENSIONS_FICHIER: Record<string, { icone: typeof File; libelle: string }> = {
  pdf: { icone: FileText, libelle: "PDF" },
  doc: { icone: FileText, libelle: "Word" },
  docx: { icone: FileText, libelle: "Word" },
  xls: { icone: FileSpreadsheet, libelle: "Excel" },
  xlsx: { icone: FileSpreadsheet, libelle: "Excel" },
  csv: { icone: FileSpreadsheet, libelle: "CSV" },
  ppt: { icone: Presentation, libelle: "PowerPoint" },
  pptx: { icone: Presentation, libelle: "PowerPoint" },
  // Archives (bundles, code, sites générés en zip -- voir
  // core/generation_code.py, generation_archives.py, generation_site.py)
  zip: { icone: FileArchive, libelle: "Archive ZIP" },
  // Données structurées (voir generation_donnees.py)
  json: { icone: FileJson, libelle: "JSON" },
  xml: { icone: FileCode, libelle: "XML" },
  // Images en lien direct, pas en syntaxe markdown ![]() -- ce second cas
  // passe déjà par le renderer `img` de BulleMessage.tsx, pas par ici
  // (voir generation_images.py)
  png: { icone: Image, libelle: "Image" },
  jpg: { icone: Image, libelle: "Image" },
  jpeg: { icone: Image, libelle: "Image" },
  webp: { icone: Image, libelle: "Image" },
  // Modèles 3D (voir generation_3d.py). L'audio (mp3/wav) et la vidéo
  // (mp4/webm) ne sont volontairement PAS ici : LecteurMedia.tsx (voir
  // typeMedia() dans BulleMessage.tsx) les intercepte avant d'arriver
  // jusqu'ici, un ajout ici serait du code mort.
  glb: { icone: Box, libelle: "Modèle 3D" },
  // LaTeX (voir core/generation_latex.py) -- sans cette entrée, le lien
  // retombait dans le cas générique LinkPreview (aperçu de lien web),
  // qui n'a aucune métadonnée à afficher pour un fichier .tex brut, d'où
  // le rendu cassé repéré par Bourama en test réel le 27/07.
  tex: { icone: FileCode, libelle: "LaTeX" },
};

// Détecte si un lien markdown pointe vers un fichier "document" (PDF,
// Word, Excel, PowerPoint...) via son extension d'URL, et si oui le
// remplace par une carte fichier au lieu d'un <a> souligné brut. Le
// composant `a` custom dans BulleMessage.tsx appelle `extensionFichier()`
// et bascule vers ce composant quand elle correspond, sinon rend le lien
// normal -- pas de régression sur les liens web classiques.
export function extensionFichier(href: string): string | null {
  const match = href.split("?")[0].match(/\.([a-zA-Z0-9]+)$/);
  const ext = match?.[1]?.toLowerCase();
  return ext && ext in EXTENSIONS_FICHIER ? ext : null;
}

export function FichierChip({ href, nom }: { href: string; nom: string }) {
  const infos = extensionFichier(href);
  const { icone: Icone, libelle } = infos ? EXTENSIONS_FICHIER[infos] : { icone: File, libelle: "Fichier" };

  // PDF : seul format ici qu'un navigateur sait rendre nativement en
  // iframe sans lib supplémentaire -- se déroule dans le fil comme le
  // code et les widgets (voir BlocExpansible.tsx). Plus de panneau
  // latéral (retiré, 2026-07-20, demande de Bourama).
  if (infos === "pdf") {
    return (
      <BlocExpansible
        titre={nom}
        icone={Icone}
        sousTitre={libelle}
        hrefTelechargement={href}
        enfant={<iframe src={href} className="h-[70vh] w-full rounded-lg border border-dj-bordure" title={nom} />}
      />
    );
  }

  // Word/Excel/PowerPoint/zip/JSON/XML/images-en-lien/3D : pas de viewer
  // natif de navigateur -- carte téléchargement seule, comme avant.
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="my-2 flex w-fit max-w-full animate-dj-fade-in items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2.5 no-underline transition-colors hover:border-dj-bordure-forte"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-dj-gradient text-[#1A0D02]">
        <Icone size={16} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm text-dj-texte">{nom}</span>
        <span className="block text-[11px] text-dj-texte-muet">{libelle}</span>
      </span>
      <Download size={14} className="ml-1 shrink-0 text-dj-texte-muet" />
    </a>
  );
}

import type { ComponentType, SVGProps } from "react";

// Jeu d'icônes dessinées à la main pour Djiguignè (pivot identité visuelle,
// 2026-08-08, décision Bourama). Remplace lucide-react comme source des
// icônes de boutons et de fonctionnalités. Même interface (size, className,
// props SVG standards) pour un remplacement par simple changement d'import,
// sans toucher au JSX existant. Généré depuis icones/generer.py, ne pas
// éditer les tracés à la main ici, régénérer depuis le script si besoin.

type IconeProps = SVGProps<SVGSVGElement> & { size?: number };

// Alias de compatibilité : certains composants typent leurs propres props
// avec ces noms (hérités de lucide-react) pour accepter n'importe laquelle
// de nos icônes en paramètre.
export type LucideProps = IconeProps;
export type LucideIcon = ComponentType<IconeProps>;

function creerIcone(chemins: string[]) {
  function Icone({ size = 24, ...props }: IconeProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {chemins.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    );
  }
  return Icone;
}

export const AlertTriangle = creerIcone([
  "M 11.1 3.7 L 2.9 19.2 L 21.1 20.8 L 13.0 2.1",
  "M 11.9 8.6 L 12.9 13.4",
  "M 12.2 16.2 L 11.2 18.0",
]);

export const AppWindow = creerIcone([
  "M 2.0 6.0 L 22.0 4.0 L 20.1 19.8 L 3.6 18.4 L 2.6 5.3",
  "M 2.2 9.5 L 21.0 9.3",
  "M 6.8 7.4 L 5.2 6.7",
  "M 8.0 8.0 L 10.0 6.0",
]);

export const Archive = creerIcone([
  "M 2.7 4.0 L 21.8 3.4 L 20.0 9.0 L 3.8 7.1 L 2.7 4.5",
  "M 6.0 7.8 L 4.0 20.2 L 20.0 19.8 L 18.0 8.1",
  "M 10.9 12.0 L 13.2 11.8",
]);

export const ArrowLeft = creerIcone([
  "M 19.8 12.4 L 4.8 11.1",
  "M 11.9 17.2 L 6.0 11.3 L 12.0 5.4",
]);

export const ArrowUp = creerIcone([
  "M 11.8 18.8 L 12.9 4.3",
  "M 5.2 11.7 L 11.3 5.8 L 18.6 10.4",
]);

export const AudioLines = creerIcone([
  "M 3.4 12.9 L 3.3 14.9",
  "M 7.3 7.2 L 7.2 18.5",
  "M 10.7 3.8 L 10.4 22.1",
  "M 16.0 7.4 L 14.1 18.0",
  "M 18.8 9.6 L 19.1 16.4",
  "M 22.6 12.6 L 21.8 13.1",
]);

export const Bell = creerIcone([
  "M 5.1 10.9 L 6.2 13.7 L 5.0 17.0 L 20.3 17.8 L 17.1 14.9 L 17.3 10.7 L 12.5 4.5 L 7.0 9.1",
  "M 11.0 19.5 L 13.0 20.7",
]);

export const BookOpen = creerIcone([
  "M 11.6 6.9 L 3.2 6.0 L 4.8 17.5 L 12.3 19.3 L 19.0 18.9 L 20.4 5.1 L 12.8 6.0",
  "M 11.3 7.4 L 12.2 19.5",
]);

export const Bot = creerIcone([
  "M 9.0 5.0 L 8.7 7.9",
  "M 6.9 7.2 L 17.5 6.4 L 18.1 18.9 L 6.4 17.0 L 5.2 7.8",
  "M 8.0 12.5 L 9.2 13.2",
  "M 15.9 10.6 L 15.3 14.1",
  "M 8.7 15.9 L 15.1 15.4",
  "M 2.6 10.6 L 1.2 14.8",
  "M 23.0 9.5 L 21.0 14.6",
]);

export const Box = creerIcone([
  "M 3.4 7.9 L 12.5 2.1 L 20.0 7.2 L 21.6 17.7 L 12.3 20.0 L 2.1 17.4 L 3.8 7.5",
  "M 2.0 8.0 L 11.1 11.9 L 20.3 7.8",
  "M 12.6 11.7 L 11.3 20.4",
]);

export const Brain = creerIcone([
  "M 11.0 5.0 L 7.8 4.3 L 5.8 6.2 L 5.8 9.1 L 2.8 12.1 L 4.0 15.0 L 4.5 17.6 L 8.6 19.5 L 13.0 19.0 L 12.1 3.8",
  "M 11.6 3.9 L 15.0 5.0 L 19.2 7.2 L 20.0 9.0 L 20.9 11.6 L 18.0 14.9 L 19.0 17.5 L 17.0 19.2 L 12.2 19.4",
  "M 11.5 4.3 L 11.6 20.6",
]);

export const BrainCog = creerIcone([
  "M 11.4 4.3 L 7.1 5.0 L 4.9 7.4 L 5.9 9.3 L 3.7 11.1 L 4.6 14.0 L 4.0 17.9 L 7.6 20.7 L 12.7 19.6 L 12.9 3.0",
  "M 11.9 3.5 L 15.0 4.8 L 18.8 7.7 L 20.0 9.3 L 21.4 11.2 L 18.1 14.5 L 18.4 17.9 L 16.7 19.7 L 12.7 19.0",
  "M 12.3 3.2 L 12.9 19.6",
  "M 23.7 11.3 L 21.8 14.6 L 20.9 15.2 L 20.2 13.0 L 18.4 11.4 L 18.2 11.0 L 21.1 9.9 L 23.8 9.3 L 23.4 11.6",
]);

export const Briefcase = creerIcone([
  "M 3.1 7.4 L 20.1 9.0 L 21.8 18.7 L 3.2 18.3 L 2.0 8.9",
  "M 7.0 9.0 L 8.4 4.6 L 16.4 4.6 L 15.1 8.9",
]);

export const Building2 = creerIcone([
  "M 4.0 20.5 L 4.5 3.1 L 13.2 3.4 L 15.0 20.2",
  "M 13.2 10.7 L 20.9 9.0 L 20.1 21.2",
  "M 6.0 8.0 L 8.0 6.0",
  "M 7.5 11.8 L 6.5 10.2",
  "M 6.0 16.0 L 7.9 14.1",
  "M 10.0 8.0 L 10.1 8.0",
  "M 11.0 10.4 L 11.6 11.0",
  "M 11.1 14.3 L 11.9 14.0",
]);

export const Calculator = creerIcone([
  "M 5.8 3.4 L 18.6 2.3 L 19.0 22.0 L 5.4 20.0 L 4.2 3.8",
  "M 6.7 6.0 L 17.9 5.2 L 16.2 11.0 L 7.0 9.7 L 7.8 5.4",
  "M 9.1 14.9 L 9.7 14.6 L 10.2 14.1 L 9.6 14.1 L 8.2 14.6 L 7.1 14.9 L 7.4 14.2 L 8.8 12.9 L 10.2 12.1 L 10.6 12.6 L 9.8 14.2",
  "M 13.3 14.5 L 14.2 14.0 L 14.3 14.0 L 13.0 14.8 L 11.5 15.4 L 11.1 14.8 L 12.2 13.2 L 13.6 12.1 L 14.0 12.5 L 13.4 13.9 L 13.0 15.0",
  "M 19.0 13.7 L 18.2 13.6 L 16.6 14.7 L 15.8 15.8 L 16.4 15.4 L 17.0 13.6 L 16.5 12.4 L 15.9 12.8 L 16.5 13.9 L 18.1 14.1 L 19.0 13.6",
  "M 10.1 17.3 L 9.1 18.7 L 8.3 19.8 L 8.0 19.9 L 8.3 19.1 L 8.8 17.7 L 9.2 16.5 L 9.2 16.1 L 9.0 16.7 L 8.9 17.9 L 9.1 19.0",
  "M 14.0 19.0 L 14.7 19.0 L 14.1 18.4 L 12.6 18.0 L 11.3 18.2 L 11.2 18.6 L 12.3 18.4 L 13.6 17.4 L 14.1 16.4 L 13.6 16.4 L 13.1 17.7",
  "M 18.3 17.2 L 17.2 18.6 L 16.3 19.8 L 16.2 19.9 L 16.6 18.9 L 17.0 17.4 L 16.9 16.4 L 16.5 16.6 L 16.4 17.5 L 17.0 18.4 L 18.0 18.7",
]);

export const Check = creerIcone([
  "M 5.9 12.6 L 9.9 17.7 L 18.7 7.0",
]);

export const CheckCircle2 = creerIcone([
  "M 4.2 13.0 L 9.9 16.3 L 20.0 5.1",
  "M 20.7 11.8 L 20.1 14.5 L 18.9 17.0 L 17.4 19.1 L 15.5 20.7 L 13.4 21.7 L 11.3 21.9 L 9.3 21.5 L 7.5 20.3 L 6.0 18.5 L 4.8 16.3 L 4.2 13.8 L 4.0 11.2 L 4.3 8.7 L 5.1 6.5 L 6.3 4.7 L 7.8 3.5 L 9.6 2.8 L 11.6 2.9 L 13.7 3.5 L 15.6 4.8 L 17.4 6.4 L 18.8 8.5 L 19.9 10.7 L 20.4 12.9",
]);

export const ChevronDown = creerIcone([
  "M 6.9 8.1 L 12.2 16.2 L 17.0 9.6",
]);

export const ChevronLeft = creerIcone([
  "M 15.4 6.9 L 8.0 12.9 L 14.0 18.2",
]);

export const ChevronRight = creerIcone([
  "M 8.8 17.7 L 16.4 11.0 L 9.7 5.7",
]);

export const ChevronUp = creerIcone([
  "M 17.2 15.6 L 12.9 7.5 L 6.1 15.2",
]);

export const ChevronsLeft = creerIcone([
  "M 15.2 7.0 L 7.7 12.7 L 14.1 17.7",
  "M 20.4 6.8 L 12.5 12.2 L 20.4 17.0",
]);

export const ChevronsRight = creerIcone([
  "M 9.5 17.1 L 16.1 11.0 L 9.7 5.0",
  "M 4.7 18.5 L 9.7 12.8 L 3.4 5.4",
]);

export const ChevronsUpDown = creerIcone([
  "M 17.3 15.4 L 11.2 9.1 L 5.1 15.7",
  "M 5.5 13.0 L 12.7 18.6 L 18.9 12.3",
]);

export const Clock = creerIcone([
  "M 20.1 11.9 L 18.8 16.3 L 16.3 19.6 L 13.3 21.2 L 10.2 20.6 L 7.4 18.3 L 5.3 14.8 L 4.3 11.0 L 4.5 7.7 L 6.1 5.5 L 9.1 4.5 L 13.0 4.7 L 16.9 6.1 L 20.0 8.4 L 21.4 11.4",
  "M 12.9 7.2 L 11.3 13.4 L 15.4 13.9",
]);

export const Code = creerIcone([
  "M 8.6 6.0 L 4.0 11.2 L 8.3 18.9",
  "M 15.4 6.9 L 20.1 12.5 L 14.5 17.2",
]);

export const Contact = creerIcone([
  "M 4.5 4.8 L 19.5 3.2 L 20.4 20.8 L 3.6 19.2 L 4.4 4.9",
  "M 13.7 10.6 L 14.3 11.0 L 13.7 11.3 L 11.7 11.9 L 9.4 12.1 L 8.6 10.9 L 9.9 8.6 L 12.1 6.8 L 13.6 6.9 L 13.8 8.9 L 13.4 11.0",
  "M 9.0 16.3 L 8.0 15.7 L 16.0 14.3 L 15.0 17.7",
]);

export const Copy = creerIcone([
  "M 8.9 3.8 L 17.1 5.0 L 18.7 14.6",
  "M 6.5 7.0 L 5.4 21.0 L 15.7 19.0 L 14.2 9.0 L 6.9 7.0",
]);

export const Database = creerIcone([
  "M 2.9 5.0 L 2.8 19.2",
  "M 21.7 4.5 L 21.4 17.6",
  "M 11.3 6.0 L 11.4 6.3 L 10.1 6.5 L 7.4 6.8 L 3.7 7.4 L -0.4 7.9 L -4.0 8.0 L -6.3 7.5 L -6.8 6.2 L -5.4 4.5 L -2.8 3.0 L 0.5 2.2 L 3.8 2.3 L 6.6 3.1 L 8.8 4.4 L 10.3 5.5 L 11.1 6.3",
  "M 3.3 10.5 L 6.8 10.3 L 11.2 12.0 L 18.8 10.2 L 19.2 10.6",
  "M 3.6 15.1 L 6.7 15.3 L 11.1 17.3 L 19.0 14.8 L 19.1 16.0",
]);

export const Divide = creerIcone([
  "M 6.8 12.4 L 17.0 12.1",
  "M 14.2 5.6 L 12.5 6.9 L 11.1 8.6 L 11.4 8.0 L 11.6 5.7 L 10.8 5.0 L 11.0 6.0 L 13.2 6.2 L 14.3 5.7",
  "M 13.3 18.5 L 13.9 18.5 L 12.1 17.8 L 10.1 18.2 L 10.4 18.5 L 12.0 16.9 L 12.4 15.3 L 12.1 16.1 L 12.7 18.3",
]);

export const Download = creerIcone([
  "M 12.8 3.3 L 11.2 14.8",
  "M 6.2 10.9 L 11.7 16.0 L 17.3 10.8",
  "M 4.0 20.0 L 18.9 19.1",
]);

export const Edit3 = creerIcone([
  "M 17.9 3.2 L 21.3 6.0 L 8.0 19.2 L 4.0 20.9 L 6.0 14.5 L 16.6 2.2",
]);

export const Eraser = creerIcone([
  "M 19.4 20.9 L 6.8 21.0",
  "M 4.7 15.5 L 15.0 3.0 L 20.3 10.9 L 11.0 20.7 L 3.3 14.5",
]);

export const ExternalLink = creerIcone([
  "M 14.6 3.0 L 20.9 3.6 L 19.9 10.8",
  "M 20.3 4.9 L 11.3 12.0",
  "M 19.4 14.8 L 18.7 19.1 L 4.1 21.0 L 4.1 4.0 L 9.8 6.0",
]);

export const Eye = creerIcone([
  "M 2.9 11.2 L 5.6 6.5 L 17.1 7.9 L 22.6 12.3 L 18.7 16.0 L 5.3 16.9 L 1.4 13.0",
  "M 14.2 13.0 L 14.5 13.9 L 12.6 13.4 L 9.8 12.8 L 8.9 12.3 L 10.5 11.4 L 13.0 10.1 L 14.1 9.6 L 13.6 11.2",
]);

export const File = creerIcone([
  "M 6.6 2.0 L 13.0 3.8 L 18.9 6.6 L 17.5 20.8 L 5.9 21.8 L 6.6 2.0",
  "M 14.5 3.8 L 13.5 7.9 L 17.0 7.1",
]);

export const FileArchive = creerIcone([
  "M 5.7 2.8 L 13.1 4.0 L 18.4 7.1 L 18.9 20.0 L 5.4 21.1 L 5.2 4.0",
  "M 13.8 2.6 L 13.6 6.9 L 17.4 7.2",
  "M 11.2 9.7 L 11.0 11.5",
  "M 13.0 11.5 L 11.2 14.4",
  "M 12.9 15.2 L 12.5 17.2",
  "M 10.8 16.7 L 11.9 18.0 L 12.1 19.5 L 12.8 19.3",
]);

export const FileCode = creerIcone([
  "M 6.9 3.1 L 14.2 2.0 L 17.0 7.5 L 18.4 21.7 L 6.8 20.1 L 5.2 2.8",
  "M 15.0 2.7 L 14.5 7.6 L 17.5 8.0",
  "M 9.5 11.1 L 8.8 12.5 L 10.6 15.8",
  "M 14.0 12.0 L 15.1 13.9 L 13.2 15.4",
]);

export const FileJson = creerIcone([
  "M 6.7 2.0 L 13.0 3.5 L 18.4 7.4 L 18.5 20.0 L 5.0 21.8 L 6.7 3.1",
  "M 13.7 3.0 L 13.3 7.5 L 17.1 7.8",
  "M 8.9 9.5 L 7.1 12.0 L 8.7 12.9 L 7.5 12.6 L 7.0 14.7 L 8.1 16.5 L 9.9 16.0",
  "M 14.1 10.8 L 15.4 11.8 L 16.7 12.5 L 17.8 12.6 L 15.6 14.2 L 15.0 17.0 L 15.1 17.1",
]);

export const FilePlus = creerIcone([
  "M 5.2 3.8 L 14.7 2.3 L 18.6 6.4 L 17.1 21.9 L 5.7 21.2 L 7.0 2.0",
  "M 13.6 3.2 L 13.2 7.6 L 17.0 7.9",
  "M 11.4 11.4 L 12.4 16.8",
  "M 9.7 13.0 L 14.9 14.8",
]);

export const FileSearch = creerIcone([
  "M 5.4 3.4 L 15.0 2.1 L 17.1 7.9 L 18.3 20.5 L 6.4 20.8 L 5.1 3.8",
  "M 13.3 3.6 L 13.2 7.8 L 17.1 7.9",
  "M 12.9 12.0 L 11.5 13.9 L 9.7 15.7 L 8.6 16.2 L 8.4 14.9 L 8.7 12.6 L 8.9 10.7 L 9.1 10.2 L 9.8 11.2 L 11.0 12.6 L 12.4 13.7",
  "M 12.2 15.3 L 13.5 17.9",
]);

export const FileSpreadsheet = creerIcone([
  "M 6.2 4.0 L 14.5 2.1 L 17.1 7.5 L 19.0 21.1 L 5.3 20.3 L 6.2 4.0",
  "M 13.3 3.3 L 14.9 6.0 L 18.2 7.2",
  "M 9.0 10.5 L 15.1 11.8",
  "M 8.8 13.0 L 15.0 14.7",
  "M 7.2 17.8 L 15.6 17.3",
  "M 11.2 10.2 L 11.8 19.7",
]);

export const FileText = creerIcone([
  "M 5.7 2.8 L 13.7 3.7 L 18.8 6.0 L 17.0 21.9 L 6.8 20.5 L 5.7 2.9",
  "M 13.1 3.9 L 13.1 7.9 L 17.1 7.9",
  "M 10.0 11.3 L 14.5 13.0",
  "M 9.8 14.5 L 15.7 14.5",
  "M 8.7 9.0 L 11.7 8.5",
]);

export const FileType = creerIcone([
  "M 6.5 3.8 L 14.8 2.2 L 17.2 6.5 L 17.5 21.9 L 6.9 21.2 L 6.2 2.0",
  "M 14.8 2.1 L 14.6 7.3 L 17.2 8.0",
  "M 8.1 11.9 L 16.0 10.0",
  "M 12.1 12.0 L 12.5 17.8",
  "M 9.8 16.6 L 13.7 17.8",
]);

export const FileUp = creerIcone([
  "M 5.3 3.6 L 14.9 2.0 L 18.0 7.1 L 17.1 21.9 L 6.7 20.2 L 6.4 2.7",
  "M 8.1 12.8 L 11.5 9.3 L 15.2 11.6",
  "M 11.5 9.1 L 13.0 16.1",
]);

export const FlaskConical = creerIcone([
  "M 9.8 3.2 L 9.1 9.0 L 3.1 20.7 L 20.8 20.3 L 15.1 9.0 L 14.1 3.6",
  "M 7.9 2.5 L 16.5 3.0",
  "M 7.9 15.0 L 16.0 15.4",
]);

export const FolderSearch = creerIcone([
  "M 2.1 6.9 L 9.7 5.2 L 11.3 7.7 L 19.0 9.0 L 20.5 17.5 L 3.6 17.4 L 2.0 7.0",
  "M 10.0 9.7 L 10.2 11.8 L 9.5 14.6 L 6.9 11.1 L 8.6 11.0",
  "M 11.8 11.8 L 12.1 15.2",
]);

export const FolderTree = creerIcone([
  "M 3.9 5.1 L 8.5 5.6 L 10.1 8.9 L 20.4 8.5 L 20.9 17.1 L 2.6 17.5 L 2.1 6.8",
  "M 12.1 11.9 L 19.4 11.6",
  "M 12.2 15.7 L 19.0 15.9",
]);

export const Github = creerIcone([
  "M 19.2 10.9 L 19.2 13.4 L 17.3 15.0 L 13.9 15.9 L 9.9 16.0 L 6.6 15.4 L 4.9 13.7 L 5.0 11.0 L 6.5 7.5 L 8.6 4.3 L 11.0 2.3 L 13.2 2.3 L 15.4 4.2 L 17.4 7.5 L 18.8 11.0",
  "M 7.0 14.4 L 3.0 15.4 L 5.0 17.8 L 7.1 20.0",
  "M 18.5 14.1 L 20.6 15.1 L 19.0 18.8 L 16.3 19.1",
  "M 8.1 21.9 L 9.9 17.1 L 14.1 18.9 L 15.9 20.1",
]);

export const Globe = creerIcone([
  "M 21.0 11.4 L 20.5 13.5 L 19.7 15.5 L 18.6 17.4 L 17.4 19.1 L 16.0 20.4 L 14.6 21.3 L 13.1 21.8 L 11.6 21.9 L 10.2 21.5 L 8.8 20.6 L 7.6 19.5 L 6.4 18.0 L 5.5 16.4 L 4.7 14.6 L 4.1 12.8 L 3.8 11.0 L 3.7 9.3 L 3.9 7.9 L 4.4 6.6 L 5.2 5.5 L 6.3 4.8 L 7.6 4.2 L 9.2 4.0 L 11.0 4.0 L 12.9 4.2 L 14.9 4.6 L 16.7 5.3 L 18.4 6.1 L 19.9 7.2 L 21.0 8.4 L 21.7 9.8 L 22.0 11.3",
  "M 2.9 11.6 L 20.1 13.0",
  "M 12.4 2.1 L 8.1 12.9 L 12.9 20.7 L 14.8 11.5 L 11.3 4.0",
]);

export const GraduationCap = creerIcone([
  "M 9.4 2.7 L 17.3 5.3 L 18.4 5.1 L 17.9 5.6 L 10.4 9.9 L 9.1 10.9 L 8.3 10.9 L 2.2 6.8 L 2.7 5.5 L 3.7 4.7 L 10.8 1.5",
  "M 5.5 7.3 L 5.7 11.3 L 10.0 12.2 L 14.3 11.4 L 14.6 7.0",
  "M 17.6 6.9 L 16.3 9.8",
]);

export const History = creerIcone([
  "M 19.3 12.9 L 18.4 17.1 L 14.4 19.2 L 8.9 18.7 L 4.1 15.8 L 2.0 11.8 L 3.7 7.9 L 8.3 5.4 L 14.0 5.2 L 18.5 7.4 L 19.8 11.3",
  "M 11.9 6.2 L 11.3 12.6 L 14.0 14.7",
]);

export const Image = creerIcone([
  "M 3.8 4.1 L 18.1 5.2 L 19.1 19.7 L 3.8 18.0 L 2.1 5.2",
  "M 9.8 11.0 L 10.2 11.7 L 9.5 11.5 L 7.9 10.8 L 6.1 10.1 L 5.2 9.8 L 5.7 9.5 L 7.4 9.3 L 9.3 8.9 L 10.4 8.8 L 10.3 9.1",
  "M 3.6 16.7 L 9.0 9.0 L 12.4 14.9 L 17.0 10.5 L 18.1 14.8",
]);

export const ImageOff = creerIcone([
  "M 3.2 2.3 L 21.9 20.6",
  "M 6.0 2.9 L 19.3 3.7 L 18.4 18.0",
  "M 3.0 8.0 L 2.0 19.1 L 14.9 18.0",
  "M 8.5 10.7 L 5.3 13.0 L 9.9 13.8 L 10.0 11.4",
]);

export const LayoutGrid = creerIcone([
  "M 3.8 3.9 L 10.7 3.6 L 9.0 10.9 L 4.9 9.0 L 3.5 4.8",
  "M 14.6 3.0 L 19.5 5.0 L 20.4 9.1 L 13.7 10.9 L 14.3 3.1",
  "M 3.0 14.9 L 10.5 13.6 L 10.4 19.5 L 3.1 21.0 L 4.8 13.2",
  "M 14.7 14.5 L 20.1 13.0 L 19.1 20.7 L 14.9 20.1 L 13.7 13.1",
]);

export const Library = creerIcone([
  "M 4.2 5.0 L 3.7 19.1",
  "M 9.0 2.5 L 8.7 20.3",
  "M 11.7 5.0 L 14.3 20.8",
  "M 15.6 4.1 L 19.9 19.9 L 13.2 19.6",
]);

export const Link = creerIcone([
  "M 8.1 15.9 L 14.4 9.6",
  "M 7.3 11.2 L 3.1 16.0 L 5.0 18.4 L 7.5 18.8 L 10.8 16.8",
  "M 18.0 11.8 L 19.0 9.2 L 21.0 4.7 L 15.0 5.4 L 14.0 7.5",
]);

export const Link2 = creerIcone([
  "M 8.1 15.8 L 14.0 10.0",
  "M 7.8 11.1 L 3.1 15.9 L 4.9 18.1 L 7.1 19.9 L 11.9 15.1",
  "M 16.0 12.9 L 20.8 8.3 L 19.4 5.5 L 16.4 4.8 L 12.9 7.9",
]);

export const Loader2 = creerIcone([
  "M 11.1 3.7 L 13.1 4.2 L 15.5 4.5 L 18.1 4.8 L 20.0 5.6 L 21.0 7.2 L 21.0 9.6 L 20.4 12.5 L 19.8 15.1 L 19.3 16.9 L 18.9 18.0 L 18.2 18.6 L 16.7 19.2 L 14.4 20.0 L 11.6 20.9",
]);

export const Map = creerIcone([
  "M 3.8 5.0 L 8.6 3.5 L 14.0 6.7 L 20.9 4.9 L 21.9 17.7 L 15.6 19.0 L 8.4 17.8 L 2.1 20.9 L 3.1 6.7",
  "M 8.5 4.1 L 8.4 18.2",
  "M 15.5 5.1 L 15.3 19.1",
]);

export const MapPin = creerIcone([
  "M 13.0 20.5 L 5.8 12.2 L 5.1 9.7 L 12.5 4.6 L 18.8 8.1 L 17.3 12.7 L 11.4 22.0",
  "M 14.9 9.5 L 14.6 9.6 L 12.5 10.2 L 10.3 11.3 L 9.9 11.3 L 10.6 9.4 L 11.0 6.9 L 11.0 6.1 L 11.7 7.2 L 13.5 8.7 L 15.0 9.3",
]);

export const Maximize2 = creerIcone([
  "M 14.3 4.4 L 19.3 4.5 L 19.2 9.5",
  "M 8.2 20.8 L 3.1 20.9 L 3.9 15.2",
  "M 19.2 4.6 L 12.5 11.3",
  "M 4.5 20.8 L 10.5 13.9",
]);

export const MessageSquare = creerIcone([
  "M 5.0 3.2 L 19.1 4.1 L 20.3 16.6 L 9.4 15.0 L 3.1 20.8 L 4.9 3.8",
]);

export const MessageSquarePlus = creerIcone([
  "M 3.0 4.9 L 20.5 3.6 L 20.3 15.5 L 8.1 17.0 L 4.9 19.2 L 3.8 4.1",
  "M 12.3 7.9 L 12.1 14.0",
  "M 8.4 10.5 L 14.1 11.0",
]);

export const MessageSquareQuote = creerIcone([
  "M 3.0 5.0 L 20.7 3.4 L 19.9 15.9 L 8.4 16.7 L 5.0 19.0 L 3.1 4.8",
  "M 8.8 8.4 L 8.0 12.0 L 5.2 11.8",
  "M 14.0 7.5 L 14.1 10.4 L 12.2 10.3",
]);

export const MessagesSquare = creerIcone([
  "M 2.8 2.8 L 16.0 2.1 L 14.5 12.7 L 7.3 12.4 L 3.9 14.0 L 3.1 3.2",
  "M 8.2 17.6 L 21.9 16.3 L 20.1 9.8 L 18.9 8.2",
]);

export const Mic = creerIcone([
  "M 8.1 3.8 L 15.6 2.6 L 14.9 11.8 L 8.5 12.7 L 9.9 2.0",
  "M 6.4 10.8 L 6.1 11.0 L 8.4 17.9 L 15.9 16.5 L 17.0 11.9 L 18.7 10.6",
  "M 11.3 17.5 L 11.5 21.1",
  "M 8.5 21.8 L 16.4 21.8",
]);

export const Milestone = creerIcone([
  "M 6.7 3.5 L 5.0 21.1",
  "M 6.6 4.7 L 16.4 3.3 L 20.5 8.7 L 16.5 11.2 L 6.4 12.8",
]);

export const Minimize2 = creerIcone([
  "M 8.5 4.4 L 8.3 9.6 L 3.1 9.7",
  "M 14.0 21.0 L 14.5 15.4 L 20.4 14.5",
  "M 9.9 9.1 L 3.6 3.5",
  "M 15.9 14.1 L 22.0 20.3",
]);

export const MoreHorizontal = creerIcone([
  "M 7.1 12.5 L 7.1 12.5 L 6.1 12.4 L 4.4 12.4 L 3.0 12.5 L 2.6 12.5 L 3.4 12.1 L 4.9 11.5 L 6.3 10.9 L 7.1 10.6 L 6.8 11.0",
  "M 13.2 11.9 L 14.0 11.9 L 13.3 12.7 L 11.5 13.7 L 9.9 13.8 L 9.9 12.4 L 11.2 10.5 L 12.6 9.7 L 12.9 10.5 L 12.5 12.0 L 12.4 12.8",
  "M 20.2 11.6 L 19.1 13.6 L 19.0 14.1 L 19.3 13.0 L 18.7 11.8 L 17.3 11.8 L 16.9 12.0 L 18.3 11.4 L 20.3 10.2 L 20.9 10.2 L 20.0 11.9",
]);

export const Move = creerIcone([
  "M 12.0 1.6 L 8.5 6.8 L 15.9 5.0 L 11.0 2.9",
  "M 12.8 21.0 L 8.5 19.0 L 15.3 17.1 L 12.0 22.8",
  "M 3.0 11.4 L 5.0 9.3 L 6.9 15.0 L 1.3 11.7",
  "M 22.6 12.7 L 17.0 9.2 L 18.5 14.1 L 22.4 12.8",
  "M 5.0 11.3 L 20.9 11.1",
  "M 13.0 3.5 L 11.0 20.5",
]);

export const Package = creerIcone([
  "M 2.7 6.8 L 11.1 4.0 L 21.6 6.8 L 21.7 16.1 L 11.2 21.5 L 2.6 17.8 L 4.0 6.3",
  "M 3.1 8.0 L 11.1 11.3 L 20.5 6.2",
  "M 11.3 11.4 L 12.9 20.0",
]);

export const PanelsTopLeft = creerIcone([
  "M 2.7 4.0 L 21.3 4.0 L 20.6 20.1 L 3.4 19.9 L 2.6 4.1",
  "M 2.3 10.6 L 21.9 9.0",
  "M 9.2 11.0 L 8.4 20.8",
]);

export const Paperclip = creerIcone([
  "M 20.0 10.5 L 9.7 19.3 L 4.1 15.8 L 14.7 6.4 L 18.6 9.0 L 8.1 19.1",
]);

export const PenLine = creerIcone([
  "M 18.1 4.0 L 21.8 5.3 L 7.1 18.7 L 4.2 21.0 L 5.8 15.3 L 17.1 2.7",
]);

export const Pencil = creerIcone([
  "M 4.7 19.0 L 4.0 15.7 L 16.7 4.1 L 20.1 7.2 L 8.2 20.0 L 5.0 19.5",
]);

export const Pin = creerIcone([
  "M 13.0 2.6 L 17.0 7.1 L 12.0 12.4 L 13.0 20.9 L 12.0 19.5 L 11.0 11.1 L 6.0 8.5 L 12.1 3.9",
]);

export const Play = creerIcone([
  "M 6.5 4.7 L 19.8 11.1 L 5.9 21.0 L 6.4 3.0",
]);

export const Plus = creerIcone([
  "M 13.0 4.6 L 12.0 19.9",
  "M 4.8 11.6 L 18.8 11.6",
]);

export const Presentation = creerIcone([
  "M 2.2 4.7 L 21.5 3.8",
  "M 3.3 4.6 L 3.6 15.6 L 21.0 14.0 L 19.7 4.1",
  "M 13.0 14.8 L 13.0 19.4",
  "M 8.6 19.0 L 16.5 20.2",
  "M 8.9 10.7 L 11.8 6.8 L 14.7 11.9",
]);

export const Rocket = creerIcone([
  "M 11.1 2.9 L 16.6 7.6 L 16.0 13.8 L 7.4 14.7 L 9.0 7.0 L 11.0 2.9",
  "M 7.6 14.1 L 4.1 21.0 L 8.3 17.9",
  "M 15.6 13.9 L 18.5 20.1 L 15.3 18.2",
  "M 9.2 20.8 L 14.9 19.1 L 11.0 23.0 L 11.0 19.0",
]);

export const RotateCw = creerIcone([
  "M 17.5 13.1 L 15.7 18.0 L 12.7 20.4 L 9.4 19.4 L 6.3 16.2 L 4.3 12.3 L 4.7 9.2 L 7.9 7.3 L 12.9 7.0 L 17.4 8.5 L 18.9 12.0",
  "M 20.0 4.0 L 20.1 8.8 L 15.5 8.4",
]);

export const Search = creerIcone([
  "M 11.0 10.4 L 10.4 12.3 L 9.5 14.2 L 8.3 15.8 L 7.0 17.0 L 5.6 17.8 L 4.2 18.0 L 3.0 17.7 L 1.9 16.9 L 1.0 15.6 L 0.4 14.0 L 0.1 12.2 L -0.0 10.3 L 0.2 8.5 L 0.6 7.0 L 1.3 5.8 L 2.2 5.1 L 3.3 4.8 L 4.5 4.9 L 5.8 5.5 L 7.0 6.4 L 8.2 7.6 L 9.3 9.0 L 10.1 10.4 L 10.6 11.8",
  "M 16.3 14.5 L 20.2 21.1",
]);

export const Send = creerIcone([
  "M 4.0 10.5 L 20.5 2.4 L 12.4 22.0 L 12.0 12.6 L 2.6 10.4",
  "M 10.0 14.0 L 21.2 2.7",
]);

export const Settings2 = creerIcone([
  "M 3.0 7.9 L 14.4 6.8",
  "M 17.0 8.0 L 20.6 6.3",
  "M 17.0 8.0 L 17.3 8.6 L 17.0 8.1 L 15.0 7.9 L 13.2 7.8 L 13.9 6.3 L 16.7 4.4 L 18.3 4.7 L 17.6 7.3",
  "M 5.0 16.3 L 5.3 16.8",
  "M 9.6 17.2 L 20.9 16.3",
  "M 10.2 16.3 L 8.5 18.8 L 7.3 20.0 L 7.0 18.7 L 7.0 16.2 L 6.9 14.8 L 7.2 15.3 L 8.6 16.6 L 10.3 17.3",
]);

export const Share2 = creerIcone([
  "M 21.7 5.0 L 21.0 5.8 L 18.7 6.8 L 16.2 7.7 L 15.0 7.5 L 15.4 5.9 L 16.7 3.3 L 17.9 1.4 L 18.7 1.5 L 19.3 3.4 L 20.1 5.9",
  "M 8.4 12.2 L 8.7 13.0 L 7.8 13.7 L 5.9 14.0 L 3.8 13.8 L 2.5 12.9 L 2.7 11.3 L 4.6 9.7 L 7.1 8.8 L 9.2 9.4 L 9.7 11.2",
  "M 19.9 19.9 L 20.2 20.7 L 19.7 20.8 L 18.1 20.7 L 15.9 20.5 L 14.4 19.8 L 14.8 18.3 L 17.0 16.5 L 19.6 15.6 L 21.2 16.4 L 21.0 18.8",
  "M 8.5 9.9 L 15.7 5.8",
  "M 9.1 12.5 L 16.1 17.7",
]);

export const ShieldCheck = creerIcone([
  "M 11.0 3.0 L 20.7 4.3 L 20.3 11.7 L 11.0 23.0 L 4.7 11.3 L 4.2 4.7 L 11.1 3.0",
  "M 9.8 12.3 L 11.5 15.6 L 16.2 9.9",
]);

export const Shuffle = creerIcone([
  "M 2.0 17.9 L 6.0 17.9 L 18.0 5.9",
  "M 3.6 6.0 L 7.9 6.7 L 18.7 19.9",
  "M 15.9 2.8 L 19.3 5.1 L 18.6 19.1 L 16.6 20.7",
]);

export const Sigma = creerIcone([
  "M 17.0 4.9 L 6.3 3.8 L 13.7 11.2 L 5.0 20.9 L 18.2 19.9",
]);

export const SlidersHorizontal = creerIcone([
  "M 3.4 7.4 L 19.2 7.7",
  "M 4.8 17.4 L 20.6 17.6",
  "M 7.9 3.8 L 7.1 10.8",
  "M 16.8 13.0 L 16.5 20.3",
]);

export const Sparkles = creerIcone([
  "M 12.7 3.5 L 14.4 8.3 L 18.8 9.6 L 12.5 12.2 L 11.7 19.0 L 11.3 12.4 L 5.8 9.7 L 10.1 8.2 L 11.0 3.4",
  "M 19.4 3.8 L 20.7 5.1 L 22.3 5.0 L 19.0 6.1 L 18.1 9.5 L 18.3 7.7 L 16.9 6.2 L 19.0 4.5 L 18.6 2.1",
]);

export const Square = creerIcone([
  "M 4.0 6.0 L 19.6 4.5 L 19.0 18.8 L 4.3 19.8 L 6.0 4.0",
]);

export const Star = creerIcone([
  "M 12.4 2.1 L 13.9 9.1 L 20.1 10.5 L 16.2 14.2 L 18.6 19.3 L 12.4 15.6 L 5.7 20.1 L 7.1 14.7 L 3.2 10.0 L 10.4 8.3 L 12.4 2.1",
]);

export const StickyNote = creerIcone([
  "M 5.0 3.4 L 15.6 3.4 L 19.3 9.0 L 20.9 20.0 L 4.2 19.1 L 3.0 4.6",
  "M 16.6 3.0 L 17.0 7.4 L 20.3 8.4",
]);

export const Table2 = creerIcone([
  "M 3.4 4.9 L 21.4 3.0 L 20.1 20.5 L 4.0 20.2 L 2.5 3.2",
  "M 2.8 9.9 L 21.7 9.5",
  "M 3.0 14.5 L 21.9 14.0",
  "M 10.2 4.7 L 11.9 19.2",
]);

export const ThumbsDown = creerIcone([
  "M 6.1 14.8 L 7.8 3.4 L 3.4 4.4 L 4.4 13.8 L 6.8 14.0",
  "M 8.0 13.7 L 11.5 20.0 L 12.4 20.6 L 11.0 15.7 L 18.9 15.9 L 20.9 13.0 L 18.7 3.1 L 6.7 3.3",
]);

export const ThumbsUp = creerIcone([
  "M 6.1 10.9 L 8.0 19.0 L 3.0 21.0 L 5.0 9.0 L 6.0 11.0",
  "M 6.5 10.1 L 10.3 3.9 L 13.8 2.5 L 12.3 8.3 L 18.0 9.9 L 20.1 11.3 L 18.9 19.0 L 6.4 20.2",
]);

export const Trash2 = creerIcone([
  "M 4.2 7.8 L 18.4 7.6",
  "M 9.2 6.3 L 9.5 4.1 L 14.1 4.5 L 15.9 6.0",
  "M 7.4 7.9 L 7.1 20.7 L 16.9 20.6 L 16.5 7.9",
  "M 9.2 11.6 L 9.0 17.9",
  "M 13.1 11.9 L 14.8 16.2",
]);

export const UserCircle = creerIcone([
  "M 22.0 11.3 L 19.5 16.3 L 14.1 20.4 L 8.3 21.3 L 4.5 18.2 L 3.7 12.2 L 5.7 6.0 L 9.5 2.5 L 14.1 3.2 L 18.3 7.5 L 20.8 12.9",
  "M 15.3 9.8 L 14.9 10.3 L 12.8 10.9 L 10.4 11.6 L 9.1 11.6 L 9.4 10.5 L 10.8 8.3 L 12.1 6.5 L 12.9 6.1 L 13.2 7.7 L 13.6 10.2",
  "M 7.5 17.9 L 7.7 16.5 L 15.2 15.3 L 18.4 17.6",
]);

export const UserCog = creerIcone([
  "M 3.9 20.0 L 3.2 16.0 L 5.0 14.8 L 11.1 15.4 L 15.0 16.4 L 13.6 19.3",
  "M 12.6 8.1 L 11.3 10.1 L 8.9 12.0 L 6.5 12.8 L 5.2 11.9 L 5.4 9.7 L 6.7 6.9 L 8.4 5.0 L 9.9 4.9 L 10.7 6.7 L 10.8 9.4",
  "M 19.0 13.6 L 17.0 15.8",
  "M 17.6 19.6 L 17.5 21.0",
  "M 14.0 18.5 L 16.9 16.7",
  "M 20.3 16.5 L 21.7 17.4",
  "M 20.7 16.5 L 19.0 18.5 L 17.0 20.3 L 16.4 19.8 L 16.9 17.3 L 17.4 15.1 L 17.7 15.0 L 18.4 16.8 L 19.7 18.4",
]);

export const UserX = creerIcone([
  "M 5.8 19.9 L 6.9 16.3 L 8.1 15.0 L 15.1 13.6 L 18.8 16.5 L 17.0 21.0",
  "M 16.5 6.6 L 15.1 8.1 L 12.2 10.2 L 10.2 11.3 L 9.6 9.6 L 9.5 6.4 L 9.2 4.0 L 10.0 3.8 L 12.5 4.7 L 15.5 5.3 L 16.4 6.2",
]);

export const Users = creerIcone([
  "M 3.0 19.9 L 1.3 16.6 L 5.1 15.4 L 10.5 13.5 L 12.1 17.8 L 14.0 19.7",
  "M 10.8 8.4 L 9.4 11.2 L 7.6 13.1 L 6.1 13.0 L 5.4 11.0 L 5.2 8.2 L 5.5 6.1 L 6.3 5.5 L 7.6 6.4 L 9.3 8.1 L 10.6 9.7",
  "M 14.4 14.9 L 17.4 15.8 L 20.9 16.1 L 20.0 19.8",
  "M 16.3 4.7 L 18.0 7.4 L 19.1 9.0 L 15.2 12.0",
]);

export const Video = creerIcone([
  "M 3.8 6.3 L 14.2 5.7 L 15.9 18.2 L 2.1 17.8 L 3.9 6.1",
  "M 14.6 10.0 L 21.9 6.3 L 20.1 18.0 L 15.4 13.2",
]);

export const Volume2 = creerIcone([
  "M 3.3 9.9 L 4.0 14.6 L 6.8 14.1 L 11.0 20.3 L 12.2 5.0 L 8.0 8.8 L 2.9 8.0",
  "M 16.9 7.2 L 18.5 12.4 L 15.2 17.0",
  "M 18.0 6.0 L 21.8 12.1 L 20.0 18.0",
]);

export const Wrench = creerIcone([
  "M 16.0 2.8 L 19.4 6.0 L 14.7 10.3 L 11.8 10.4 L 4.6 18.5 L 6.9 19.3 L 14.3 10.7 L 12.5 8.9 L 14.8 4.0",
]);

export const X = creerIcone([
  "M 6.4 6.9 L 17.8 17.0",
  "M 17.1 6.8 L 6.9 17.0",
]);

export const XCircle = creerIcone([
  "M 6.9 5.2 L 18.5 18.4",
  "M 18.3 5.2 L 6.0 18.7",
  "M 20.0 13.0 L 20.0 15.1 L 19.5 16.8 L 18.5 18.2 L 17.1 19.2 L 15.2 19.8 L 13.0 20.0 L 10.5 19.8 L 8.0 19.3 L 5.7 18.3 L 3.8 16.9 L 2.5 15.1 L 2.0 13.0 L 2.4 10.6 L 3.5 8.2 L 5.4 5.9 L 7.7 4.0 L 10.3 2.7 L 12.9 2.1 L 15.3 2.3 L 17.3 3.4 L 18.8 5.1 L 19.8 7.5 L 20.2 10.1 L 20.2 12.8",
]);

export const Zap = creerIcone([
  "M 13.4 2.8 L 4.7 13.2 L 10.1 13.7 L 9.9 23.0 L 21.0 8.6 L 12.4 8.3 L 12.5 2.9",
]);

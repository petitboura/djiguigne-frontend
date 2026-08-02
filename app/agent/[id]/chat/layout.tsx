// CSS KaTeX/MathLive scopé à cette route (01/08, audit vitesse) : voir le
// commentaire dans app/globals.css. ChatAgentClient (rendu par
// page.tsx dans ce même dossier) est le seul endroit de l'app, avec
// /dashboard/applications, à afficher BulleMessage/EditeurFormule/
// EditeurMathsRiche -- donc le seul qui a besoin de ce CSS.
import "katex/dist/katex.min.css";
import "mathlive/fonts.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

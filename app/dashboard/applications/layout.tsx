// CSS KaTeX/MathLive scopé à cette route (01/08, audit vitesse) : voir le
// commentaire dans app/globals.css. Cette page teste/prévisualise le
// chat d'un agent (BulleMessage/BarreDeSaisie), d'où le besoin du même
// CSS que app/agent/[id]/chat/layout.tsx.
import "katex/dist/katex.min.css";
import "mathlive/fonts.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

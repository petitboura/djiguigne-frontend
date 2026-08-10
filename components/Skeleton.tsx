import type { CSSProperties } from "react";

// Bloc de chargement "skeleton" avec balayage lumineux (09/08, demande
// Bourama : remplacer animate-pulse -- simple respiration d'opacité --
// partout où un contenu à venir est annoncé). Voir tailwind.config.ts
// (backgroundImage.dj-shimmer + keyframes.dj-shimmer) pour le dégradé et
// le mouvement. Identique au composant de classgpt-frontend, à garder
// synchronisé.
//
// Ne fixe ni la taille, ni les coins, ni la bordure : chaque appelant les
// précise via className (évite tout conflit d'ordre de classes Tailwind
// avec des valeurs par défaut posées ici -- l'ordre des classes dans le
// className final ne garantit pas laquelle "gagne" en CSS généré).
//
// `as="span"` pour les contextes inline qui ne peuvent pas contenir de
// div (ex. LinkPreview, imbriqué dans un lien/texte de message).
export function Skeleton({
  className = "",
  as = "div",
  style,
}: {
  className?: string;
  as?: "div" | "span";
  style?: CSSProperties;
}) {
  const Balise = as;
  return (
    <Balise
      className={`animate-dj-shimmer bg-dj-shimmer bg-[length:250%_100%] ${className}`}
      style={style}
      aria-hidden
    />
  );
}

// Icône générique par défaut (2026-08-05, demande Bourama : remplace
// l'emoji ui_config.icone_page comme fallback -- affichée tant qu'un
// agent n'a pas encore d'icone_url). Même esprit graphique que
// IconeMatrix.tsx (trait fin, currentColor, AUCUN remplissage) : une
// étincelle à 4 branches, symbole neutre d'IA/assistance, sans rapport
// avec une matière précise (contrairement à IconeMatrix, dédiée à un seul
// agent).
export function IconeGenerique({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Icône"
    >
      {/* Étincelle centrale (grande branche verticale + horizontale) */}
      <path d="M12 2.5 C 12 8, 12 8, 18.5 9.5 C 12 11, 12 11, 12 21.5 C 12 11, 12 11, 5.5 9.5 C 12 8, 12 8, 12 2.5 Z" />
      {/* Petite étincelle secondaire, en haut à droite */}
      <path d="M18.5 3 C 18.5 5, 18.5 5, 21 5.5 C 18.5 6, 18.5 6, 18.5 8 C 18.5 6, 18.5 6, 16 5.5 C 18.5 5, 18.5 5, 18.5 3 Z" />
    </svg>
  );
}

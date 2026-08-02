// Icône dédiée à l'agent "math-matique" (02/08, demande Bourama). Historique :
// un premier essai (compas) ne "parlait pas des maths" et utilisait des
// points pleins aux pointes -- remplacé par une courbe tracée sur un
// repère (axes + courbe), en lignes fines uniquement, AUCUN remplissage
// nulle part (contrairement à un dessin classique où on colore certaines
// zones -- demande explicite de Bourama). Nommé "Matrix" (choix de
// Bourama, pas un terme mathématique). La couleur est laissée à
// `currentColor` -- le composant appelant fixe la couleur (dj-accent-1).
export function IconeMatrix({ className }: { className?: string }) {
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
      aria-label="Icône Matrix"
    >
      {/* Axe vertical + pointe de flèche */}
      <line x1="5" y1="19" x2="5" y2="3.5" />
      <path d="M3.6 6.2 L5 3.5 L6.4 6.2" />
      {/* Axe horizontal + pointe de flèche */}
      <line x1="5" y1="19" x2="20.5" y2="19" />
      <path d="M17.8 17.6 L20.5 19 L17.8 20.4" />
      {/* Petites graduations */}
      <line x1="9" y1="18.4" x2="9" y2="19.6" />
      <line x1="13" y1="18.4" x2="13" y2="19.6" />
      <line x1="17" y1="18.4" x2="17" y2="19.6" />
      <line x1="4.4" y1="13" x2="5.6" y2="13" />
      <line x1="4.4" y1="9" x2="5.6" y2="9" />
      {/* La courbe */}
      <path d="M6.5 16 C 9.5 6.5, 12.5 6.5, 14.5 11 S 18.5 19, 20 12.5" />
    </svg>
  );
}

// Icône dédiée à l'agent "math-matique" (02/08, demande Bourama : remplacer
// l'emoji 🤖 par une icône dessinée, "ma couleur sur noir", lignes fines
// plutôt que des traits épais). Reprend le compas comme symbole maths,
// en un seul trait continu (strokeWidth 1) pour rester discret. La couleur
// est laissée à `currentColor` -- le composant appelant fixe la couleur
// (dj-accent-1, orange) via className, comme pour les autres icônes
// inline du projet (voir AgentCard.tsx, page.tsx).
export function IconeMathMatique({ className }: { className?: string }) {
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
      aria-label="Icône mathématiques"
    >
      {/* Charnière du compas */}
      <circle cx="12" cy="4.2" r="1.4" />
      {/* Les deux branches */}
      <line x1="12" y1="5.6" x2="7.4" y2="19.5" />
      <line x1="12" y1="5.6" x2="16.6" y2="19.5" />
      {/* Pointes (mine + pointe sèche) */}
      <circle cx="7.4" cy="19.8" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="16.6" cy="19.8" r="0.6" fill="currentColor" stroke="none" />
      {/* Arc en cours de tracé, pointillé fin */}
      <path d="M5.5 17.5 Q12 22.5 18.5 17.5" strokeDasharray="1.2 1.6" />
    </svg>
  );
}

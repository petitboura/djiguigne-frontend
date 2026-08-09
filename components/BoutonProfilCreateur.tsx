import Link from "next/link";

// Demande de Bourama (2026-07-15, capture d'écran de la page agent) : le
// lien texte "Voir le profil du créateur →" devenait un bouton -- icône
// de profil (silhouette tête + buste) à gauche, sans flèche. Corrigé le
// même jour (Bourama : "si il n'y a pas de texte, juste un bouton, on va
// pas comprendre") : passé d'un cercle icône seul (façon
// BoutonRetour/BoutonAccueil) à un vrai bouton pilule icône + texte
// "Créateur", même style que BoutonPartager à côté duquel il vit (voir
// app/agent/[id]/page.tsx).
export function BoutonProfilCreateur({ ownerId }: { ownerId: string }) {
  return (
    <Link
      href={`/u/${ownerId}`}
      className="flex items-center gap-1.5 rounded-xl border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.5 20c1.2-4 4-6 7.5-6s6.3 2 7.5 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Créateur
    </Link>
  );
}

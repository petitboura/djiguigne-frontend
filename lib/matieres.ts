// Liste fixe des matières (Bourama, 2026-07-27), utilisée à la fois par
// le flow "Devenir créateur" (accueil) et le formulaire de création
// d'agent, pour rester synchronisées. Sélection unique + "Autre" (texte
// libre) gérée séparément par chaque appelant.
export const MATIERES = [
  "Informatique",
  "Physique",
  "Économie",
  "Chimie",
  "Anglais",
  "SVT (Biologie)",
  "Français",
  "Gestion",
  "Arabe",
] as const;

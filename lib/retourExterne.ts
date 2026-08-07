// Extrait de app/agent/[id]/chat/page.tsx le 07/08/2026 pour être
// réutilisé aussi par app/agent/[id]/page.tsx (voir ce fichier) : la
// vitrine peut lier vers une IA via ?retour=<url complète de la vitrine>.
// On ne garde que http(s):// pour éviter tout schéma dangereux
// (javascript:, data:, etc.) glissé dans le paramètre.
export function nettoyerUrlRetour(valeur: string | undefined): string | undefined {
  if (!valeur) return undefined;
  try {
    const url = new URL(valeur);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

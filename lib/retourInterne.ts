// Ajouté le 07/08/2026 (Bourama : règles de redirection après connexion/
// inscription -- "accueil uniquement si tu te connectes depuis le bouton
// se connecter en bas de la vitrine, sinon si c'est depuis une IA tu dois
// y être redirigé dans son interface, ou tu dois être redirigé là où tu
// étais"). Complète nettoyerUrlRetour (retourExterne.ts, qui valide une
// URL COMPLÈTE de la vitrine) : ici on valide un CHEMIN RELATIF interne à
// l'app (ex. "/dashboard/espace", "/agent/xyz/enseigner"), passé en
// ?retour= vers /connexion et /inscription.
//
// Doit commencer par "/" mais pas par "//" (qui serait interprété par le
// navigateur comme une redirection vers un autre domaine -- protocole
// relatif) ni contenir "://" (même risque avec un chemin du type
// "/\evil.com" ou "/.evil.com" échappé) -- sinon on l'ignore et on retombe
// sur le comportement par défaut (accueil).
export function nettoyerCheminRetour(valeur: string | null | undefined): string | undefined {
  if (!valeur) return undefined;
  if (!valeur.startsWith("/") || valeur.startsWith("//") || valeur.includes("://")) return undefined;
  return valeur;
}

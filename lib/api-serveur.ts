// Étape D.3 (pivot social) : variante serveur de lib/api.ts, pour les
// Server Components (SSR obligatoire pour le SEO/AEO/GEO). appelerApi() de
// lib/api.ts ne convient pas ici : il appelle supabase.auth.getSession(),
// qui lit le localStorage du navigateur — indisponible côté serveur. Cette
// variante n'attache jamais de token, donc réservée aux endpoints PUBLICS
// (GET /api/feed, /api/agents/{id}, /api/agents/{id}/rating,
// /api/agents/{id}/comments, /api/search, /api/profiles/{user_id}).
// Ne jamais l'utiliser pour un endpoint qui exige une auth.

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL est requis (voir .env.local.example).");
}

/**
 * Retourne `null` sur 404 (au lieu de lever), pour que l'appelant fasse
 * `notFound()` proprement plutôt que d'attraper une exception générique.
 * Lève toujours sur les autres statuts d'erreur (500, etc.).
 */
export async function appelerApiPublicOuNull(chemin: string) {
  const reponse = await fetch(`${API_URL}${chemin}`, {
    // Pas de cache Next.js par défaut : les données (notes, commentaires,
    // vitrine) changent trop souvent pour un contenu statique généré au
    // build. Revalidation courte plutôt qu'aucun cache, pour rester
    // raisonnable côté charge sur le backend.
    next: { revalidate: 30 },
  });

  if (reponse.status === 404) return null;

  if (!reponse.ok) {
    const detail = await reponse.text().catch(() => "");
    throw new Error(`Erreur API ${reponse.status} sur ${chemin} : ${detail}`);
  }

  return reponse.json();
}

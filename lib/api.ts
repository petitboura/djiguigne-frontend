import { supabase } from "./supabase";
import { ErreurApi, messageErreur } from "./erreurs";

// URL du backend FastAPI (voir api/main.py). En local pendant le dev :
// http://localhost:8000. Une fois déployé sur Railway : l'URL publique de
// ce service (pas encore un domaine définitif tant que djiguigne.com n'est
// pas branché — voir RAILWAY_DEPLOY.md du dépôt djiguigne-backend).
const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL est requis (voir .env.local.example).");
}

/**
 * Construit une ErreurApi à partir d'une réponse HTTP en échec.
 *
 * AVANT (bug corrigé le 2026-07-31) : le corps JSON de la réponse était
 * pris comme texte brut et collé dans le message d'erreur affiché à
 * l'utilisateur, ex. `Erreur API 403 sur /api/agents/x : {"detail":{"code":
 * "CET_AGENT_NE_T_APPARTIENT_PAS","message":"Cet agent ne t'appartient
 * pas."}}`. Tout le travail de messages propres côté backend (voir
 * djiguigne-backend/core/erreurs.py) était donc invisible : ce JSON brut
 * atterrissait tel quel dans les <p>{erreur}</p> et les alert() du front.
 *
 * MAINTENANT : on parse le corps et on extrait proprement `code`,
 * `message` et `params` (voir erreur_api() côté backend), avec un repli
 * sur chaque format qu'on peut rencontrer :
 * - {"detail": {"code": ..., "message": ..., "params"?: {...}}}  (notre format)
 * - {"detail": [{"msg": ..., ...}, ...]}                         (422 auto FastAPI/pydantic)
 * - {"detail": "texte brut"}                                     (ancien format / lib externe)
 * - corps non-JSON ou vide                                       (erreur réseau, proxy, etc.)
 */
async function construireErreurApi(reponse: Response, chemin: string): Promise<ErreurApi> {
  const texteBrut = await reponse.text().catch(() => "");

  let corps: unknown = null;
  try {
    corps = texteBrut ? JSON.parse(texteBrut) : null;
  } catch {
    corps = null;
  }

  const detail = corps && typeof corps === "object" ? (corps as any).detail : undefined;

  if (detail && typeof detail === "object" && !Array.isArray(detail) && typeof detail.message === "string") {
    // Notre format standard (voir erreur_api() dans core/erreurs.py).
    return new ErreurApi(reponse.status, detail.message, detail.code, detail.params);
  }

  if (typeof detail === "string" && detail.trim()) {
    // Ancienne HTTPException FastAPI avec un detail texte simple.
    return new ErreurApi(reponse.status, detail);
  }

  if (Array.isArray(detail) && detail.length > 0) {
    // Erreur de validation automatique de FastAPI/pydantic (422), jamais
    // écrite pour un humain -- on ne montre pas sa structure technique.
    return new ErreurApi(reponse.status, "La requête envoyée est invalide.", "REQUETE_INVALIDE");
  }

  if (reponse.status === 401) {
    return new ErreurApi(401, "Ta session a expiré, reconnecte-toi.", "SESSION_EXPIREE");
  }

  // Corps vide/non-JSON (ex: proxy, 502/504, coupure réseau) : pas de code
  // exploitable, mais on évite au moins d'afficher du JSON brut ou "".
  return new ErreurApi(
    reponse.status,
    `Une erreur est survenue (${reponse.status}), réessaie dans un instant.`,
    "ERREUR_INCONNUE"
  );
}

/**
 * Appelle l'API avec le token Supabase de la session en cours, si elle
 * existe. N'échoue pas si personne n'est connecté : certaines routes sont
 * publiques (ex: /api/feed, /api/search) et n'ont pas besoin de token.
 */
export async function appelerApi(chemin: string, options: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const entetes = new Headers(options.headers);
  entetes.set("Content-Type", "application/json");
  if (session?.access_token) {
    entetes.set("Authorization", `Bearer ${session.access_token}`);
  }

  const reponse = await fetch(`${API_URL}${chemin}`, {
    ...options,
    headers: entetes,
  });

  if (!reponse.ok) {
    throw await construireErreurApi(reponse, chemin);
  }

  // Certaines routes (ex: POST .../rating) renvoient 204 No Content —
  // aucun corps à parser. Sans ce garde-fou, response.json() plante avec

  // "Unexpected end of JSON input" (bug remonté par Bourama, 2026-07-12,
  // sur le clic étoile de la note). content-length à "0" couvre aussi le
  // cas d'un corps vide envoyé avec un autre code que 204.
  if (reponse.status === 204 || reponse.headers.get("content-length") === "0") {
    return null;
  }

  return reponse.json();
}

/**
 * Variante streaming (Server-Sent Events) pour /api/chat -- voir
 * api/chat.py côté backend. Contrairement à appelerApi, ne parse pas
 * directement un JSON unique : appelle `surEvenement` pour chaque
 * événement reçu (mêmes types que core/main.py:chat(), voir sa
 * docstring : "statut", "statut_termine", "reponse", "confirmation_requise",
 * "meta"), au fur et à mesure du streaming.
 */
export async function appelerApiStream(
  chemin: string,
  corps: unknown,
  surEvenement: (evenement: any) => void
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const entetes = new Headers();
  entetes.set("Content-Type", "application/json");
  if (session?.access_token) {
    entetes.set("Authorization", `Bearer ${session.access_token}`);
  }

  const reponse = await fetch(`${API_URL}${chemin}`, {
    method: "POST",
    headers: entetes,
    body: JSON.stringify(corps),
  });

  if (!reponse.ok || !reponse.body) {
    throw await construireErreurApi(reponse, chemin);
  }

  const lecteur = reponse.body.getReader();
  const decodeur = new TextDecoder();
  let tampon = "";

  while (true) {
    const { done, value } = await lecteur.read();
    if (done) break;
    tampon += decodeur.decode(value, { stream: true });

    // Un événement SSE = une ligne "data: {...}", séparée par \n\n.
    const morceaux = tampon.split("\n\n");
    tampon = morceaux.pop() ?? "";

    for (const morceau of morceaux) {
      const ligne = morceau.trim();
      if (!ligne.startsWith("data:")) continue;
      const contenu = ligne.slice("data:".length).trim();
      if (contenu === "[DONE]") return;
      try {
        surEvenement(JSON.parse(contenu));
      } catch {
        // Ligne mal formée : on l'ignore plutôt que de casser tout le flux.
      }
    }
  }
}
/**
 * Ajoutée pour le fix du 2026-07-12 (champs URL image remplacés par un
 * vrai upload, voir components/ChampImage.tsx). Pas de
 * Content-Type manuel : le navigateur doit le fixer lui-même avec le
 * boundary du FormData, le mettre à la main casse l'upload.
 */
export async function appelerApiFichier(chemin: string, fichier: File) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Connecte-toi pour envoyer un fichier.");
  }

  const corps = new FormData();
  corps.append("fichier", fichier);

  const reponse = await fetch(`${API_URL}${chemin}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: corps,
  });

  if (!reponse.ok) {
    throw await construireErreurApi(reponse, chemin);
  }

  return reponse.json();
}

/**
 * Upload vers la bibliothèque d'un agent (n'importe quel type de fichier
 * + un titre) -- voir api/agents.py:uploader_fichier_bibliotheque.
 * Distincte de appelerApiFichier : celle-ci envoie un champ "titre" en
 * plus du fichier dans le FormData.
 */
export async function ajouterFichierBibliotheque(
  agentId: string,
  fichier: File,
  description: string,
  titre?: string
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Connecte-toi pour envoyer un fichier.");
  }

  const corps = new FormData();
  corps.append("fichier", fichier);
  if (titre?.trim()) corps.append("titre", titre.trim());
  corps.append("description", description);

  const reponse = await fetch(`${API_URL}/api/agents/${agentId}/bibliotheque`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: corps,
  });

  if (!reponse.ok) {
    throw await construireErreurApi(reponse, `/api/agents/${agentId}/bibliotheque`);
  }

  return reponse.json();
}

/**
 * Upload vers la bibliothèque PERSONNELLE de l'utilisateur connecté
 * (2026-08-01, nouvelle section "Mon espace" -- voir
 * api/bibliotheque_utilisateur.py:uploader_document). Même mécanique que
 * ajouterFichierBibliotheque ci-dessus, sans agentId : ces documents ne
 * sont liés à aucun agent, consultables depuis n'importe quelle
 * conversation via l'outil consulter_bibliotheque.
 */
export async function ajouterFichierBibliothequePersonnelle(fichier: File, description: string, titre?: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Connecte-toi pour envoyer un fichier.");
  }

  const corps = new FormData();
  corps.append("fichier", fichier);
  if (titre?.trim()) corps.append("titre", titre.trim());
  corps.append("description", description);

  const reponse = await fetch(`${API_URL}/api/bibliotheque`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: corps,
  });

  if (!reponse.ok) {
    throw await construireErreurApi(reponse, "/api/bibliotheque");
  }

  return reponse.json();
}

/**
 * Ajoute un lien ou une note de texte à la bibliothèque personnelle
 * (2026-08-01, demande Bourama : "ajoute le cas des liens et du texte",
 * "pas de filtre au moment de l'upload" -- voir espace/page.tsx pour la
 * détection automatique du type). Deux fonctions séparées car les
 * payloads backend diffèrent (voir api/bibliotheque_utilisateur.py :
 * /lien attend {url, titre}, /texte attend {contenu, titre}).
 */
export async function ajouterLienBibliothequePersonnelle(url: string, titre?: string) {
  return appelerApi("/api/bibliotheque/lien", {
    method: "POST",
    body: JSON.stringify({ url, titre: titre?.trim() || null }),
  });
}

export async function ajouterTexteBibliothequePersonnelle(contenu: string, titre?: string) {
  return appelerApi("/api/bibliotheque/texte", {
    method: "POST",
    body: JSON.stringify({ contenu, titre: titre?.trim() || null }),
  });
}

/**
 * Upload de PLUSIEURS fichiers d'un coup vers la bibliothèque personnelle
 * (2026-08-01, demande Bourama : "plusieurs upload à la fois") -- simple
 * boucle séquentielle sur ajouterFichierBibliothequePersonnelle (pas de
 * endpoint bulk dédié côté backend, inutile pour ce volume). Si un
 * fichier échoue, les autres continuent quand même ; l'appelant reçoit
 * la liste des erreurs (vide si tout est passé) pour les afficher.
 */
export async function ajouterFichiersBibliothequePersonnelle(fichiers: File[]) {
  const erreurs: { nom: string; erreur: string }[] = [];
  for (const fichier of fichiers) {
    try {
      await ajouterFichierBibliothequePersonnelle(fichier, "", "");
    } catch (e) {
      erreurs.push({ nom: fichier.name, erreur: messageErreur(e) });
    }
  }
  return erreurs;
}

/**
 * Upload d'une image jointe à un message de chat -- voir
 * components/chat/ChatIA.tsx:envoyerMessage côté appelant. Réutilise
 * appelerApiFichier (même mécanique FormData) sur le nouvel endpoint dédié
 * au chat. Renvoie l'URL publique à passer dans `image_url` du payload
 * /api/chat.
 */
export async function uploaderImageChat(fichier: File) {
  const resultat = await appelerApiFichier("/api/uploads/image-chat", fichier);
  return resultat.url as string;
}

/**
 * Extraction texte d'un document (PDF/Word/Excel) joint à un message de
 * chat -- voir api/uploads.py:uploader_document_chat. Le fichier original
 * est stocké (url) et, pour Word/Excel, converti en PDF pour aperçu
 * visuel (url_apercu, peut être null si CloudConvert indisponible/pas
 * configuré -- voir core/conversion_pdf.py côté backend). Le texte extrait
 * est injecté directement dans le message avant envoi à /api/chat.
 */
export async function uploaderDocumentChat(fichier: File) {
  const resultat = await appelerApiFichier("/api/uploads/document-chat", fichier);
  return resultat as { texte: string; tronque: boolean; url: string | null; url_apercu: string | null };
}

/**
 * Transcription d'un enregistrement audio (dictée vocale) via
 * api/uploads.py:uploader_audio_chat (Whisper/Groq). Le fichier est un
 * Blob MediaRecorder emballé en File côté BarreDeSaisie.tsx.
 */
export async function transcrireAudioChat(fichier: File) {
  const resultat = await appelerApiFichier("/api/uploads/audio-chat", fichier);
  return resultat as { texte: string; url: string | null };
}

/**
 * Traitement d'une vidéo jointe à un message de chat -- voir
 * api/uploads.py:uploader_video_chat (extraction audio via Whisper +
 * frames via ffmpeg, analysées ensuite par Gemini). Depuis le
 * 2026-07-22, la vidéo originale est aussi gardée dans la bibliothèque
 * (niveau utilisateur), pas seulement traitée puis jetée.
 */
export async function uploaderVideoChat(fichier: File) {
  const resultat = await appelerApiFichier("/api/uploads/video-chat", fichier);
  return resultat as { transcript: string; frames_base64: string[]; url: string | null };
}

/**
 * OCR ciblé formule (2026-07-26, priorité maths de Bourama) -- voir
 * api/uploads.py:extraire_formule. Contrairement à uploaderImageChat,
 * cette image ne rejoint jamais la conversation : elle sert uniquement
 * à extraire le LaTeX, ouvert ensuite dans EditeurFormule.tsx (éditable
 * avant insertion). Lève une erreur si aucune formule n'est détectée
 * (422 côté backend).
 */
export async function extraireFormuleImage(fichier: File) {
  const resultat = await appelerApiFichier("/api/uploads/extraire-formule", fichier);
  return resultat.latex as string;
}

/**
 * Statut de connexion OAuth à un service externe (ex. "github") via le
 * moteur générique -- voir connexions/oauth_generique.py côté backend.
 */
export async function lireRegistreOutils() {
  return appelerApi(`/api/registre-outils`);
}

export async function lireDroitsAgent(agentId: string) {
  return appelerApi(`/api/agents/${agentId}/droits`);
}

export async function modifierDroitsAgent(
  agentId: string,
  payload: {
    outils_generation: string[];
    serveurs: string[];
    actions_locales: string[];
    informer_utilisateurs: boolean;
  }
) {
  return appelerApi(`/api/agents/${agentId}/droits`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Outils/actions locales réellement actifs pour CET agent, côté chat --
 * endpoint public (pas besoin d'être le créateur), sert à filtrer les
 * boutons de BarreDeSaisie.tsx pour que ce que le créateur n'a pas coché
 * n'apparaisse jamais dans le chat. `outils` réutilise directement
 * lister_outils_autorises_pour_agent côté backend (même fonction que la
 * vraie requête envoyée à Groq) -- inclut donc déjà les noms d'outils
 * dérivés d'un serveur (ex. tavily_search, explorer_depot_github).
 * `actions_locales` couvre les boutons UI (préfixe "ui_") qui ne sont pas
 * des outils LLM et donc invisibles à cette fonction.
 */
export async function lireOutilsChatAgent(agentId: string) {
  return appelerApi(`/api/agents/${agentId}/outils-disponibles`) as Promise<{
    outils: string[];
    actions_locales: string[];
  }>;
}

export async function statutConnexion(service: string) {
  const resultat = await appelerApi(`/api/connexions/${service}/statut`);
  return resultat as { connecte: boolean };
}

/**
 * CORRECTION (2026-07-30) : obtenirOutilsDisponibles() faisait double
 * emploi avec lireOutilsChatAgent() ci-dessus -- même endpoint, mais
 * lireOutilsChatAgent() couvre en plus les actions locales (catégorie 4,
 * boutons UI type localisation/LaTeX/dessin, ajoutées le même jour).
 * Fusionné en une seule fonction pour ne pas avoir deux sources
 * divergentes du même appel réseau.
 */

/**
 * Démarre une connexion OAuth : renvoie l'URL d'autorisation à ouvrir
 * (redirection complète, pas de popup) -- voir app/oauth/retour/page.tsx
 * pour la page qui traite le retour.
 *
 * CORRECTION (2026-07-31) : le backend renvoyait avant un statut 200 avec
 * `{url: null, erreur: "..."}` en cas d'échec (voir api/connexions.py) --
 * incohérent avec le reste de l'API et invisible pour tout code qui ne
 * pense pas à lire ce champ précis. Il lève maintenant une vraie erreur
 * (voir erreur_api() côté backend) : à catcher avec messageErreur(e),
 * comme n'importe quel autre appel API.
 */
export async function demarrerConnexion(service: string, agentId?: string) {
  const chemin = agentId
    ? `/api/connexions/${service}/demarrer?agent_id=${encodeURIComponent(agentId)}`
    : `/api/connexions/${service}/demarrer`;
  const resultat = await appelerApi(chemin);
  return resultat as { url: string };
}

/**
 * Liste les dépôts GitHub (publics et privés) de la personne connectée --
 * voir api/connexions.py:depots_github, utilisé par le sélecteur de dépôt
 * dans BarreDeSaisie.tsx. Voir demarrerConnexion ci-dessus pour la même
 * correction (vraie erreur levée plutôt que champ `erreur` dans le corps).
 */
export async function depotsGithub() {
  const resultat = await appelerApi("/api/connexions/github/depots");
  return resultat as {
    depots: { nom_complet: string; prive: boolean; description: string | null; url: string }[];
  };
}

/**
 * Cherche des pages/bases Notion visibles par la personne connectée --
 * voir api/connexions.py:pages_notion, utilisé par le sélecteur de page
 * dans BarreDeSaisie.tsx. Même correction (2026-07-31) que depotsGithub
 * ci-dessus : une vraie erreur est levée en cas d'échec.
 *
 * CORRECTION (01/08) : contrairement à depotsGithub (listing complet),
 * ceci passe désormais par l'outil MCP notion-search côté backend, qui
 * exige un texte de recherche -- sans `q`, le backend renvoie une liste
 * vide plutôt qu'un listing complet (impossible avec cet outil).
 */
export async function pagesNotion(q: string) {
  const resultat = await appelerApi(`/api/connexions/notion/pages?q=${encodeURIComponent(q)}`);
  return resultat as {
    pages: { titre: string; type: "page" | "database"; url: string }[];
  };
}

/**
 * Interroge le contenu d'une base Notion (02/08, demande Bourama : "on va
 * ajouter" query-data-sources/query-database-view) -- `url` est l'URL de la
 * base choisie dans le sélecteur (résultat de pagesNotion, type
 * "database"), `q` le texte tapé sur le 2e écran de requête. Voir
 * api/connexions.py:lignes_base_notion pour le detail (fetch de la base ->
 * data source URL -> SQL, filtre par `q` fait côté backend en Python, pas
 * une vraie clause SQL dynamique).
 */
export async function lignesBaseNotion(url: string, q: string) {
  const resultat = await appelerApi(
    `/api/connexions/notion/bases/lignes?url=${encodeURIComponent(url)}&q=${encodeURIComponent(q)}`
  );
  return resultat as {
    lignes: { titre: string; url: string | null; proprietes: Record<string, unknown> }[];
  };
}

/**
 * Crée une page Notion standalone (02/08, demande Bourama : titre + zone de
 * texte pour le contenu, pas de choix de parent dans cette itération). Voir
 * api/connexions.py:creer_page_notion -- appel MCP direct, pas de passage
 * par la confirmation OUTILS_SENSIBLES (le clic "Créer" du formulaire en
 * tient lieu).
 */
export async function creerPageNotion(titre: string, contenu: string) {
  const resultat = await appelerApi(`/api/connexions/notion/pages`, {
    method: "POST",
    body: JSON.stringify({ titre, contenu }),
  });
  return resultat as { url: string };
}

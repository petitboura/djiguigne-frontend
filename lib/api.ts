import { supabase } from "./supabase";

// URL du backend FastAPI (voir api/main.py). En local pendant le dev :
// http://localhost:8000. Une fois déployé sur Railway : l'URL publique de
// ce service (pas encore un domaine définitif tant que djiguigne.com n'est
// pas branché — voir RAILWAY_DEPLOY.md du dépôt djiguigne-backend).
const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL est requis (voir .env.local.example).");
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
    const detail = await reponse.text().catch(() => "");
    throw new Error(`Erreur API ${reponse.status} sur ${chemin} : ${detail}`);
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
    const detail = await reponse.text().catch(() => "");
    throw new Error(`Erreur API ${reponse.status} sur ${chemin} : ${detail}`);
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
    const detail = await reponse.text().catch(() => "");
    throw new Error(`Erreur API ${reponse.status} sur ${chemin} : ${detail}`);
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
    const detail = await reponse.text().catch(() => "");
    throw new Error(`Erreur API ${reponse.status} : ${detail}`);
  }

  return reponse.json();
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
  payload: { outils_generation: string[]; serveurs: string[]; informer_utilisateurs: boolean }
) {
  return appelerApi(`/api/agents/${agentId}/droits`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function statutConnexion(service: string) {
  const resultat = await appelerApi(`/api/connexions/${service}/statut`);
  return resultat as { connecte: boolean };
}

/**
 * Démarre une connexion OAuth : renvoie l'URL d'autorisation à ouvrir
 * (redirection complète, pas de popup) -- voir app/oauth/retour/page.tsx
 * pour la page qui traite le retour.
 */
export async function demarrerConnexion(service: string, agentId?: string) {
  const chemin = agentId
    ? `/api/connexions/${service}/demarrer?agent_id=${encodeURIComponent(agentId)}`
    : `/api/connexions/${service}/demarrer`;
  const resultat = await appelerApi(chemin);
  return resultat as { url: string | null; erreur?: string };
}

/**
 * Liste les dépôts GitHub (publics et privés) de la personne connectée --
 * voir api/connexions.py:depots_github, utilisé par le sélecteur de dépôt
 * dans BarreDeSaisie.tsx.
 */
export async function depotsGithub() {
  const resultat = await appelerApi("/api/connexions/github/depots");
  return resultat as {
    depots: { nom_complet: string; prive: boolean; description: string | null; url: string }[];
    erreur?: string;
  };
}

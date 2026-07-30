import { NextRequest, NextResponse } from "next/server";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

// Récupère les métadonnées Open Graph (titre, image, description) d'une
// URL externe -- utilisé par components/chat/LinkPreview.tsx pour afficher
// un aperçu de lien dans le chat au lieu d'un lien souligné brut (demande
// de Bourama, 2026-07-20 : "n'importe quel lien génère un aperçu... comme
// dans n'importe quelle plateforme").
//
// Pourquoi une route serveur et pas un fetch direct côté client : la
// quasi-totalité des sites ne renvoient aucun en-tête CORS sur leur page
// HTML (normal, ce n'est pas fait pour être lu depuis un autre site) --
// un fetch() client vers une URL arbitraire échoue donc systématiquement.
// Le serveur, lui, n'est pas soumis à CORS.
export const runtime = "nodejs";

const DELAI_MAX_MS = 5000;
const TAILLE_MAX_OCTETS = 2 * 1024 * 1024; // 2 Mo -- largement assez pour le <head>, pas besoin de toute la page

// Garde-fou SSRF -- ce endpoint accepte n'importe quelle URL fournie par le
// modèle dans une réponse de chat, donc potentiellement non fiable.
//
// CORRECTIF 2026-07-30 (audit de sécurité) : la version précédente ne
// vérifiait que le hostname LITTÉRAL de l'URL de départ, avec deux trous
// concrets qui rendaient le garde-fou contournable :
//   1. Un domaine public peut résoudre vers une IP interne (DNS rebinding)
//      -- le hostname passe le check textuel, mais l'IP réelle est interne.
//      -> on résout maintenant le DNS et on vérifie l'IP obtenue, pas
//      seulement le texte du hostname.
//   2. `redirect: "follow"` suivait les redirections HTTP sans jamais
//      revérifier la nouvelle destination -- un site externe pouvait
//      rediriger (302) vers une adresse interne. -> on suit désormais les
//      redirections nous-mêmes (redirect: "manual"), en revalidant chaque
//      nouvelle URL avant de la suivre.
// Plage manquante corrigée au passage : 169.254.0.0/16 (lien-local, y
// compris les endpoints de métadonnées cloud AWS/GCP/Azure) n'était pas
// bloquée du tout.
const NB_REDIRECTIONS_MAX = 5;

function ipEstInterne(ip: string): boolean {
  const type = isIP(ip);
  if (type === 4) {
    return (
      /^127\./.test(ip) ||
      /^10\./.test(ip) ||
      /^192\.168\./.test(ip) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
      /^169\.254\./.test(ip) || // lien-local -- inclut les métadonnées cloud (AWS/GCP/Azure)
      /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip) || // CGNAT 100.64.0.0/10
      ip === "0.0.0.0"
    );
  }
  if (type === 6) {
    const h = ip.toLowerCase();
    return (
      h === "::1" ||
      h.startsWith("fe80:") || // lien-local IPv6
      h.startsWith("fc") ||
      h.startsWith("fd") || // ULA IPv6 (fc00::/7)
      h === "::"
    );
  }
  return false;
}

function hostnameSuspect(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h.endsWith(".local") || h.endsWith(".internal");
}

// Vérifie qu'une URL est sûre à atteindre : rejette les hostnames suspects
// d'entrée, PUIS résout le DNS et rejette si une IP obtenue est interne.
// Utilisé à la fois sur l'URL de départ et sur chaque redirection suivie.
async function urlEstAutorisee(cible: URL): Promise<boolean> {
  if (cible.protocol !== "http:" && cible.protocol !== "https:") return false;
  if (hostnameSuspect(cible.hostname)) return false;

  // Si le hostname est déjà une IP littérale, pas besoin de résolution DNS.
  if (isIP(cible.hostname)) {
    return !ipEstInterne(cible.hostname);
  }

  try {
    const adresses = await dnsLookup(cible.hostname, { all: true });
    if (adresses.length === 0) return false;
    return adresses.every((a) => !ipEstInterne(a.address));
  } catch {
    // Échec de résolution DNS : on refuse plutôt que de risquer de laisser
    // passer une cible qu'on n'a pas pu vérifier.
    return false;
  }
}

function extraireMeta(html: string, propriete: string): string | null {
  // Deux ordres d'attributs possibles (property="og:title" content="..."
  // OU content="..." property="og:title") -- les deux existent en pratique
  // selon comment le site a généré son HTML.
  const motifs = [
    new RegExp(`<meta[^>]+property=["']${propriete}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${propriete}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${propriete}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${propriete}["']`, "i"),
  ];
  for (const motif of motifs) {
    const trouve = html.match(motif);
    if (trouve?.[1]) return trouve[1];
  }
  return null;
}

export async function GET(request: NextRequest) {
  const urlBrute = request.nextUrl.searchParams.get("url");
  if (!urlBrute) {
    return NextResponse.json({ erreur: "Paramètre url manquant" }, { status: 400 });
  }

  let cible: URL;
  try {
    cible = new URL(urlBrute);
  } catch {
    return NextResponse.json({ erreur: "URL invalide" }, { status: 400 });
  }

  if (!(await urlEstAutorisee(cible))) {
    return NextResponse.json({ erreur: "Cible non autorisée" }, { status: 400 });
  }

  const controleur = new AbortController();
  const delai = setTimeout(() => controleur.abort(), DELAI_MAX_MS);

  try {
    // redirect: "manual" -- on suit les redirections nous-mêmes ci-dessous
    // pour pouvoir revalider CHAQUE nouvelle destination (urlEstAutorisee),
    // pas seulement l'URL de départ. Sans ça, un site externe pouvait
    // rediriger vers une adresse interne et la faire atteindre sans
    // aucune revérification.
    let reponse: Response | undefined;
    let sauts = 0;
    while (true) {
      reponse = await fetch(cible.toString(), {
        signal: controleur.signal,
        redirect: "manual",
        headers: {
          // Beaucoup de sites servent une page allégée (voire bloquent) sans
          // en-tête User-Agent ressemblant à un navigateur.
          "User-Agent":
            "Mozilla/5.0 (compatible; DjiguigneLinkPreview/1.0; +https://djiguigne.com)",
          Accept: "text/html",
        },
      });

      const estRedirection = reponse.status >= 300 && reponse.status < 400;
      if (!estRedirection) break;

      sauts += 1;
      if (sauts > NB_REDIRECTIONS_MAX) {
        return NextResponse.json({ erreur: "Trop de redirections" }, { status: 502 });
      }

      const emplacement = reponse.headers.get("location");
      if (!emplacement) break;

      let prochaineCible: URL;
      try {
        prochaineCible = new URL(emplacement, cible.toString());
      } catch {
        return NextResponse.json({ erreur: "Redirection invalide" }, { status: 502 });
      }

      if (!(await urlEstAutorisee(prochaineCible))) {
        return NextResponse.json({ erreur: "Cible non autorisée" }, { status: 400 });
      }

      cible = prochaineCible;
    }

    if (!reponse || !reponse.ok || !reponse.body) {
      return NextResponse.json({ erreur: `Cible a répondu ${reponse?.status ?? "?"}` }, { status: 502 });
    }

    // Lecture bornée : on n'a besoin que du <head>, jamais de toute la
    // page (certaines pages font plusieurs Mo).
    const lecteur = reponse.body.getReader();
    let recu = 0;
    let html = "";
    const decodeur = new TextDecoder();
    while (recu < TAILLE_MAX_OCTETS) {
      const { done, value } = await lecteur.read();
      if (done) break;
      recu += value.byteLength;
      html += decodeur.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    controleur.abort(); // on a ce qu'il faut, pas la peine de continuer le téléchargement

    const titre = extraireMeta(html, "og:title") || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || null;
    let image = extraireMeta(html, "og:image");
    const description = extraireMeta(html, "og:description") || extraireMeta(html, "description");
    const siteName = extraireMeta(html, "og:site_name") || cible.hostname.replace(/^www\./, "");

    // og:image est parfois une URL relative -- rare mais arrive.
    if (image && !/^https?:\/\//i.test(image)) {
      try {
        image = new URL(image, cible.toString()).toString();
      } catch {
        image = null;
      }
    }

    if (!titre && !image) {
      // Rien d'exploitable -- LinkPreview.tsx retombe sur le lien brut.
      return NextResponse.json({ erreur: "Aucune métadonnée trouvée" }, { status: 404 });
    }

    return NextResponse.json(
      { titre, image, description, siteName, url: cible.toString() },
      { headers: { "Cache-Control": "public, max-age=3600" } } // 1h : les métadonnées d'une page changent rarement
    );
  } catch {
    return NextResponse.json({ erreur: "Échec de récupération" }, { status: 502 });
  } finally {
    clearTimeout(delai);
  }
}

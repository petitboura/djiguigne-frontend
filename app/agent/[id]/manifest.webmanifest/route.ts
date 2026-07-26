import { NextResponse } from "next/server";
import { appelerApiPublicOuNull } from "@/lib/api-serveur";

// Bourama (2026-07-15) : chaque IA installable séparément, avec son
// propre nom/icône -- "tu clique sur cette appli, tu ouvres une IA comme
// GPT ou autre". `scope` borne cette installation aux pages de CET
// agent, `start_url` pointe direct sur son chat (pas la fiche) : ouvrir
// l'icône doit lancer la conversation, pas une page intermédiaire.
//
// Nuance importante (voir échange avec Bourama) : ce comportement est
// fiable sur iOS (metadata par page, voir generateMetadata dans
// app/agent/[id]/chat/page.tsx) mais moins prévisible sur Android/Chrome
// -- certaines versions installeront quand même l'app "Djiguignè AI"
// racine plutôt que cette IA en particulier.
//
// `id` ajouté le 26/07/2026 : sans ce champ, un seul "id" d'appli
// implicite par site (déduit du scope) faisait qu'installer un agent
// après avoir déjà installé la plateforme racine (ou l'inverse)
// remplaçait l'un par l'autre au lieu de coexister. Un `id` distinct par
// agent, différent de celui de app/manifest.ts, donne à Chrome de quoi
// les distinguer. Toujours pas garanti à 100% sur toutes les versions
// Android/Chrome (limite du navigateur, pas du code).

type AgentPublic = { id: string; nom: string };

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const agent = (await appelerApiPublicOuNull(`/api/agents/${params.id}`)) as AgentPublic | null;

  if (!agent) {
    return new NextResponse(null, { status: 404 });
  }

  const origine = new URL(request.url).origin;

  const manifest = {
    id: `/agent/${agent.id}/`,
    name: agent.nom,
    short_name: agent.nom,
    start_url: `/agent/${agent.id}/chat`,
    scope: `/agent/${agent.id}/`,
    display: "standalone",
    background_color: "#0b0908",
    theme_color: "#0b0908",
    icons: [
      { src: `${origine}/agent/${agent.id}/icone?taille=192`, sizes: "192x192", type: "image/png" },
      { src: `${origine}/agent/${agent.id}/icone?taille=512`, sizes: "512x512", type: "image/png" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

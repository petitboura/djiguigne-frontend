import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import { appelerApiPublicOuNull } from "@/lib/api-serveur";

// Bourama (2026-07-15) : "télécharger chaque IA avec son nom et son
// icône". image_vitrine_url est une bannière 16:9 pensée pour la fiche
// agent, pas une icône carrée -- ce route handler la recadre au centre en
// carré à la volée (pas de fichier pré-généré à stocker : une IA peut
// changer son image de vitrine à tout moment en modification, mieux vaut
// recalculer que servir une icône périmée).
export const runtime = "nodejs";

type AgentPublic = { nom: string; image_vitrine_url: string | null };

// Même cas particulier que les autres fichiers agent/[id]/* (02/08,
// Bourama) : icône dessinée à la main, jamais l'image_vitrine_url (photo
// de l'époque physique) pour cet agent précis.
const AGENTS_SANS_IMAGE_VITRINE = new Set(["math-matique"]);

function svgIconeMatrix(taille: number) {
  return `<svg width="${taille}" height="${taille}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" fill="#0b0908" />
    <g fill="none" stroke="#e8934a" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="19" x2="5" y2="3.5" />
      <path d="M3.6 6.2 L5 3.5 L6.4 6.2" />
      <line x1="5" y1="19" x2="20.5" y2="19" />
      <path d="M17.8 17.6 L20.5 19 L17.8 20.4" />
      <line x1="9" y1="18.4" x2="9" y2="19.6" />
      <line x1="13" y1="18.4" x2="13" y2="19.6" />
      <line x1="17" y1="18.4" x2="17" y2="19.6" />
      <line x1="4.4" y1="13" x2="5.6" y2="13" />
      <line x1="4.4" y1="9" x2="5.6" y2="9" />
      <path d="M6.5 16 C 9.5 6.5, 12.5 6.5, 14.5 11 S 18.5 19, 20 12.5" />
    </g>
  </svg>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taille = Math.min(Math.max(Number(request.nextUrl.searchParams.get("taille")) || 512, 32), 1024);

  if (AGENTS_SANS_IMAGE_VITRINE.has(params.id)) {
    const tampon = await sharp(Buffer.from(svgIconeMatrix(taille))).png().toBuffer();
    return new NextResponse(tampon, {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
    });
  }

  const agent = (await appelerApiPublicOuNull(`/api/agents/${params.id}`)) as AgentPublic | null;

  if (!agent?.image_vitrine_url) {
    // Pas d'image de vitrine (voir formulaire de création, champ
    // optionnel) : on retombe sur le logo général plutôt qu'une icône
    // cassée/vide.
    const logo = await fetch(new URL("/logo.png", request.url)).then((r) => r.arrayBuffer());
    const tampon = await sharp(Buffer.from(logo)).resize(taille, taille).png().toBuffer();
    return new NextResponse(tampon, {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
    });
  }

  try {
    const reponseImage = await fetch(agent.image_vitrine_url);
    const original = Buffer.from(await reponseImage.arrayBuffer());
    const tampon = await sharp(original)
      .resize(taille, taille, { fit: "cover", position: "attention" })
      .png()
      .toBuffer();

    return new NextResponse(tampon, {
      headers: {
        "Content-Type": "image/png",
        // 1h : assez court pour qu'un changement d'image de vitrine se
        // reflète vite sur l'icône, assez long pour ne pas re-traiter
        // l'image à chaque installation.
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}

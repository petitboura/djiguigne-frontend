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

function svgIconeMathMatique(taille: number) {
  return `<svg width="${taille}" height="${taille}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" fill="#0b0908" />
    <g fill="none" stroke="#e8934a" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="4.2" r="1.4" />
      <line x1="12" y1="5.6" x2="7.4" y2="19.5" />
      <line x1="12" y1="5.6" x2="16.6" y2="19.5" />
      <circle cx="7.4" cy="19.8" r="0.6" fill="#e8934a" stroke="none" />
      <circle cx="16.6" cy="19.8" r="0.6" fill="#e8934a" stroke="none" />
      <path d="M5.5 17.5 Q12 22.5 18.5 17.5" stroke-dasharray="1.2 1.6" />
    </g>
  </svg>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taille = Math.min(Math.max(Number(request.nextUrl.searchParams.get("taille")) || 512, 32), 1024);

  if (AGENTS_SANS_IMAGE_VITRINE.has(params.id)) {
    const tampon = await sharp(Buffer.from(svgIconeMathMatique(taille))).png().toBuffer();
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

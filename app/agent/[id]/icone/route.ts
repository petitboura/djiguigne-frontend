import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import { appelerApiPublicOuNull } from "@/lib/api-serveur";

// Bourama (2026-07-15) : "télécharger chaque IA avec son nom et son
// icône". Recadre icone_url au centre en carré à la volée (pas de fichier
// pré-généré à stocker : une IA peut changer son icône à tout moment en
// modification, mieux vaut recalculer que servir une icône périmée) --
// filet de sécurité même si l'upload (ChampImage/AgentCard, recadrage 1:1
// avant envoi) produit déjà normalement une image carrée.
//
// Réécrit le 2026-08-05 (demande Bourama) : basé sur icone_url (nouveau
// système d'icône générale) au lieu de image_vitrine_url (bannière 16:9,
// retirée de l'affichage). Le cas particulier "math-matique"/svgIconeMatrix
// (02/08) est retiré -- Matrix a maintenant sa propre icone_url comme
// tout agent migré.
export const runtime = "nodejs";

type AgentPublic = { nom: string; icone_url: string | null };

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taille = Math.min(Math.max(Number(request.nextUrl.searchParams.get("taille")) || 512, 32), 1024);

  const agent = (await appelerApiPublicOuNull(`/api/agents/${params.id}`)) as AgentPublic | null;

  if (!agent?.icone_url) {
    // Pas encore d'icone_url (agent pas encore migré vers le nouveau
    // système, ou champ jamais rempli) : on retombe sur le logo général
    // plutôt qu'une icône cassée/vide.
    const logo = await fetch(new URL("/logo.png", request.url)).then((r) => r.arrayBuffer());
    const tampon = await sharp(Buffer.from(logo)).resize(taille, taille).png().toBuffer();
    return new NextResponse(tampon, {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
    });
  }

  try {
    const reponseImage = await fetch(agent.icone_url);
    const original = Buffer.from(await reponseImage.arrayBuffer());
    const tampon = await sharp(original)
      .resize(taille, taille, { fit: "cover", position: "attention" })
      .png()
      .toBuffer();

    return new NextResponse(tampon, {
      headers: {
        "Content-Type": "image/png",
        // 1h : assez court pour qu'un changement d'icône se reflète vite
        // sur l'icône installée, assez long pour ne pas re-traiter
        // l'image à chaque installation.
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}

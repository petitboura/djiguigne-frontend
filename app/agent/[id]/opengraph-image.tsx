import { ImageResponse } from "next/og";
import { appelerApiPublicOuNull } from "@/lib/api-serveur";

// Chantier SEO/AEO (2026-08-01) : image de partage pour les IA qui n'ont
// pas encore d'icone_url personnalisée (generateMetadata dans page.tsx
// utilise déjà icone_url en priorité quand elle existe -- ce fichier ne
// sert que de repli, généré à la volée, aucun asset PNG à fournir ou
// maintenir). Mêmes couleurs de marque que app/manifest.ts et
// tailwind.config.ts (dj-accent-1).
//
// Réécrit le 2026-08-05 (demande Bourama) : le cas particulier
// "math-matique"/IconeMatrix (02/08) est retiré -- Matrix a maintenant sa
// propre icone_url comme tout agent migré, donc ce fichier ne la
// concerne plus. Le repli affiche désormais la même étincelle générique
// que IconeGenerique.tsx (components/icones/), jamais un emoji.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type AgentMinimal = { nom: string; description: string };

export default async function OgImageAgent({ params }: { params: { id: string } }) {
  const agent: AgentMinimal | null = await appelerApiPublicOuNull(`/api/agents/${params.id}`);

  const nom = agent?.nom || "Djiguignè AI";
  const description = agent?.description?.slice(0, 120) || "Une IA spécialisée sur Djiguignè AI.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b0908",
          padding: 80,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#e8934a" strokeWidth="1">
          <path d="M12 2.5 C 12 8, 12 8, 18.5 9.5 C 12 11, 12 11, 12 21.5 C 12 11, 12 11, 5.5 9.5 C 12 8, 12 8, 12 2.5 Z" />
          <path d="M18.5 3 C 18.5 5, 18.5 5, 21 5.5 C 18.5 6, 18.5 6, 18.5 8 C 18.5 6, 18.5 6, 16 5.5 C 18.5 5, 18.5 5, 18.5 3 Z" />
        </svg>
        <div
          style={{
            marginTop: 32,
            fontSize: 56,
            fontWeight: 800,
            color: "#F5ECE0",
            textAlign: "center",
          }}
        >
          {nom}
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 28,
            color: "#A79A8C",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          {description}
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 24,
            fontWeight: 700,
            color: "#E8934A",
          }}
        >
          Djiguignè AI
        </div>
      </div>
    ),
    { ...size }
  );
}

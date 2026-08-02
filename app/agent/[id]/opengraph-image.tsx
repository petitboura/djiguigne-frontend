import { ImageResponse } from "next/og";
import { appelerApiPublicOuNull } from "@/lib/api-serveur";

// Chantier SEO/AEO (2026-08-01) : image de partage pour les IA qui n'ont
// pas encore d'image_vitrine_url personnalisée (generateMetadata dans
// page.tsx utilise déjà image_vitrine_url en priorité quand elle existe --
// ce fichier ne sert que de repli, généré à la volée, aucun asset PNG à
// fournir ou maintenir). Mêmes couleurs de marque que app/manifest.ts et
// tailwind.config.ts (dj-accent-1).

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type AgentMinimal = { nom: string; icone_page: string; description: string };

// Même cas particulier que AgentCard.tsx / page.tsx (02/08, Bourama) :
// l'icône dessinée à la main plutôt que l'emoji, pour cet agent précis.
const AGENTS_SANS_IMAGE_VITRINE = new Set(["math-matique"]);

export default async function OgImageAgent({ params }: { params: { id: string } }) {
  const agent: AgentMinimal | null = await appelerApiPublicOuNull(`/api/agents/${params.id}`);

  const nom = agent?.nom || "Djiguignè AI";
  const icone = agent?.icone_page || "🤖";
  const description = agent?.description?.slice(0, 120) || "Une IA spécialisée sur Djiguignè AI.";
  const iconeDessinee = AGENTS_SANS_IMAGE_VITRINE.has(params.id);

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
        {iconeDessinee ? (
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#e8934a" strokeWidth="1">
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
          </svg>
        ) : (
          <div style={{ fontSize: 120, lineHeight: 1 }}>{icone}</div>
        )}
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

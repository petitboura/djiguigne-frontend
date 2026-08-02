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
            <circle cx="12" cy="4.2" r="1.4" />
            <line x1="12" y1="5.6" x2="7.4" y2="19.5" />
            <line x1="12" y1="5.6" x2="16.6" y2="19.5" />
            <circle cx="7.4" cy="19.8" r="0.6" fill="#e8934a" stroke="none" />
            <circle cx="16.6" cy="19.8" r="0.6" fill="#e8934a" stroke="none" />
            <path d="M5.5 17.5 Q12 22.5 18.5 17.5" strokeDasharray="1.2 1.6" />
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

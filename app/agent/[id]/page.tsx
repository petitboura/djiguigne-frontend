import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { appelerApiPublicOuNull } from "@/lib/api-serveur";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { BoutonUtiliser } from "@/components/BoutonUtiliser";
import { NoteAgent } from "@/components/NoteAgent";
import { CommentairesAgent } from "@/components/CommentairesAgent";
import { MisesAJourAgent } from "@/components/MisesAJourAgent";
import { BoutonPartager } from "@/components/BoutonPartager";
import { BoutonProfilCreateur } from "@/components/BoutonProfilCreateur";
import { JsonLd } from "@/components/JsonLd";

// Étape D.3 (pivot social) : page agent publique (/agent/[id], "id" sert
// de slug). Server Component pour le SSR (règle SEO/AEO/GEO
// du plan : "aucun contenu important derrière un clic", metadata via
// generateMetadata plutôt que du texte statique dans le JSX) ; les parties
// interactives (chat, note, commentaires) sont des composants clients
// isolés, hydratés par-dessus ce rendu serveur.

type AgentDetailPublic = {
  id: string;
  nom: string;
  icone_page: string;
  image_vitrine_url: string | null;
  description: string;
  owner_id: string;
  // Chantier SEO/AEO (2026-08-01) : mêmes champs que /api/feed, exposés
  // par /api/agents/{id} depuis ce même chantier -- voir
  // djiguigne-backend/api/agents.py, AgentDetailPublic. Un seul de ces
  // champs est renseigné par agent (choix fait à la création).
  matiere: string | null;
  matiere_detail: string | null;
  langue_africaine: string | null;
  metier: string | null;
  filiere: string | null;
  domaine: string | null;
};

async function chargerAgent(id: string): Promise<AgentDetailPublic | null> {
  return appelerApiPublicOuNull(`/api/agents/${id}`);
}

// Dérive un libellé de spécialité lisible à partir du premier champ
// domaine renseigné -- utilisé à la fois pour enrichir la description
// (meta + JSON-LD) et pour le champ `applicationSubCategory`. Ordre
// arbitraire mais stable ; un agent n'a en pratique qu'un seul de ces
// champs rempli.
function specialiteAgent(agent: AgentDetailPublic): string | null {
  if (agent.matiere) return agent.matiere === "Autre" ? agent.matiere_detail : agent.matiere;
  return agent.metier || agent.filiere || agent.domaine || agent.langue_africaine || null;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const agent = await chargerAgent(params.id);
  if (!agent) return { title: "IA introuvable — Djiguignè AI" };

  const specialite = specialiteAgent(agent);
  const description =
    agent.description ||
    (specialite
      ? `${agent.nom}, une IA spécialisée en ${specialite} sur Djiguignè AI.`
      : `Discute avec ${agent.nom} sur Djiguignè AI.`);

  return {
    title: specialite ? `${agent.nom} — IA spécialisée en ${specialite}` : `${agent.nom} — Djiguignè AI`,
    description,
    alternates: { canonical: `/agent/${agent.id}` },
    openGraph: agent.image_vitrine_url
      ? { images: [{ url: agent.image_vitrine_url }] }
      : undefined,
  };
}

export default async function PageAgent({ params }: { params: { id: string } }) {
  const agent = await chargerAgent(params.id);
  if (!agent) notFound();

  const specialite = specialiteAgent(agent);

  return (
    <div className="min-h-screen">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: agent.nom,
          applicationCategory: "Assistant IA",
          ...(specialite ? { applicationSubCategory: specialite } : {}),
          description:
            agent.description || (specialite ? `IA spécialisée en ${specialite}.` : undefined),
          ...(agent.image_vitrine_url ? { image: agent.image_vitrine_url } : {}),
          offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
          provider: { "@type": "Organization", name: "Djiguignè AI" },
        }}
      />

      <TopBar />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-10">
        <div className="flex gap-2">
          <BoutonRetour />
          <BoutonAccueil />
        </div>

        <div className="overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface">
          <div className="relative flex aspect-[16/9] items-center justify-center bg-dj-surface-haute">
            {agent.image_vitrine_url ? (
              <Image
                src={agent.image_vitrine_url}
                alt={agent.nom}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 768px, 100vw"
                priority
              />
            ) : (
              <span className="text-6xl">{agent.icone_page}</span>
            )}
          </div>

          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{agent.icone_page}</span>
              <h1 className="font-display text-2xl font-bold text-dj-texte">{agent.nom}</h1>
            </div>

            {agent.description && (
              <p className="text-dj-texte-muet">{agent.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <BoutonUtiliser agentId={agent.id} />
              <BoutonProfilCreateur ownerId={agent.owner_id} />
              <BoutonPartager chemin={`/agent/${agent.id}`} titre={agent.nom} />
            </div>

            <NoteAgent agentId={agent.id} />
          </div>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-bold text-dj-texte">Mises à jour</h2>
          <MisesAJourAgent agentId={agent.id} nomAgent={agent.nom} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-bold text-dj-texte">Commentaires</h2>
          <CommentairesAgent agentId={agent.id} />
        </section>
      </main>
    </div>
  );
}

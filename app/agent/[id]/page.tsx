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
};

async function chargerAgent(id: string): Promise<AgentDetailPublic | null> {
  return appelerApiPublicOuNull(`/api/agents/${id}`);
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const agent = await chargerAgent(params.id);
  if (!agent) return { title: "IA introuvable — Djiguignè AI" };

  return {
    title: `${agent.nom} — Djiguignè AI`,
    description: agent.description || `Discute avec ${agent.nom} sur Djiguignè AI.`,
    openGraph: agent.image_vitrine_url
      ? { images: [{ url: agent.image_vitrine_url }] }
      : undefined,
  };
}

export default async function PageAgent({ params }: { params: { id: string } }) {
  const agent = await chargerAgent(params.id);
  if (!agent) notFound();

  return (
    <div className="min-h-screen">
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

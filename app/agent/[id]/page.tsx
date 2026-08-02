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
import { IconeMathMatique } from "@/components/icones/IconeMathMatique";

// Même cas particulier que dans AgentCard.tsx (02/08, Bourama) : cet agent
// précis n'a ni photo ni emoji, juste l'icône dessinée.
const AGENTS_SANS_IMAGE_VITRINE = new Set(["math-matique"]);

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

// Chantier SEO/AEO (2026-08-01) : note agrégée récupérée côté serveur
// (en plus du composant client NoteAgent, qui gère l'affichage interactif
// et le vote) -- nécessaire pour injecter aggregateRating dans le JSON-LD,
// qui doit être présent dans le HTML au premier chargement pour les
// robots. Public, pas d'auth (même endpoint que NoteAgent).
type NoteAgregee = { moyenne: number | null; total: number };

async function chargerNote(id: string): Promise<NoteAgregee> {
  return (await appelerApiPublicOuNull(`/api/agents/${id}/rating`)) ?? { moyenne: null, total: 0 };
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

// Chantier SEO/AEO (2026-08-01) : questions strictement identiques d'une
// IA à l'autre (compte, gratuité, fiabilité, sécurité) -- jamais de
// contenu spécifique au domaine ici, volontairement. Un gabarit FAQ
// répété avec juste le nom du domaine changé produirait du contenu
// quasi-dupliqué à l'échelle du catalogue ; ce qui différencie une IA
// (son domaine) doit vivre dans sa description ou son article, pas dans
// une FAQ générée. Voir discussion du 01/08.
const FAQ_UNIVERSELLE = [
  {
    q: "Ai-je besoin d'un compte pour discuter avec cette IA ?",
    a: "Oui, un compte utilisateur gratuit est nécessaire pour commencer une conversation.",
  },
  {
    q: "Est-ce gratuit ?",
    a: "Le modèle tarifaire de Djiguignè AI n'est pas encore fixé — la plateforme est en phase de lancement.",
  },
  {
    q: "Comment savoir si cette IA est fiable ?",
    a: "Consulte sa note et les avis laissés par les utilisateurs qui l'ont déjà utilisée, juste au-dessus.",
  },
  {
    q: "Mes conversations sont-elles privées ?",
    a: "Oui, Djiguignè AI ne partage pas tes conversations ni tes données personnelles avec des tiers.",
  },
];

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
  const note = await chargerNote(agent.id);

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
          // Uniquement si au moins un avis existe -- ne jamais déclarer
          // aggregateRating sans avis réel (contraire aux règles Google).
          ...(note.total > 0 && note.moyenne
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: note.moyenne,
                  reviewCount: note.total,
                },
              }
            : {}),
        }}
      />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_UNIVERSELLE.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }}
      />

      <TopBar />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-10">
        <div className="flex gap-2">
          <BoutonRetour />
          <BoutonAccueil />
        </div>

        <div className="overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface">
          {!AGENTS_SANS_IMAGE_VITRINE.has(agent.id) && (
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
          )}

          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-3">
              {AGENTS_SANS_IMAGE_VITRINE.has(agent.id) ? (
                <IconeMathMatique className="h-12 w-12 shrink-0 text-dj-accent-1" />
              ) : (
                <span className="text-2xl leading-none">{agent.icone_page}</span>
              )}
              <h1 className="font-display text-2xl font-bold text-dj-texte">{agent.nom}</h1>
            </div>

            {specialite && (
              <span className="inline-flex w-fit items-center rounded-full border border-dj-bordure-forte bg-dj-surface-haute px-3 py-1 text-xs font-semibold text-dj-accent-1">
                Spécialisée en {specialite}
              </span>
            )}

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

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-bold text-dj-texte">Questions fréquentes</h2>
          <div className="flex flex-col gap-3">
            {FAQ_UNIVERSELLE.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-dj-bordure bg-dj-surface p-4 open:border-dj-bordure-forte"
              >
                <summary className="cursor-pointer list-none font-display text-sm font-semibold text-dj-texte marker:content-none">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span className="text-dj-accent-1 transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-dj-texte-muet">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

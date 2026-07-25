import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { appelerApiPublicOuNull } from "@/lib/api-serveur";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { AgentCard, type AgentResume } from "@/components/AgentCard";
import { BoutonFollow } from "@/components/BoutonFollow";
import { BoutonPartager } from "@/components/BoutonPartager";
import { SectionsPostsCreateur } from "@/components/SectionsPostsCreateur";

// Étape D.4 (pivot social) : portfolio créateur `/u/[id]` (en pratique
// user_id, pas un vrai slug — voir docstring de api/profiles.py
// ("profiles.slug... rien ne la remplit encore").
// Même structure que D.3 : Server Component pour le SSR/metadata, îlot
// client pour la partie interactive (Follow).

type ProfilDetailPublic = {
  user_id: string;
  nom_affiche: string;
  bio: string;
  avatar_url: string | null;
  agents: AgentResume[];
};

async function chargerProfil(id: string): Promise<ProfilDetailPublic | null> {
  return appelerApiPublicOuNull(`/api/profiles/${id}`);
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const profil = await chargerProfil(params.id);
  if (!profil) return { title: "Profil introuvable — Djiguignè AI" };

  const nom = profil.nom_affiche || "Créateur";
  return {
    title: `${nom} — Djiguignè AI`,
    description: profil.bio || `Découvre les agents créés par ${nom} sur Djiguignè AI.`,
  };
}

export default async function PagePortfolio({ params }: { params: { id: string } }) {
  const profil = await chargerProfil(params.id);
  if (!profil) notFound();

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-10">
        <div className="flex gap-2">
          <BoutonRetour />
          <BoutonAccueil />
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border border-dj-bordure bg-dj-surface-haute">
            {profil.avatar_url ? (
              <Image
                src={profil.avatar_url}
                alt={profil.nom_affiche || "Créateur"}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl">👤</div>
            )}
          </div>

          <h1 className="font-display text-2xl font-bold text-dj-texte">
            {profil.nom_affiche || "Créateur"}
          </h1>

          {profil.bio && <p className="max-w-md text-dj-texte-muet">{profil.bio}</p>}

          <div className="flex items-center gap-3">
            <BoutonFollow creatorId={profil.user_id} />
            <BoutonPartager
              chemin={`/u/${profil.user_id}`}
              titre={profil.nom_affiche || "Créateur"}
            />
          </div>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-bold text-dj-texte">
            Agents créés ({profil.agents.length})
          </h2>

          {profil.agents.length === 0 ? (
            <p className="text-sm text-dj-texte-muet">Aucune IA publiée pour l'instant.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {profil.agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </section>

        <SectionsPostsCreateur userId={profil.user_id} />
      </main>
    </div>
  );
}

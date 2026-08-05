"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { appelerApi } from "@/lib/api";
import { AgentCard, type AgentResume } from "@/components/AgentCard";
import { TopBar } from "@/components/TopBar";
import { BoutonFollow } from "@/components/BoutonFollow";
import { BoutonPartager } from "@/components/BoutonPartager";
import { HistoriqueConversations } from "@/components/HistoriqueConversations";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { ModalePublierPost } from "@/components/ModalePublierPost";

// Refonte du 2026-07-12 (Bourama) : "Mon espace" doit ressembler
// EXACTEMENT au portfolio public tel que tout le monde le voit
// (/u/[id]) -- même avatar/nom/bio/agents -- sauf que :
// - pas de bouton "Suivre" (on ne se suit pas soi-même, déjà géré par
//   BoutonFollow lui-même, voir components/BoutonFollow.tsx)
// - le nombre d'abonnés reste visible (bug corrigé le même jour :
//   BoutonFollow masquait aussi le compteur pour son propre profil,
//   pas seulement le bouton)
//
// 4 boutons ajoutés ("Modifier le profil", "Modifier une IA",
// "Publier un article", "Amis et Analytique") : AUCUN n'était branché au
// départ, sur demande explicite de Bourama ("pour l'instant met les
// boutons, et un message qui s'affiche avant branchement" -- brancher un
// par un après). "Modifier le profil" branché le 2026-07-12. "Publier un
// article" branché le 2026-07-15 (ouvre ModalePublierPost, voir
// BOUTONS_PUBLICATION ci-dessous), en même temps que les deux nouveaux
// boutons Histoire/Réflexion demandés ce jour-là. "Amis" et "Analytique"
// restent des placeholders.

type ProfilMoi = {
  user_id: string;
  nom_affiche: string;
  bio: string;
  avatar_url: string | null;
  agents: AgentResume[];
};

const BOUTONS_ESPACE = ["Amis", "Analytique"] as const;

// Types de publication (2026-07-15) : chacun ouvre ModalePublierPost avec
// le type correspondant -- voir api/posts.py pour les règles exactes de
// chaque type.
const BOUTONS_PUBLICATION = [
  { libelle: "Publier un article", type: "article" as const },
  { libelle: "Histoire", type: "histoire" as const },
  { libelle: "Réflexion", type: "reflexion" as const },
];

export default function PageDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);
  const [profil, setProfil] = useState<ProfilMoi | null>(null);
  const [messageBouton, setMessageBouton] = useState<string | null>(null);
  const [bulleAgentsOuverte, setBulleAgentsOuverte] = useState(false);
  const [bulleMajOuverte, setBulleMajOuverte] = useState(false);
  const [bulleHistoriqueOuverte, setBulleHistoriqueOuverte] = useState(false);
  const [modalePostOuverte, setModalePostOuverte] = useState<"article" | "reflexion" | "histoire" | null>(
    null
  );
  const [messagePublication, setMessagePublication] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/connexion");
        return;
      }
      setSession(session);
    });
  }, [router]);

  useEffect(() => {
    if (!session) return;
    // GET /api/profiles/{user_id} sert aussi bien au portfolio public
    // (Étape D.4) qu'ici -- même endpoint, mêmes données. 404 tolérée
    // (pas encore de ligne `profiles` tant que la page
    // /dashboard/profil/modifier n'a jamais été enregistrée) : profil
    // vide plutôt qu'une erreur bloquante.
    appelerApi(`/api/profiles/${session.user.id}`)
      .then((r: ProfilMoi) => setProfil(r))
      .catch(() =>
        setProfil({
          user_id: session.user.id,
          nom_affiche: "",
          bio: "",
          avatar_url: null,
          agents: [],
        })
      );
  }, [session]);

  function cliquerBouton(libelle: string) {
    setMessageBouton(`« ${libelle} » arrive bientôt, pas encore branché.`);
  }

  if (session === undefined || session === null) return null;

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-5 py-10">
        <div className="flex gap-2">
          <BoutonRetour />
          <BoutonAccueil />
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border border-dj-bordure bg-dj-surface-haute">
            {profil?.avatar_url ? (
              <Image
                src={profil.avatar_url}
                alt={profil.nom_affiche || "Moi"}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl">👤</div>
            )}
          </div>

          <h1 className="font-display text-2xl font-bold text-dj-texte">
            {profil?.nom_affiche || "Mon espace"}
          </h1>

          {profil?.bio && <p className="max-w-md text-dj-texte-muet">{profil.bio}</p>}

          {profil && (
            <div className="flex flex-wrap items-center gap-3">
              <BoutonPartager
                chemin={`/u/${profil.user_id}`}
                titre={profil.nom_affiche || "Mon portfolio"}
              />
              {/* Demande de Bourama (2026-07-15) : un bouton pour voir son
                  propre profil PUBLIC, tel que les visiteurs le voient --
                  "Mon espace" y ressemble déjà beaucoup mais reste la vue
                  propriétaire (boutons d'édition, etc.), pas la vraie
                  page /u/[id] que tout le monde voit. */}
              <Link
                href={`/u/${profil.user_id}`}
                className="flex items-center gap-1.5 rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Voir mon profil public
              </Link>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setBulleHistoriqueOuverte((v) => !v)}
                className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
              >
                Historique
              </button>

              {bulleHistoriqueOuverte && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setBulleHistoriqueOuverte(false)}
                />
              )}
              <div
                className={
                  "absolute left-1/2 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top -translate-x-1/2 overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface shadow-xl transition-all duration-150 ease-out " +
                  (bulleHistoriqueOuverte
                    ? "translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none -translate-y-1 scale-95 opacity-0")
                }
              >
                <HistoriqueConversations />
              </div>
            </div>

            {BOUTONS_PUBLICATION.map(({ libelle, type }) => (
              <button
                key={libelle}
                type="button"
                onClick={() => setModalePostOuverte(type)}
                className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
              >
                {libelle}
              </button>
            ))}

            <Link
              href="/dashboard/profil/modifier"
              className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
            >
              Modifier le profil
            </Link>

            <Link
              href="/dashboard/memoire"
              className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
            >
              Ma mémoire
            </Link>

            {BOUTONS_ESPACE.map((libelle) => (
              <button
                key={libelle}
                type="button"
                onClick={() => cliquerBouton(libelle)}
                className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
              >
                {libelle}
              </button>
            ))}
          </div>
          {messageBouton && (
            <p className="text-sm text-dj-texte-muet">{messageBouton}</p>
          )}
          {messagePublication && (
            <p className="text-sm text-dj-texte-muet">{messagePublication}</p>
          )}
        </div>

        {modalePostOuverte && (
          <ModalePublierPost
            type={modalePostOuverte}
            onClose={() => setModalePostOuverte(null)}
            onPublie={() => setMessagePublication("Publié ✓")}
          />
        )}

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-dj-texte">
              IA créées ({profil?.agents.length ?? 0})
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBulleAgentsOuverte((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
                >
                  {/* Icône crayon en currentColor : exactement la même
                      couleur que le texte du bouton, jamais l'accent --
                      voir demande de Bourama ("pas en couleur, exactement
                      le même couleur que le texte"). */}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                  Modifier une IA
                </button>

                {bulleAgentsOuverte && (
                  <>
                    {/* Zone invisible plein écran pour fermer la bulle en
                        cliquant n'importe où ailleurs -- plus simple qu'un
                        listener global (pas de fuite à nettoyer). */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setBulleAgentsOuverte(false)}
                    />
                    <div className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-dj-bordure bg-dj-surface p-2 shadow-xl">
                      {!profil || profil.agents.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-dj-texte-muet">
                          Aucune IA créée pour l&apos;instant.
                        </p>
                      ) : (
                        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                          {profil.agents.map((agent) => (
                            <Link
                              key={agent.id}
                              href={`/dashboard/agents/${agent.id}/modifier`}
                              onClick={() => setBulleAgentsOuverte(false)}
                              className="flex items-center gap-2 rounded-full px-3 py-2 text-left text-sm text-dj-texte transition-colors hover:bg-dj-surface-haute"
                            >
                              <span className="text-lg leading-none">
                                {agent.icone_page ?? "🤖"}
                              </span>
                              <span className="truncate">{agent.nom}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBulleMajOuverte((v) => !v)}
                  className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
                >
                  Voir les mises à jour
                </button>

                {bulleMajOuverte && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setBulleMajOuverte(false)} />
                    <div className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-dj-bordure bg-dj-surface p-2 shadow-xl">
                      {!profil || profil.agents.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-dj-texte-muet">
                          Aucune IA créée pour l&apos;instant.
                        </p>
                      ) : (
                        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                          {profil.agents.map((agent) => (
                            <Link
                              key={agent.id}
                              href={`/agent/${agent.id}#mises-a-jour`}
                              onClick={() => setBulleMajOuverte(false)}
                              className="flex items-center gap-2 rounded-full px-3 py-2 text-left text-sm text-dj-texte transition-colors hover:bg-dj-surface-haute"
                            >
                              <span className="text-lg leading-none">{agent.icone_page ?? "🤖"}</span>
                              <span className="truncate">{agent.nom}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <Link
                href="/dashboard/agents/nouveau"
                className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
              >
                + Créer une IA
              </Link>
            </div>
          </div>

          {profil === null && <p className="text-sm text-dj-texte-muet">Chargement...</p>}
          {profil?.agents.length === 0 && (
            <p className="text-sm text-dj-texte-muet">Aucune IA créée pour l'instant.</p>
          )}
          {profil && profil.agents.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {profil.agents.map((agent) => (
                <div key={agent.id} className="flex flex-col gap-2">
                  <AgentCard agent={agent} editable />
                  <div className="flex items-center gap-3">
                    <BoutonPartager
                      chemin={`/agent/${agent.id}`}
                      titre={agent.nom}
                      libelle="Partager"
                    />
                    <Link
                      href={`/dashboard/agents/${agent.id}/admin`}
                      className="text-sm text-dj-texte-muet transition-colors hover:text-dj-texte"
                    >
                      Administrer
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

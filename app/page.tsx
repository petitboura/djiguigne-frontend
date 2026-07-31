"use client";

import { useEffect, useState } from "react";
import { appelerApi } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { AgentCard, type AgentResume } from "@/components/AgentCard";
import { CreateurCard, type CreateurResume } from "@/components/CreateurCard";
import { PopupCategories, type Categorie } from "@/components/PopupCategories";
import { PostCard, type PostResume } from "@/components/PostCard";
import { messageErreur } from "@/lib/erreurs";

// Étape D.2 (pivot social) : "/" est le feed PUBLIC, pas une page qui
// exige une connexion — c'est un
// changement par rapport à l'ancienne page.tsx de l'Étape D.1, qui
// redirigeait tout visiteur non connecté vers /connexion. Cette vérification
// de session (E2E Supabase -> FastAPI) avait rempli son rôle de preuve de
// fonctionnement ; elle n'est plus nécessaire comme page d'accueil.
//
// Onglet Créateurs ajouté le 2026-07-13 (demande de Bourama) : à côté du
// feed d'agents existant, un second onglet liste les créateurs de la
// plateforme (GET /api/creators, nouveau). Un seul état de page actif à
// la fois (`ongletActif`) — les deux feeds gardent leur propre état de
// pagination indépendant pour ne pas perdre la position en changeant
// d'onglet puis en y revenant.
//
// Article / Réflexion / Histoire ajoutés le 2026-07-15 (Bourama) : même
// principe, 3 feeds de plus (GET /api/posts?type=...), chacun avec sa
// propre pagination. Les onglets passent de "boutons pilule" à "onglets
// texte + ligne de couleur en dessous pour l'actif" (même demande) --
// nouveau composant Onglet ci-dessous pour ne pas répéter ce style 5 fois.

const LIMITE = 20;

type Onglet = "agents" | "createurs" | "article" | "reflexion" | "histoire";
type TypePost = "article" | "reflexion" | "histoire";

type EtatFeed =
  | { statut: "chargement" }
  | { statut: "ok"; agents: AgentResume[]; page: number; total: number }
  | { statut: "erreur"; message: string };

type EtatFeedCreateurs =
  | { statut: "chargement" }
  | { statut: "ok"; createurs: CreateurResume[]; page: number; total: number }
  | { statut: "erreur"; message: string };

type EtatFeedPosts =
  | { statut: "chargement" }
  | { statut: "ok"; posts: PostResume[] }
  | { statut: "erreur"; message: string };

type EtatRecherche =
  | { statut: "inactif" }
  | { statut: "chargement" }
  | { statut: "ok"; agents: AgentResume[]; createurs: CreateurResume[] }
  | { statut: "erreur"; message: string };

export default function PageAccueil() {
  const [ongletActif, setOngletActif] = useState<Onglet>("agents");

  const [feed, setFeed] = useState<EtatFeed>({ statut: "chargement" });
  const [page, setPage] = useState(1);
  // Filtre par catégorie (Bourama, 2026-07-15) : "pas tout en même temps"
  // -- clic sur une catégorie dans le popup, filtre le feed SUR PLACE
  // (pas de nouvelle page/route), remet la pagination à 1.
  const [categorieFiltre, setCategorieFiltre] = useState<Categorie | null>(null);
  const [popupCategoriesOuvert, setPopupCategoriesOuvert] = useState(false);

  const [feedCreateurs, setFeedCreateurs] = useState<EtatFeedCreateurs>({ statut: "chargement" });
  const [pageCreateurs, setPageCreateurs] = useState(1);

  const [feedsPosts, setFeedsPosts] = useState<Record<TypePost, EtatFeedPosts>>({
    article: { statut: "chargement" },
    reflexion: { statut: "chargement" },
    histoire: { statut: "chargement" },
  });

  const [requete, setRequete] = useState("");
  const [recherche, setRecherche] = useState<EtatRecherche>({ statut: "inactif" });

  useEffect(() => {
    let annule = false;
    setFeed({ statut: "chargement" });

    const filtreCategorie = categorieFiltre ? `&categorie=${encodeURIComponent(categorieFiltre.id)}` : "";
    appelerApi(`/api/feed?page=${page}&limite=${LIMITE}${filtreCategorie}`)
      .then((reponse) => {
        if (annule) return;
        setFeed({ statut: "ok", agents: reponse.agents, page: reponse.page, total: reponse.total });
      })
      .catch((e) => {
        if (annule) return;
        setFeed({
          statut: "erreur",
          message: messageErreur(e),
        });
      });

    return () => {
      annule = true;
    };
  }, [page, categorieFiltre]);

  useEffect(() => {
    if (ongletActif !== "createurs") return;

    let annule = false;
    setFeedCreateurs({ statut: "chargement" });

    appelerApi(`/api/creators?page=${pageCreateurs}&limite=${LIMITE}`)
      .then((reponse) => {
        if (annule) return;
        setFeedCreateurs({
          statut: "ok",
          createurs: reponse.createurs,
          page: reponse.page,
          total: reponse.total,
        });
      })
      .catch((e) => {
        if (annule) return;
        setFeedCreateurs({
          statut: "erreur",
          message: messageErreur(e),
        });
      });

    return () => {
      annule = true;
    };
  }, [ongletActif, pageCreateurs]);

  // Un seul feed posts chargé à la fois (celui de l'onglet actif), pas les
  // 3 en même temps — même logique paresseuse que le feed créateurs
  // ci-dessus. Pas de pagination pour l'instant (limite haute, page 1
  // fixe) : le volume attendu au lancement de la fonctionnalité reste
  // faible, à revoir si ça devient nécessaire.
  useEffect(() => {
    if (ongletActif !== "article" && ongletActif !== "reflexion" && ongletActif !== "histoire") return;
    const type = ongletActif;

    let annule = false;
    setFeedsPosts((f) => ({ ...f, [type]: { statut: "chargement" } }));

    appelerApi(`/api/posts?type=${type}&page=1&limite=${LIMITE}`)
      .then((reponse: PostResume[]) => {
        if (annule) return;
        setFeedsPosts((f) => ({ ...f, [type]: { statut: "ok", posts: reponse } }));
      })
      .catch((e) => {
        if (annule) return;
        setFeedsPosts((f) => ({
          ...f,
          [type]: { statut: "erreur", message: messageErreur(e) },
        }));
      });

    return () => {
      annule = true;
    };
  }, [ongletActif]);

  // Recherche débouncée : on attend que la personne arrête de taper
  // (300ms) avant d'appeler l'API, et on annule une recherche en vol si une
  // nouvelle frappe arrive entre-temps (évite qu'une réponse lente écrase
  // le résultat d'une requête plus récente).
  useEffect(() => {
    const q = requete.trim();
    if (q.length < 2) {
      setRecherche({ statut: "inactif" });
      return;
    }

    let annule = false;
    setRecherche({ statut: "chargement" });

    const minuteur = setTimeout(() => {
      appelerApi(`/api/search?q=${encodeURIComponent(q)}`)
        .then((reponse) => {
          if (annule) return;
          setRecherche({ statut: "ok", agents: reponse.agents, createurs: reponse.createurs });
        })
        .catch((e) => {
          if (annule) return;
          setRecherche({
            statut: "erreur",
            message: messageErreur(e),
          });
        });
    }, 300);

    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
  }, [requete]);

  const rechercheActive = requete.trim().length >= 2;

  return (
    <>
      <TopBar />

      <main className="mx-auto max-w-5xl px-5 py-14">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-dj-texte sm:text-4xl">
            Découvre les agents IA de la communauté
          </h1>
          <p className="mt-3 text-dj-texte-muet">
            Cherche un agent par nom, ou explore ceux publiés récemment.
          </p>

          <div className="mt-7">
            <input
              type="search"
              value={requete}
              onChange={(e) => setRequete(e.target.value)}
              placeholder="Chercher une IA ou un créateur…"
              className="w-full rounded-full border border-dj-bordure bg-dj-surface px-5 py-3 text-dj-texte placeholder:text-dj-texte-muet outline-none focus:border-dj-accent-1"
            />
          </div>
        </div>

        <div className="mt-12">
          {rechercheActive ? (
            <ResultatsRecherche etat={recherche} />
          ) : (
            <>
              <div className="mb-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-b border-dj-bordure pb-0">
                <div className="flex flex-wrap justify-center gap-x-6">
                  <Onglet actif={ongletActif === "agents"} onClick={() => setOngletActif("agents")}>
                    IA
                  </Onglet>
                  <Onglet actif={ongletActif === "createurs"} onClick={() => setOngletActif("createurs")}>
                    Créateurs
                  </Onglet>
                  <Onglet actif={ongletActif === "article"} onClick={() => setOngletActif("article")}>
                    Article
                  </Onglet>
                  <Onglet actif={ongletActif === "reflexion"} onClick={() => setOngletActif("reflexion")}>
                    Réflexion
                  </Onglet>
                  <Onglet actif={ongletActif === "histoire"} onClick={() => setOngletActif("histoire")}>
                    Histoire
                  </Onglet>
                </div>

                {/* Bouton catégories : laissé exactement tel quel (Bourama,
                    2026-07-15 : "le bouton catégorie lui reste") --
                    volontairement carré/à icône, PAS un onglet, pour
                    signaler visuellement que c'est un filtre à part et non
                    une 6e section. mb-3 pour compenser l'absence de
                    border-b-2 des Onglet ci-dessus (sinon désaligné
                    verticalement avec eux). */}
                <button
                  onClick={() => setPopupCategoriesOuvert(true)}
                  className="mb-3 flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-sm text-dj-texte-muet transition-colors hover:border-dj-accent-1 hover:text-dj-texte"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                  {categorieFiltre ? categorieFiltre.nom : "Catégories"}
                </button>

                {categorieFiltre && (
                  <button
                    onClick={() => {
                      setCategorieFiltre(null);
                      setPage(1);
                    }}
                    aria-label="Retirer le filtre de catégorie"
                    className="mb-3 text-dj-texte-muet transition-colors hover:text-dj-texte"
                  >
                    ✕
                  </button>
                )}
              </div>

              <PopupCategories
                ouvert={popupCategoriesOuvert}
                onFermer={() => setPopupCategoriesOuvert(false)}
                categorieActuelleId={categorieFiltre?.id}
                seulementUtilisees
                onChoisir={(c) => {
                  setCategorieFiltre(c);
                  setPage(1);
                  setOngletActif("agents");
                }}
              />

              {ongletActif === "agents" && (
                <GrilleFeed etat={feed} page={page} onChangerPage={setPage} />
              )}
              {ongletActif === "createurs" && (
                <GrilleCreateurs
                  etat={feedCreateurs}
                  page={pageCreateurs}
                  onChangerPage={setPageCreateurs}
                />
              )}
              {(ongletActif === "article" || ongletActif === "reflexion" || ongletActif === "histoire") && (
                <GrillePosts etat={feedsPosts[ongletActif]} type={ongletActif} />
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

function Onglet({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  // Demande Bourama, 2026-07-15 : "plus de bouton mais comme onglet avec
  // ligne de couleur en dessous", le reste du texte "vide" (aucun fond,
  // aucune bordure). border-b-2 transparent au repos pour garder la même
  // hauteur qu'actif et éviter que le contenu ne saute d'1-2px au clic.
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-1 pb-3 text-sm transition-colors ${
        actif
          ? "border-dj-accent-1 font-medium text-dj-texte"
          : "border-transparent text-dj-texte-muet hover:text-dj-texte"
      }`}
    >
      {children}
    </button>
  );
}

function GrillePosts({ etat, type }: { etat: EtatFeedPosts; type: TypePost }) {
  const messagesVides: Record<TypePost, string> = {
    article: "Aucun article publié pour l'instant.",
    reflexion: "Aucune réflexion partagée pour l'instant.",
    histoire: "Aucune histoire publiée pour l'instant.",
  };

  if (etat.statut === "chargement") {
    return <EtatVide message="Chargement…" />;
  }

  if (etat.statut === "erreur") {
    return <EtatVide message="Impossible de charger pour le moment." details={etat.message} />;
  }

  if (etat.posts.length === 0) {
    return <EtatVide message={messagesVides[type]} />;
  }

  const colonnes = type === "reflexion" ? "sm:grid-cols-2" : "sm:grid-cols-2 md:grid-cols-3";

  return (
    <div className={`grid grid-cols-1 gap-5 ${colonnes}`}>
      {etat.posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function GrilleFeed({
  etat,
  page,
  onChangerPage,
}: {
  etat: EtatFeed;
  page: number;
  onChangerPage: (p: number) => void;
}) {
  if (etat.statut === "chargement") {
    return <EtatVide message="Chargement des IA…" />;
  }

  if (etat.statut === "erreur") {
    return (
      <EtatVide
        message="Impossible de charger le feed pour le moment."
        details={etat.message}
      />
    );
  }

  if (etat.agents.length === 0) {
    return <EtatVide message="Aucune IA publiée pour l'instant." />;
  }

  const dernierePage = Math.ceil(etat.total / LIMITE);

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        {etat.agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {dernierePage > 1 && (
        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            onClick={() => onChangerPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-sm text-dj-texte-muet">
            Page {page} / {dernierePage}
          </span>
          <button
            onClick={() => onChangerPage(Math.min(dernierePage, page + 1))}
            disabled={page >= dernierePage}
            className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </>
  );
}

function GrilleCreateurs({
  etat,
  page,
  onChangerPage,
}: {
  etat: EtatFeedCreateurs;
  page: number;
  onChangerPage: (p: number) => void;
}) {
  if (etat.statut === "chargement") {
    return <EtatVide message="Chargement des créateurs…" />;
  }

  if (etat.statut === "erreur") {
    return (
      <EtatVide
        message="Impossible de charger les créateurs pour le moment."
        details={etat.message}
      />
    );
  }

  if (etat.createurs.length === 0) {
    return <EtatVide message="Aucun créateur pour l'instant." />;
  }

  const dernierePage = Math.ceil(etat.total / LIMITE);

  return (
    <>
      <div className="flex flex-col gap-3">
        {etat.createurs.map((createur) => (
          <CreateurCard key={createur.user_id} createur={createur} />
        ))}
      </div>

      {dernierePage > 1 && (
        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            onClick={() => onChangerPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-sm text-dj-texte-muet">
            Page {page} / {dernierePage}
          </span>
          <button
            onClick={() => onChangerPage(Math.min(dernierePage, page + 1))}
            disabled={page >= dernierePage}
            className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </>
  );
}

function ResultatsRecherche({ etat }: { etat: EtatRecherche }) {
  if (etat.statut === "chargement" || etat.statut === "inactif") {
    return <EtatVide message="Recherche…" />;
  }

  if (etat.statut === "erreur") {
    return <EtatVide message="La recherche a échoué." details={etat.message} />;
  }

  const rienTrouve = etat.agents.length === 0 && etat.createurs.length === 0;
  if (rienTrouve) {
    return <EtatVide message="Aucun résultat pour cette recherche." />;
  }

  return (
    <div className="space-y-10">
      {etat.agents.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-dj-texte-muet">
            Agents
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {etat.agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}

      {etat.createurs.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-dj-texte-muet">
            Créateurs
          </h2>
          <div className="flex flex-col gap-3">
            {etat.createurs.map((c) => (
              <CreateurCard key={c.user_id} createur={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EtatVide({ message, details }: { message: string; details?: string }) {
  return (
    <div className="rounded-2xl border border-dj-bordure bg-dj-surface px-6 py-14 text-center">
      <p className="text-dj-texte-muet">{message}</p>
      {details && <p className="mt-2 text-xs text-dj-texte-muet/70">{details}</p>}
    </div>
  );
}

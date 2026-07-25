"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { appelerApi } from "@/lib/api";
import { revaliderPortfolioPublic } from "@/app/actions";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { ChampImage } from "@/components/ChampImage";
import { NotificationsPushToggle } from "@/components/NotificationsPushToggle";

// Formulaire d'édition de profil, déplacé depuis app/dashboard/page.tsx
// le 2026-07-12 (Bourama : "Mon espace" doit maintenant ressembler au
// portfolio public vu par tout le monde, plus 4 boutons ["Modifier le
// profil", "Modifier un agent", "Publier un article", "Amis et
// Analytique"] pas encore branchés -- on les branche un par un). Le code
// de ce formulaire ne change pas, fonctionnel tel quel, juste déplacé
// pour ne pas le perdre : PAS ENCORE LIÉ depuis le bouton "Modifier le
// profil" de /dashboard, qui affiche pour l'instant un simple message
// (voir docstring de /dashboard). Prochaine étape : faire pointer ce
// bouton vers cette page.

type ProfilMoi = {
  user_id: string;
  nom_affiche: string;
  bio: string;
  avatar_url: string | null;
  notifications_proactives_actives: boolean;
};

export default function PageModifierProfil() {
  const router = useRouter();
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);

  const [nomAffiche, setNomAffiche] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  // Proactivité (25/07) : autorise SES agents (voir agents.proactivite_active
  // côté créateur, ProactiviteAgent.tsx) à relancer cet utilisateur en cas
  // d'inactivité. Double opt-in obligatoire, voir core/proactivite.py.
  const [notificationsProactives, setNotificationsProactives] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [messageProfil, setMessageProfil] = useState<string | null>(null);

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
    appelerApi(`/api/profiles/${session.user.id}`)
      .then((r: ProfilMoi) => {
        setNomAffiche(r.nom_affiche || "");
        setBio(r.bio || "");
        setAvatarUrl(r.avatar_url || "");
        setNotificationsProactives(r.notifications_proactives_actives || false);
      })
      .catch(() => {
        // 404 tolérée : pas encore de ligne `profiles` pour ce compte
        // tant que PATCH /me n'a jamais été appelé -- formulaire vide.
      });
  }, [session]);

  async function enregistrerProfil(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setMessageProfil(null);
    try {
      await appelerApi("/api/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({
          nom_affiche: nomAffiche,
          bio,
          avatar_url: avatarUrl || null,
          notifications_proactives_actives: notificationsProactives,
        }),
      });
      // Sans ça, /u/[id] pouvait montrer l'ancienne version jusqu'à 30s
      // après la sauvegarde (cache de lib/api-serveur.ts) -- voir
      // app/actions.ts. Try séparé : la sauvegarde a déjà réussi
      // juste au-dessus, un souci sur la seule revalidation ne doit pas
      // faire croire à un échec de sauvegarde.
      try {
        await revaliderPortfolioPublic(session!.user.id);
      } catch (erreurRevalidation) {
        console.error("Revalidation du portfolio public échouée :", erreurRevalidation);
      }
      setMessageProfil("Profil enregistré.");
    } catch (e) {
      setMessageProfil(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setEnregistrement(false);
    }
  }

  if (session === undefined || session === null) return null;

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-10">
        <div className="flex gap-2">
          <BoutonRetour />
          <BoutonAccueil />
        </div>
        <h1 className="font-display text-2xl font-bold text-dj-texte">Modifier le profil</h1>

        <form
          onSubmit={enregistrerProfil}
          className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6"
        >
          <div>
            <label className="block text-sm font-medium text-dj-texte-muet">Nom affiché</label>
            <input
              value={nomAffiche}
              onChange={(e) => setNomAffiche(e.target.value)}
              className="mt-1 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-dj-texte outline-none focus:border-dj-accent-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dj-texte-muet">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-dj-texte outline-none focus:border-dj-accent-1"
            />
          </div>

          <ChampImage label="Avatar" valeur={avatarUrl} onChange={setAvatarUrl} rond />

          <label className="flex items-center gap-2 text-sm text-dj-texte">
            <input
              type="checkbox"
              checked={notificationsProactives}
              onChange={(e) => setNotificationsProactives(e.target.checked)}
            />
            Autoriser mes IA à me relancer si je suis inactif
          </label>
          <p className="-mt-3 text-xs text-dj-texte-muet">
            Seules les IA dont le créateur a explicitement activé cette option pourront le faire, et uniquement si
            tu as une raison concrète de reprendre le fil (jamais une simple relance sans motif).
          </p>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={enregistrement}
              className="rounded-full bg-dj-gradient px-5 py-2 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {enregistrement ? "Enregistrement…" : "Enregistrer"}
            </button>
            {messageProfil && <span className="text-sm text-dj-texte-muet">{messageProfil}</span>}
          </div>
        </form>

        <NotificationsPushToggle />

        <SectionZoneDanger userId={session.user.id} />
      </main>
    </div>
  );
}

function SectionZoneDanger({ userId }: { userId: string }) {
  // Ajouté le 2026-07-15 (Bourama : "une section danger... il y a se
  // déconnecter, supprimer mon compte, supprimer un agent, supprimer une
  // histoire"). "Se déconnecter" vivait avant tout en bas de
  // /dashboard (voir app/dashboard/page.tsx), déplacé ici pour être
  // regroupé avec les autres actions de compte. Confirmation native
  // (window.confirm) sur les 3 actions destructrices -- cohérent avec le
  // reste du projet, aucune modale de confirmation custom n'existait
  // encore ailleurs.
  const router = useRouter();

  const [agents, setAgents] = useState<{ id: string; nom: string; icone_page?: string }[] | null>(null);
  const [histoires, setHistoires] = useState<{ id: number; titre: string | null }[] | null>(null);
  const [enSuppression, setEnSuppression] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    appelerApi(`/api/profiles/${userId}`)
      .then((r: { agents: { id: string; nom: string; icone_page?: string }[] }) => setAgents(r.agents))
      .catch(() => setAgents([]));
    appelerApi(`/api/posts?type=histoire&user_id=${userId}&limite=50`)
      .then((r: { id: number; titre: string | null }[]) => setHistoires(r))
      .catch(() => setHistoires([]));
  }, [userId]);

  async function seDeconnecter() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function supprimerAgent(agentId: string) {
    if (!window.confirm("Supprimer cet agent définitivement ? Cette action est irréversible.")) return;
    setEnSuppression(`agent-${agentId}`);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agentId}`, { method: "DELETE" });
      setAgents((a) => (a ? a.filter((x) => x.id !== agentId) : a));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setEnSuppression(null);
    }
  }

  async function supprimerHistoire(postId: number) {
    if (!window.confirm("Supprimer cette histoire définitivement ? Cette action est irréversible.")) return;
    setEnSuppression(`histoire-${postId}`);
    setErreur(null);
    try {
      await appelerApi(`/api/posts/${postId}`, { method: "DELETE" });
      setHistoires((h) => (h ? h.filter((x) => x.id !== postId) : h));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setEnSuppression(null);
    }
  }

  async function supprimerCompte() {
    if (
      !window.confirm(
        "Supprimer ton compte définitivement ? Tous tes agents, publications et données seront supprimés. Cette action est irréversible."
      )
    )
      return;
    setEnSuppression("compte");
    setErreur(null);
    try {
      await appelerApi("/api/profiles/me", { method: "DELETE" });
      await supabase.auth.signOut();
      router.push("/");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
      setEnSuppression(null);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[#F87171]/40 bg-dj-surface p-6">
      <h2 className="font-display text-base font-bold text-[#F87171]">Zone de danger</h2>

      <button
        type="button"
        onClick={seDeconnecter}
        className="self-start text-sm text-dj-texte-muet transition-colors hover:text-dj-texte"
      >
        Se déconnecter
      </button>

      <div>
        <p className="text-sm font-medium text-dj-texte">Supprimer un agent</p>
        {agents === null && <p className="mt-1 text-xs text-dj-texte-muet">Chargement…</p>}
        {agents?.length === 0 && <p className="mt-1 text-xs text-dj-texte-muet">Aucun agent créé.</p>}
        {agents && agents.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between rounded-xl border border-dj-bordure px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm text-dj-texte">
                  <span>{agent.icone_page ?? "🤖"}</span>
                  {agent.nom}
                </span>
                <button
                  type="button"
                  onClick={() => supprimerAgent(agent.id)}
                  disabled={enSuppression === `agent-${agent.id}`}
                  className="text-xs text-[#F87171] transition-opacity hover:opacity-70 disabled:opacity-50"
                >
                  {enSuppression === `agent-${agent.id}` ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-dj-texte">Supprimer une histoire</p>
        {histoires === null && <p className="mt-1 text-xs text-dj-texte-muet">Chargement…</p>}
        {histoires?.length === 0 && <p className="mt-1 text-xs text-dj-texte-muet">Aucune histoire publiée.</p>}
        {histoires && histoires.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {histoires.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-xl border border-dj-bordure px-3 py-2"
              >
                <span className="truncate text-sm text-dj-texte">{h.titre || "Sans titre"}</span>
                <button
                  type="button"
                  onClick={() => supprimerHistoire(h.id)}
                  disabled={enSuppression === `histoire-${h.id}`}
                  className="text-xs text-[#F87171] transition-opacity hover:opacity-70 disabled:opacity-50"
                >
                  {enSuppression === `histoire-${h.id}` ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}

      <div className="border-t border-dj-bordure pt-4">
        <button
          type="button"
          onClick={supprimerCompte}
          disabled={enSuppression === "compte"}
          className="rounded-full border border-[#F87171] px-4 py-2 text-sm text-[#F87171] transition-colors hover:bg-[#F87171]/10 disabled:opacity-50"
        >
          {enSuppression === "compte" ? "Suppression…" : "Supprimer mon compte"}
        </button>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Github, LayoutGrid } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { statutConnexion, demarrerConnexion } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { messageErreur } from "@/lib/erreurs";

// Ajoutée le 31/07 (Bourama : "ajoute le bouton applications dans la
// sidebar" -- pas le même bouton que celui de la barre de saisie, qui lui
// sert à EXÉCUTER une action via une appli déjà connectée pendant une
// conversation, voir BarreDeSaisie.tsx. Celui-ci gère la CONNEXION : une
// page qui liste chaque appli, explique ce que l'IA peut y faire, et
// propose de la connecter si ce n'est pas déjà fait.
//
// Reprend APPLIS_DISPONIBLES / OUTILS_DISPONIBLES de BarreDeSaisie.tsx à
// la main (même liste, dupliquée volontairement plutôt qu'importée --
// BarreDeSaisie.tsx est un composant "use client" massif avec sa propre
// logique de barre de saisie, pas fait pour être importé juste pour ces
// deux constantes). Une seule appli pour l'instant (GitHub) ; utilise le
// même moteur de connexion générique que BarreDeSaisie.tsx
// (statutConnexion / demarrerConnexion, voir lib/api.ts et
// api/connexions.py côté backend).
//
// Pas de bouton "Déconnecter" : aucune route de déconnexion n'existe
// encore côté backend (api/connexions.py n'a que statut/demarrer/finaliser)
// -- à ajouter plus tard si Bourama le demande.

const APPLICATIONS = [
  {
    nom: "github",
    label: "GitHub",
    Icone: Github,
    capacites: [
      "Explorer un dépôt GitHub",
      "Lire un fichier du dépôt",
      "Modifier un fichier du dépôt",
    ],
  },
];

export default function PageApplications() {
  const router = useRouter();
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);
  const [statuts, setStatuts] = useState<Record<string, boolean>>({});
  const [connexionEnCours, setConnexionEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

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
    Promise.all(
      APPLICATIONS.map((a) =>
        statutConnexion(a.nom)
          .then((r) => [a.nom, r.connecte] as const)
          .catch(() => [a.nom, false] as const)
      )
    ).then((resultats) => setStatuts(Object.fromEntries(resultats)));
  }, [session]);

  async function connecter(nom: string) {
    setErreur(null);
    setConnexionEnCours(nom);
    try {
      const { url } = await demarrerConnexion(nom);
      window.location.href = url;
    } catch (e) {
      setErreur(messageErreur(e));
      setConnexionEnCours(null);
    }
  }

  if (session === undefined) {
    return (
      <>
        <TopBar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-dj-texte-muet">Chargement…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-10">
        <div className="flex items-center gap-3">
          <BoutonRetour />
          <BoutonAccueil />
        </div>

        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold text-dj-texte">
            <LayoutGrid size={22} className="text-dj-accent-1" />
            Applications
          </h1>
          <p className="mt-2 text-sm text-dj-texte-muet">
            Connecte des applications tierces pour que tes IA puissent agir dessus directement
            dans la conversation.
          </p>
        </div>

        {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}

        <div className="flex flex-col gap-3">
          {APPLICATIONS.map((appli) => {
            const connecte = statuts[appli.nom];
            return (
              <div
                key={appli.nom}
                className="flex flex-col gap-4 rounded-xl border border-dj-bordure bg-dj-surface p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-dj-surface-haute">
                    <appli.Icone size={20} />
                  </span>
                  <div>
                    <p className="font-display text-base font-bold text-dj-texte">
                      {appli.label}
                    </p>
                    <p className="mt-1 text-sm text-dj-texte-muet">
                      Ce que l'IA peut y faire : {appli.capacites.join(", ")}.
                    </p>
                  </div>
                </div>

                {connecte === undefined ? (
                  <span className="text-sm text-dj-texte-muet">Vérification…</span>
                ) : connecte ? (
                  <span className="flex items-center gap-1.5 rounded-full border border-dj-bordure px-4 py-2 text-sm font-semibold text-dj-texte">
                    <Check size={16} className="text-dj-accent-1" />
                    Connecté
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => connecter(appli.nom)}
                    disabled={connexionEnCours !== null}
                    className="rounded-full bg-dj-gradient px-5 py-2 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {connexionEnCours === appli.nom ? "Connexion…" : "Connecter"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}

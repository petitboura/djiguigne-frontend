"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { statutConnexion, demarrerConnexion } from "@/lib/api";
import { APPLIS_DISPONIBLES, OUTILS_DISPONIBLES } from "@/lib/outils";
import { messageErreur } from "@/lib/erreurs";

/**
 * Extrait de app/dashboard/applications/page.tsx (2026-08-01, demande
 * Bourama : "Mon espace" -> section "Appli connectées, comme dans le
 * chat") -- juste la liste + logique de connexion, réutilisée telle
 * quelle ici ET dans /dashboard/applications (qui garde son propre
 * header/page complète). Une seule source pour ne jamais désynchroniser
 * les deux : APPLIS_DISPONIBLES/OUTILS_DISPONIBLES (lib/outils.ts) +
 * statutConnexion/demarrerConnexion (même moteur générique que
 * BarreDeSaisie.tsx).
 */
export function ApplisConnectees() {
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);
  const [statuts, setStatuts] = useState<Record<string, boolean>>({});
  const [connexionEnCours, setConnexionEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  useEffect(() => {
    if (!session) return;
    Promise.all(
      APPLIS_DISPONIBLES.map((a) =>
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
    return <p className="text-sm text-dj-texte-muet">Chargement…</p>;
  }
  if (!session) {
    return <p className="text-sm text-dj-texte-muet">Connecte-toi pour gérer tes applications.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}
      {APPLIS_DISPONIBLES.map((appli) => {
        const connecte = statuts[appli.nom];
        const capacites = OUTILS_DISPONIBLES.filter((o) => o.appli === appli.nom).map((o) => o.label);
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
                <p className="font-display text-base font-bold text-dj-texte">{appli.label}</p>
                {capacites.length > 0 && (
                  <p className="mt-1 text-sm text-dj-texte-muet">
                    Ce que l&apos;IA peut y faire : {capacites.join(", ")}.
                  </p>
                )}
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
  );
}

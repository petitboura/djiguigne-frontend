"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { appelerApi } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { messageErreur } from "@/lib/erreurs";

// Ajouté le 2026-07-21 (demande Bourama : l'utilisateur final doit pouvoir
// voir/modifier/effacer ce que la plateforme retient de lui d'une session
// à l'autre). Consomme /api/memoire (voir api/memoire.py) -- distinct du
// profil dynamique par agent (/api/agents/{id}/mon-profil, visible dans le
// panneau latéral du chat, voir SidebarChat.tsx) : ici c'est UN SEUL résumé,
// valable pour tous les agents de la plateforme (compte unifié).

export default function PageMaMemoire() {
  const router = useRouter();
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);

  const [resume, setResume] = useState("");
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
    appelerApi("/api/memoire")
      .then((r: { resume: string }) => setResume(r.resume || ""))
      .catch((e) => setErreur(messageErreur(e)))
      .finally(() => setChargement(false));
  }, [session]);

  async function enregistrer() {
    setEnregistrement(true);
    setErreur(null);
    setMessage(null);
    try {
      await appelerApi("/api/memoire", {
        method: "PATCH",
        body: JSON.stringify({ resume }),
      });
      setMessage("Mémoire enregistrée.");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  async function toutOublier() {
    if (
      !window.confirm(
        "Effacer toute ta mémoire ? La plateforme oubliera tout ce qu'elle a retenu de tes échanges passés, pour tous les agents. Cette action est irréversible."
      )
    )
      return;
    setEnregistrement(true);
    setErreur(null);
    try {
      await appelerApi("/api/memoire", { method: "DELETE" });
      setResume("");
      setMessage("Mémoire effacée.");
    } catch (e) {
      setErreur(messageErreur(e));
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
        <div>
          <h1 className="font-display text-2xl font-bold text-dj-texte">Ma mémoire</h1>
          <p className="mt-2 text-sm text-dj-texte-muet">
            Résumé de ce que la plateforme retient de tes conversations passées, pour
            personnaliser tes échanges avec n&apos;importe lequel de tes agents. Se met
            à jour automatiquement au fil des discussions — tu peux aussi le corriger
            ou l&apos;effacer toi-même ici.
          </p>
        </div>

        {chargement && <p className="text-sm text-dj-texte-muet">Chargement…</p>}

        {!chargement && (
          <div className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              rows={10}
              placeholder="Rien d'enregistré pour l'instant — ça se remplit tout seul au fil de tes conversations."
              className="w-full resize-y rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={enregistrer}
                disabled={enregistrement}
                className="rounded-full bg-dj-gradient px-5 py-2 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {enregistrement ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                onClick={toutOublier}
                disabled={enregistrement}
                className="rounded-full border border-[#F87171] px-5 py-2 text-sm text-[#F87171] transition-colors hover:bg-[#F87171]/10 disabled:opacity-50"
              >
                Tout oublier
              </button>
              {message && <span className="text-sm text-dj-texte-muet">{message}</span>}
            </div>
            {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}
          </div>
        )}
      </main>
    </div>
  );
}

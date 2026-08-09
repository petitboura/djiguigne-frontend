"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";

// Supabase redirige ici avec un token dans l'URL après le clic sur le
// lien reçu par email (voir resetPasswordForEmail sur la page
// /mot-de-passe-oublie, redirectTo pointe ici). Le SDK Supabase gère la
// session temporaire depuis ce token automatiquement (côté client) ; il
// suffit d'appeler updateUser avec le nouveau mot de passe.

export default function PageReinitialiserMotDePasse() {
  const router = useRouter();
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (motDePasse.length < 6) {
      setErreur("6 caractères minimum.");
      return;
    }

    setEnCours(true);
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setEnCours(false);

    if (error) {
      setErreur(error.message);
      return;
    }

    router.push("/connexion");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-dj-bordure bg-dj-surface p-6 shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
          <h1 className="font-display text-xl font-bold text-dj-texte">Nouveau mot de passe</h1>

          <form onSubmit={gererSoumission} className="mt-6 space-y-4">
            <ChampMotDePasse
              id="nouveau-mot-de-passe"
              value={motDePasse}
              onChange={setMotDePasse}
              label="Nouveau mot de passe"
              autoComplete="new-password"
            />

            {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}

            <button
              type="submit"
              disabled={enCours}
              className="w-full rounded-xl bg-dj-gradient px-4 py-2.5 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {enCours ? "Enregistrement…" : "Valider"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

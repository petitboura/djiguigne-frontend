"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";

export default function PageMotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });

    setEnCours(false);
    if (error) {
      setErreur(error.message);
      return;
    }
    setEnvoye(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-dj-bordure bg-dj-surface p-6 shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
          <h1 className="font-display text-xl font-bold text-dj-texte">Mot de passe oublié</h1>

          {envoye ? (
            <p className="mt-4 text-sm text-dj-texte-muet">
              Si un compte existe pour cet email, un lien de réinitialisation vient d&apos;être
              envoyé. Vérifie ta boîte mail.
            </p>
          ) : (
            <form onSubmit={gererSoumission} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-dj-texte-muet">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-dj-texte outline-none focus:border-dj-accent-1"
                />
              </div>

              {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}

              <button
                type="submit"
                disabled={enCours}
                className="w-full rounded-xl bg-dj-gradient px-4 py-2.5 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {enCours ? "Envoi…" : "Envoyer le lien"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-5 flex justify-center gap-2">
          <BoutonRetour />
          <BoutonAccueil />
        </div>
      </div>
    </main>
  );
}

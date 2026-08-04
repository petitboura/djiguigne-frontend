"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { connecterOuInscrire } from "@/lib/authFallback";
import { appelerApi } from "@/lib/api";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";
import { ChampTelephone } from "@/components/ChampTelephone";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";

type MethodeConnexion = "email" | "telephone";

export default function PageConnexion() {
  const router = useRouter();
  const [methode, setMethode] = useState<MethodeConnexion>("email");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    // Pas de compte avec ces identifiants ? On en crée un directement,
    // pas besoin de repasser par la page inscription (voir lib/authFallback.ts).
    const { error } =
      methode === "email"
        ? await connecterOuInscrire({ email, password: motDePasse })
        : await connecterOuInscrire({
            phone: telephone.replace(/\s+/g, ""),
            password: motDePasse,
          });

    setEnCours(false);

    if (error) {
      setErreur(error.message);
      return;
    }

    // Établissement/enseignant/étudiant -> atterrit sur son espace dédié
    // (tâche F, 2026-08-05) au lieu du feed public. Best-effort : un échec
    // ici (compte sans rôle, requête ratée) garde le comportement d'avant.
    try {
      const r: { role: string | null } = await appelerApi("/api/roles/moi");
      router.push(r.role ? "/dashboard/espace-role" : "/");
    } catch {
      router.push("/");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex gap-2">
          <BoutonRetour />
          <BoutonAccueil />
        </div>
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <Image src="/logo.png" alt="Djiguignè AI" width={36} height={36} priority />
          <span className="font-display text-lg font-bold tracking-tight text-dj-texte">
            Djiguignè <span className="text-dj-accent-1">AI</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-dj-bordure bg-dj-surface p-6 shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
          <h1 className="font-display text-xl font-bold text-dj-texte">Se connecter</h1>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-full border border-dj-bordure bg-dj-surface-haute p-1">
            <button
              type="button"
              onClick={() => setMethode("email")}
              className={`rounded-full py-1.5 text-sm font-medium transition-colors ${
                methode === "email"
                  ? "bg-dj-gradient text-[#1A0D02]"
                  : "text-dj-texte-muet hover:text-dj-texte"
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setMethode("telephone")}
              className={`rounded-full py-1.5 text-sm font-medium transition-colors ${
                methode === "telephone"
                  ? "bg-dj-gradient text-[#1A0D02]"
                  : "text-dj-texte-muet hover:text-dj-texte"
              }`}
            >
              Téléphone
            </button>
          </div>

          <form onSubmit={gererSoumission} className="mt-4 space-y-4">
            {methode === "email" ? (
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
            ) : (
              <ChampTelephone id="telephone" value={telephone} onChange={setTelephone} />
            )}

            <ChampMotDePasse id="mot-de-passe" value={motDePasse} onChange={setMotDePasse} />

            {methode === "email" && (
              <Link
                href="/mot-de-passe-oublie"
                className="block text-right text-xs text-dj-accent-1 hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            )}

            {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}

            <button
              type="submit"
              disabled={enCours}
              className="w-full rounded-full bg-dj-gradient px-4 py-2.5 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {enCours ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-dj-texte-muet">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-dj-accent-1 hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </main>
  );
}

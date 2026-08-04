"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { inscrireOuConnecter } from "@/lib/authFallback";
import { appelerApi } from "@/lib/api";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";
import { ChampTelephone } from "@/components/ChampTelephone";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";

type MethodeInscription = "email" | "telephone";

// Inscription standard (créateur). Le bloc rôle hiérarchique
// (établissement/enseignant/étudiant, ajouté le 2026-08-04) a été retiré
// le même jour (tâche A -- doublon avec le parcours dédié de la vitrine,
// voir djiguigne-ai/components/InscriptionEtablissements.tsx) : Bourama a
// tranché en faveur de la vitrine comme parcours canonique. Un simple lien
// y renvoie ci-dessous plutôt que de dupliquer le flow ici.
export default function PageInscription() {
  const router = useRouter();
  const [methode, setMethode] = useState<MethodeInscription>("email");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    // Ce compte existe déjà avec ces identifiants ? On connecte directement,
    // pas besoin de repasser par la page connexion (voir lib/authFallback.ts).
    const { error } =
      methode === "email"
        ? await inscrireOuConnecter({ email, password: motDePasse })
        : await inscrireOuConnecter({
            phone: telephone.replace(/\s+/g, ""),
            password: motDePasse,
          });

    if (error) {
      setEnCours(false);
      setErreur(error.message);
      return;
    }

    setEnCours(false);

    // Best-effort (tâche F, 2026-08-05) : ce parcours est le compte
    // standard, mais un rôle peut déjà exister (ex. compte recréé après
    // un rattachement fait ailleurs) -- au cas où, on respecte quand même
    // l'espace dédié plutôt que le feed public.
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
          <h1 className="font-display text-xl font-bold text-dj-texte">Créer un compte</h1>

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

            <ChampMotDePasse
              id="mot-de-passe"
              value={motDePasse}
              onChange={setMotDePasse}
              autoComplete="new-password"
            />

            {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}

            <button
              type="submit"
              disabled={enCours}
              className="w-full rounded-full bg-dj-gradient px-4 py-2.5 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {enCours ? "Création…" : "Créer mon compte"}
            </button>
          </form>

          {/* Parcours dédié (2026-08-04, tâche A) : la vitrine reste la
              source canonique pour ces 3 rôles, voir commentaire en haut
              de fichier. */}
          <p className="mt-4 border-t border-dj-bordure pt-3 text-center text-xs text-dj-texte-muet">
            Établissement, enseignant ou étudiant ?{" "}
            <a
              href="https://djiguigne-ai.vercel.app/fr/etablissements/inscription"
              className="text-dj-accent-1 hover:underline"
            >
              Inscris-toi ici
            </a>
          </p>
        </div>

        <p className="mt-5 text-center text-sm text-dj-texte-muet">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-dj-accent-1 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}

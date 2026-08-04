"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { inscrireOuConnecter } from "@/lib/authFallback";
import { appelerApi } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";
import { ChampTelephone } from "@/components/ChampTelephone";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";

type MethodeInscription = "email" | "telephone";

// Rôles hiérarchiques (2026-08-04, demande Bourama) : "standard" = comportement
// inchangé (aucune ligne role/etablissement_id/enseignant_id écrite), les
// 3 autres appellent POST /api/roles/choisir juste après la création du
// compte. Rattachement choisi ici même (menu déroulant), pas d'invitation
// -- voir api/roles.py. Pas de mise en avant visuelle demandée par
// Bourama : ce choix reste discret, en bas du formulaire standard.
type RoleChoisi = "standard" | "etablissement" | "enseignant" | "etudiant";

type CompteListe = { user_id: string; nom_affiche: string };

export default function PageInscription() {
  const router = useRouter();
  const [methode, setMethode] = useState<MethodeInscription>("email");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Bloc rôle (2026-08-04) : discret, replié sous le formulaire standard,
  // voir commentaire de type RoleChoisi plus haut.
  const [roleOuvert, setRoleOuvert] = useState(false);
  const [role, setRole] = useState<RoleChoisi>("standard");
  const [etablissements, setEtablissements] = useState<CompteListe[] | null>(null);
  const [enseignants, setEnseignants] = useState<CompteListe[] | null>(null);
  const [etablissementChoisi, setEtablissementChoisi] = useState("");
  const [enseignantChoisi, setEnseignantChoisi] = useState("");

  useEffect(() => {
    if (role === "enseignant" && etablissements === null) {
      appelerApi("/api/roles/etablissements")
        .then((r: CompteListe[]) => setEtablissements(r ?? []))
        .catch(() => setEtablissements([]));
    }
    if (role === "etudiant" && enseignants === null) {
      appelerApi("/api/roles/enseignants")
        .then((r: CompteListe[]) => setEnseignants(r ?? []))
        .catch(() => setEnseignants([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (role === "enseignant" && !etablissementChoisi) {
      setErreur("Choisis ton établissement.");
      return;
    }
    if (role === "etudiant" && !enseignantChoisi) {
      setErreur("Choisis ton enseignant.");
      return;
    }

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

    // Rattachement hiérarchique (2026-08-04) : best-effort, ne bloque pas
    // la création du compte si ça échoue -- l'utilisateur est déjà
    // inscrit à ce stade, mieux vaut le laisser entrer et corriger le
    // rôle plus tard (à la main, voir api/roles.py) qu'échouer toute
    // l'inscription pour ce second appel.
    if (role !== "standard") {
      try {
        await appelerApi("/api/roles/choisir", {
          method: "POST",
          body: JSON.stringify({
            role,
            etablissement_id: role === "enseignant" ? etablissementChoisi : undefined,
            enseignant_id: role === "etudiant" ? enseignantChoisi : undefined,
          }),
        });
      } catch (e) {
        console.error("Échec de l'attribution du rôle après inscription :", messageErreur(e));
      }
    }

    setEnCours(false);
    router.push("/");
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

            {/* Bloc rôle (2026-08-04) : discret, pas de mise en avant
                visuelle (demande Bourama) -- juste un lien texte qui
                déplie 4 options quand quelqu'un en a besoin. */}
            <div className="border-t border-dj-bordure pt-3">
              <button
                type="button"
                onClick={() => setRoleOuvert((v) => !v)}
                className="text-xs text-dj-texte-muet hover:text-dj-texte hover:underline"
              >
                {roleOuvert ? "Masquer" : "Établissement, enseignant ou étudiant ?"}
              </button>

              {roleOuvert && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { valeur: "standard", libelle: "Compte standard" },
                        { valeur: "etablissement", libelle: "Établissement" },
                        { valeur: "enseignant", libelle: "Enseignant" },
                        { valeur: "etudiant", libelle: "Étudiant" },
                      ] as { valeur: RoleChoisi; libelle: string }[]
                    ).map((option) => (
                      <button
                        key={option.valeur}
                        type="button"
                        onClick={() => setRole(option.valeur)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          role === option.valeur
                            ? "border-dj-accent-1 bg-dj-accent-1/10 text-dj-texte"
                            : "border-dj-bordure text-dj-texte-muet hover:text-dj-texte"
                        }`}
                      >
                        {option.libelle}
                      </button>
                    ))}
                  </div>

                  {role === "enseignant" && (
                    <div>
                      <label className="block text-xs font-medium text-dj-texte-muet">
                        Ton établissement
                      </label>
                      <select
                        value={etablissementChoisi}
                        onChange={(e) => setEtablissementChoisi(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
                      >
                        <option value="">
                          {etablissements === null ? "Chargement…" : "Choisir…"}
                        </option>
                        {(etablissements ?? []).map((e) => (
                          <option key={e.user_id} value={e.user_id}>
                            {e.nom_affiche}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {role === "etudiant" && (
                    <div>
                      <label className="block text-xs font-medium text-dj-texte-muet">
                        Ton enseignant
                      </label>
                      <select
                        value={enseignantChoisi}
                        onChange={(e) => setEnseignantChoisi(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
                      >
                        <option value="">
                          {enseignants === null ? "Chargement…" : "Choisir…"}
                        </option>
                        {(enseignants ?? []).map((e) => (
                          <option key={e.user_id} value={e.user_id}>
                            {e.nom_affiche}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}

            <button
              type="submit"
              disabled={enCours}
              className="w-full rounded-full bg-dj-gradient px-4 py-2.5 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {enCours ? "Création…" : "Créer mon compte"}
            </button>
          </form>
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

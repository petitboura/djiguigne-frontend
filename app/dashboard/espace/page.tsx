"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Library, History, LayoutGrid } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { appelerApi, ajouterFichiersBibliothequePersonnelle } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { HistoriqueConversations } from "@/components/HistoriqueConversations";
import { ApplisConnectees } from "@/components/ApplisConnectees";

/**
 * Page "Mon espace" (2026-08-01, demande Bourama). Revue le même jour en
 * ONGLETS (pas de scroll entre sections, une seule affichée à la fois) --
 * corrige la première version qui empilait les 3 sections verticalement.
 *
 * - Historique : réutilise HistoriqueConversations tel quel.
 * - Bibliothèque : upload MULTIPLE (plusieurs fichiers d'un coup, sans
 *   description obligatoire par fichier -- voir
 *   ajouterFichiersBibliothequePersonnelle) + liste + suppression.
 *   Documents personnels, consultables par n'importe quelle IA dans
 *   n'importe quelle conversation via l'outil consulter_bibliotheque.
 *   REVERT du 01/08 (Bourama : "les trucs uploadés dans les chats ne
 *   font pas partie [de cette liste], il n'y a que les fichiers que TU
 *   as uploadés qui y sont") : un fichier envoyé en pièce jointe dans
 *   une conversation N'APPARAÎT JAMAIS ici, quel qu'il soit (image,
 *   document, audio, vidéo) -- seuls les fichiers ajoutés explicitement
 *   via le bouton "Ajouter" ci-dessous en font partie. Distinction
 *   faite côté backend par la colonne `origine` (voir migration
 *   fichiers_uploades_origine et api/bibliotheque_utilisateur.py:lister),
 *   pas ici : cette page affiche simplement ce que l'API renvoie.
 * - Appli connectées : réutilise components/ApplisConnectees.tsx.
 */

type FichierBiblio = {
  id: string;
  nom_fichier: string;
  type_mime: string;
  description: string | null;
  url_publique: string;
  created_at: string;
};

type Onglet = "historique" | "bibliotheque" | "applis";

const ONGLETS: { id: Onglet; label: string; Icone: typeof History }[] = [
  { id: "historique", label: "Historique", Icone: History },
  { id: "bibliotheque", label: "Bibliothèque", Icone: Library },
  { id: "applis", label: "Appli connectées", Icone: LayoutGrid },
];

export default function PageMonEspace() {
  const router = useRouter();
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);
  const [onglet, setOnglet] = useState<Onglet>("historique");

  const [fichiers, setFichiers] = useState<FichierBiblio[] | null>(null);
  const [nouveauxFichiers, setNouveauxFichiers] = useState<File[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreursEnvoi, setErreursEnvoi] = useState<{ nom: string; erreur: string }[]>([]);

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
    chargerFichiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function chargerFichiers() {
    appelerApi("/api/bibliotheque")
      .then((r: FichierBiblio[]) => setFichiers(r))
      .catch(() => setFichiers([]));
  }

  async function ajouter() {
    if (nouveauxFichiers.length === 0) return;
    setEnvoi(true);
    setErreursEnvoi([]);
    try {
      const erreurs = await ajouterFichiersBibliothequePersonnelle(nouveauxFichiers);
      setErreursEnvoi(erreurs);
      setNouveauxFichiers([]);
      chargerFichiers();
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(id: string, nom: string) {
    if (!window.confirm(`Supprimer « ${nom} » de ta bibliothèque ?`)) return;
    try {
      await appelerApi(`/api/bibliotheque/${id}`, { method: "DELETE" });
      chargerFichiers();
    } catch (e) {
      window.alert(messageErreur(e));
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

        <h1 className="font-display text-2xl font-extrabold text-dj-texte">Mon espace</h1>

        <div className="flex gap-2 border-b border-dj-bordure">
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              className={
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors " +
                (onglet === o.id
                  ? "border-dj-accent-1 text-dj-texte"
                  : "border-transparent text-dj-texte-muet hover:text-dj-texte")
              }
            >
              <o.Icone size={16} />
              {o.label}
            </button>
          ))}
        </div>

        {onglet === "historique" && <HistoriqueConversations />}

        {onglet === "bibliotheque" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-dj-texte-muet">
              Les documents ajoutés ici sont personnels : toi seul y as accès, et n&apos;importe
              laquelle de tes IA peut aller les consulter pendant une conversation.
            </p>

            {fichiers === null && <p className="text-sm text-dj-texte-muet">Chargement...</p>}
            {fichiers?.length === 0 && (
              <p className="text-sm text-dj-texte-muet">Aucun document dans ta bibliothèque.</p>
            )}
            {fichiers && fichiers.length > 0 && (
              <div className="flex flex-col gap-2">
                {fichiers.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-xl border border-dj-bordure bg-dj-surface px-4 py-3"
                  >
                    <a
                      href={f.url_publique}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-dj-accent-1 hover:text-dj-accent-2"
                    >
                      {f.description || f.nom_fichier}
                    </a>
                    <button
                      onClick={() => supprimer(f.id, f.description || f.nom_fichier)}
                      className="text-xs text-dj-texte-muet transition-colors hover:text-[#F87171]"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}

            {erreursEnvoi.length > 0 && (
              <div className="flex flex-col gap-1 rounded-xl border border-[#F87171]/40 bg-[#F87171]/5 px-4 py-3">
                {erreursEnvoi.map((e) => (
                  <p key={e.nom} className="text-sm text-[#F87171]">
                    {e.nom} : {e.erreur}
                  </p>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm,video/quicktime"
                onChange={(e) => setNouveauxFichiers(Array.from(e.target.files ?? []))}
                className="text-sm text-dj-texte file:mr-3 file:rounded-full file:border file:border-dj-bordure file:bg-dj-surface-haute file:px-4 file:py-2 file:text-xs file:text-dj-texte hover:file:border-dj-bordure-forte"
              />
              <button
                type="button"
                onClick={ajouter}
                disabled={nouveauxFichiers.length === 0 || envoi}
                className="rounded-full border border-dj-bordure px-4 py-2 text-xs text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-50"
              >
                {envoi
                  ? "Envoi…"
                  : nouveauxFichiers.length > 1
                    ? `Ajouter (${nouveauxFichiers.length})`
                    : "Ajouter"}
              </button>
            </div>
          </div>
        )}

        {onglet === "applis" && <ApplisConnectees />}
      </main>
    </>
  );
}

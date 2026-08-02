"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Library, History, LayoutGrid } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { appelerApi } from "@/lib/api";
import { ajouterFichierBibliothequePersonnelle } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { HistoriqueConversations } from "@/components/HistoriqueConversations";
import { ApplisConnectees } from "@/components/ApplisConnectees";

/**
 * Nouvelle page "Mon espace" (2026-08-01, demande Bourama : remplace
 * /dashboard -- désactivée du menu, PAS supprimée, voir TopBar.tsx /
 * SidebarChat.tsx). Trois sections, rien du profil (avatar/bio/IA
 * créées/Amis/Analytique) qui vivait sur l'ancienne page :
 * - Historique : réutilise HistoriqueConversations tel quel (IA
 *   utilisées / conversations passées).
 * - Bibliothèque : upload/liste/suppression de documents PERSONNELS
 *   (niveau="utilisateur", voir api/bibliotheque_utilisateur.py côté
 *   backend) -- consultables par n'importe laquelle des IA de
 *   l'utilisateur, dans n'importe quelle conversation, via l'outil
 *   consulter_bibliotheque (manuel pour l'activer sur un message, comme
 *   les autres outils -- voir lib/outils.ts).
 * - Appli connectées : réutilise components/ApplisConnectees.tsx, même
 *   contenu que /dashboard/applications.
 */

type FichierBiblio = {
  id: string;
  nom_fichier: string;
  type_mime: string;
  description: string | null;
  url_publique: string;
  created_at: string;
};

export default function PageMonEspace() {
  const router = useRouter();
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);

  const [fichiers, setFichiers] = useState<FichierBiblio[] | null>(null);
  const [nouveauFichier, setNouveauFichier] = useState<File | null>(null);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreurBiblio, setErreurBiblio] = useState<string | null>(null);

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
    if (!nouveauFichier || !description.trim()) return;
    setEnvoi(true);
    setErreurBiblio(null);
    try {
      await ajouterFichierBibliothequePersonnelle(nouveauFichier, description.trim(), titre.trim());
      setNouveauFichier(null);
      setTitre("");
      setDescription("");
      chargerFichiers();
    } catch (e) {
      setErreurBiblio(messageErreur(e));
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
      <main className="mx-auto flex max-w-2xl flex-col gap-12 px-5 py-10">
        <div className="flex items-center gap-3">
          <BoutonRetour />
          <BoutonAccueil />
        </div>

        <div>
          <h1 className="font-display text-2xl font-extrabold text-dj-texte">Mon espace</h1>
        </div>

        {/* Historique */}
        <section className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-dj-texte">
            <History size={20} className="text-dj-accent-1" />
            Historique
          </h2>
          <HistoriqueConversations />
        </section>

        {/* Bibliothèque */}
        <section className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-dj-texte">
            <Library size={20} className="text-dj-accent-1" />
            Bibliothèque
          </h2>
          <p className="text-sm text-dj-texte-muet">
            Les documents ajoutés ici sont personnels : toi seul y as accès, et n&apos;importe
            laquelle de tes IA peut aller les consulter pendant une conversation.
          </p>

          {erreurBiblio && <p className="text-sm text-[#F87171]">{erreurBiblio}</p>}

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

          <div className="flex flex-col gap-3">
            <textarea
              placeholder="Description (obligatoire) : de quoi parle ce document ?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-2xl border border-dj-bordure bg-dj-surface px-4 py-2 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Titre (optionnel)"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                className="rounded-full border border-dj-bordure bg-dj-surface px-4 py-2 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte sm:w-1/3"
              />
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm,video/quicktime"
                onChange={(e) => setNouveauFichier(e.target.files?.[0] ?? null)}
                className="text-sm text-dj-texte file:mr-3 file:rounded-full file:border file:border-dj-bordure file:bg-dj-surface-haute file:px-4 file:py-2 file:text-xs file:text-dj-texte hover:file:border-dj-bordure-forte"
              />
              <button
                type="button"
                onClick={ajouter}
                disabled={!nouveauFichier || !description.trim() || envoi}
                className="rounded-full border border-dj-bordure px-4 py-2 text-xs text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-50"
              >
                {envoi ? "Envoi…" : "Ajouter"}
              </button>
            </div>
          </div>
        </section>

        {/* Appli connectées */}
        <section className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-dj-texte">
            <LayoutGrid size={20} className="text-dj-accent-1" />
            Appli connectées
          </h2>
          <ApplisConnectees />
        </section>
      </main>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Library, History, LayoutGrid, Link as IconLien, FileText, Paperclip, Image as IconImage, AudioLines as IconAudio, Video as IconVideo, Brain, Bot } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  appelerApi,
  ajouterFichiersBibliothequePersonnelle,
  ajouterLienBibliothequePersonnelle,
  ajouterTexteBibliothequePersonnelle,
} from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { HistoriqueConversations } from "@/components/HistoriqueConversations";
import { ApplisConnectees } from "@/components/ApplisConnectees";
import { MaMemoire } from "@/components/MaMemoire";
import { AgentCard, type AgentResume } from "@/components/AgentCard";
import { BoutonPartager } from "@/components/BoutonPartager";

/**
 * Page "Mon espace" (2026-08-01, demande Bourama).
 *
 * Bibliothèque revue le même jour (2e passe, "ajoute le cas des liens et
 * du texte... pas de filtre au moment de l'upload... auto la détection
 * du type... séparé en sous-onglet") :
 * - UNE SEULE zone d'ajout : fichiers (plusieurs à la fois, sélecteur
 *   classique) + une simple case où on colle/tape un lien OU un texte --
 *   le type est détecté automatiquement (URL_REGEX ci-dessous), rien à
 *   choisir avant d'ajouter. Tout peut être envoyé ensemble en un clic.
 * - Une fois ajouté, la liste se répartit en sous-onglets (Tous /
 *   Fichiers / Liens / Texte) déduits de type_mime -- pas de nouvelle
 *   colonne côté base, "text/uri-list" = lien (voir enregistrer_lien),
 *   "text/plain" = texte (voir /api/bibliotheque/texte), le reste =
 *   fichier.
 *
 * REVERT du 01/08 (1ère passe, Bourama : "les trucs uploadés dans les
 * chats ne font pas partie [de cette liste]") : reste vrai ici, la liste
 * ne remonte que ce qui est ajouté depuis cette page (voir origine côté
 * backend, api/bibliotheque_utilisateur.py:lister).
 */

const URL_REGEX = /^https?:\/\/\S+$/i;

type FichierBiblio = {
  id: string;
  nom_fichier: string;
  type_mime: string;
  description: string | null;
  url_publique: string;
  created_at: string;
};

type Onglet = "mesIA" | "historique" | "bibliotheque" | "memoire" | "applis";
type SousOngletBiblio = "tous" | "documents" | "images" | "audio" | "videos" | "liens" | "texte";

const ONGLETS: { id: Onglet; label: string; Icone: typeof History }[] = [
  { id: "mesIA", label: "Mes IA", Icone: Bot },
  { id: "historique", label: "Historique", Icone: History },
  { id: "bibliotheque", label: "Bibliothèque", Icone: Library },
  { id: "memoire", label: "Ma mémoire", Icone: Brain },
  { id: "applis", label: "Appli connectées", Icone: LayoutGrid },
];

const SOUS_ONGLETS: { id: SousOngletBiblio; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "documents", label: "Documents" },
  { id: "images", label: "Images" },
  { id: "audio", label: "Audio" },
  { id: "videos", label: "Vidéos" },
  { id: "liens", label: "Liens" },
  { id: "texte", label: "Texte" },
];

function typeDe(f: FichierBiblio): SousOngletBiblio {
  if (f.type_mime === "text/uri-list") return "liens";
  if (f.type_mime === "text/plain") return "texte";
  if (f.type_mime.startsWith("image/")) return "images";
  if (f.type_mime.startsWith("audio/")) return "audio";
  if (f.type_mime.startsWith("video/")) return "videos";
  return "documents";
}

export default function PageMonEspace() {
  const router = useRouter();
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);
  const [onglet, setOnglet] = useState<Onglet>("historique");
  const [sousOnglet, setSousOnglet] = useState<SousOngletBiblio>("tous");

  const [agents, setAgents] = useState<AgentResume[] | null>(null);
  const [estCreateur, setEstCreateur] = useState<boolean | null>(null);

  const [fichiers, setFichiers] = useState<FichierBiblio[] | null>(null);
  const [nouveauxFichiers, setNouveauxFichiers] = useState<File[]>([]);
  const [texteOuLien, setTexteOuLien] = useState("");
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
    chargerAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function chargerAgents() {
    // GET /api/profiles/{user_id} : même endpoint que l'ancien /dashboard
    // (portfolio public + Mon espace), .agents suffit ici. est_createur
    // (05/08, Bourama : "n'importe qui peut plus être créateur") pilote
    // l'affichage de l'onglet "Mes IA" -- valeur réelle uniquement pour
    // le propriétaire du profil (voir api/profiles.py).
    appelerApi(`/api/profiles/${session!.user.id}`)
      .then((r: { agents: AgentResume[]; est_createur: boolean }) => {
        setAgents(r.agents ?? []);
        setEstCreateur(!!r.est_createur);
      })
      .catch(() => {
        setAgents([]);
        setEstCreateur(false);
      });
  }

  useEffect(() => {
    if (estCreateur) setOnglet("mesIA");
  }, [estCreateur]);

  function chargerFichiers() {
    appelerApi("/api/bibliotheque")
      .then((r: FichierBiblio[]) => setFichiers(r))
      .catch(() => setFichiers([]));
  }

  const fichiersAffiches = useMemo(() => {
    if (!fichiers) return null;
    if (sousOnglet === "tous") return fichiers;
    return fichiers.filter((f) => typeDe(f) === sousOnglet);
  }, [fichiers, sousOnglet]);

  async function ajouter() {
    const texte = texteOuLien.trim();
    if (nouveauxFichiers.length === 0 && !texte) return;

    setEnvoi(true);
    setErreursEnvoi([]);
    try {
      const erreurs = nouveauxFichiers.length > 0 ? await ajouterFichiersBibliothequePersonnelle(nouveauxFichiers) : [];

      if (texte) {
        try {
          if (URL_REGEX.test(texte)) {
            await ajouterLienBibliothequePersonnelle(texte);
          } else {
            await ajouterTexteBibliothequePersonnelle(texte);
          }
        } catch (e) {
          erreurs.push({ nom: texte, erreur: messageErreur(e) });
        }
      }

      setErreursEnvoi(erreurs);
      setNouveauxFichiers([]);
      setTexteOuLien("");
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
          {ONGLETS.filter((o) => o.id !== "mesIA" || estCreateur).map((o) => (
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

        {onglet === "mesIA" && estCreateur && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-dj-texte-muet">Les IA que tu as créées.</p>
              <Link
                href="/dashboard/agents/nouveau"
                className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
              >
                + Créer une IA
              </Link>
            </div>

            {agents === null && <p className="text-sm text-dj-texte-muet">Chargement...</p>}
            {agents && agents.length === 0 && (
              <p className="text-sm text-dj-texte-muet">Aucune IA créée pour l&apos;instant.</p>
            )}
            {agents && agents.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex flex-col gap-2">
                    <AgentCard agent={agent} editable />
                    <div className="flex items-center gap-3">
                      <BoutonPartager chemin={`/agent/${agent.id}`} titre={agent.nom} libelle="Partager" />
                      <Link
                        href={`/dashboard/agents/${agent.id}/admin`}
                        className="text-sm text-dj-texte-muet transition-colors hover:text-dj-texte"
                      >
                        Administrer
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {onglet === "historique" && <HistoriqueConversations />}

        {onglet === "bibliotheque" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-dj-texte-muet">
              Les documents ajoutés ici sont personnels : toi seul y as accès, et n&apos;importe
              laquelle de tes IA peut aller les consulter pendant une conversation.
            </p>

            {/* Ajout unifié : fichiers + lien/texte détecté auto, en un seul clic */}
            <div className="flex flex-col gap-3 rounded-2xl border border-dj-bordure bg-dj-surface p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={texteOuLien}
                  onChange={(e) => setTexteOuLien(e.target.value)}
                  placeholder="Colle un lien, ou écris/colle un texte…"
                  className="flex-1 rounded-full border border-dj-bordure bg-dj-fond px-4 py-2 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte"
                />
                <label className="flex cursor-pointer items-center gap-2 rounded-full border border-dj-bordure px-4 py-2 text-xs text-dj-texte transition-colors hover:border-dj-bordure-forte">
                  <Paperclip size={14} />
                  {nouveauxFichiers.length > 0 ? `${nouveauxFichiers.length} fichier(s)` : "Joindre des fichiers"}
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm,video/quicktime"
                    onChange={(e) => setNouveauxFichiers(Array.from(e.target.files ?? []))}
                    className="hidden"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={ajouter}
                disabled={(nouveauxFichiers.length === 0 && !texteOuLien.trim()) || envoi}
                className="self-end rounded-full bg-dj-gradient px-5 py-2 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {envoi ? "Envoi…" : "Ajouter"}
              </button>
            </div>

            {erreursEnvoi.length > 0 && (
              <div className="flex flex-col gap-1 rounded-xl border border-[#F87171]/40 bg-[#F87171]/5 px-4 py-3">
                {erreursEnvoi.map((e) => (
                  <p key={e.nom} className="text-sm text-[#F87171]">
                    {e.nom} : {e.erreur}
                  </p>
                ))}
              </div>
            )}

            <div className="flex gap-1 text-xs">
              {SOUS_ONGLETS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSousOnglet(s.id)}
                  className={
                    "rounded-full px-3 py-1.5 font-semibold transition-colors " +
                    (sousOnglet === s.id
                      ? "bg-dj-surface-haute text-dj-texte"
                      : "text-dj-texte-muet hover:text-dj-texte")
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>

            {fichiersAffiches === null && <p className="text-sm text-dj-texte-muet">Chargement...</p>}
            {fichiersAffiches?.length === 0 && (
              <p className="text-sm text-dj-texte-muet">Rien ici pour l&apos;instant.</p>
            )}
            {fichiersAffiches && fichiersAffiches.length > 0 && (
              <div className="flex flex-col gap-2">
                {fichiersAffiches.map((f) => {
                  const type = typeDe(f);
                  const Icone =
                    type === "liens" ? IconLien
                    : type === "texte" ? FileText
                    : type === "images" ? IconImage
                    : type === "audio" ? IconAudio
                    : type === "videos" ? IconVideo
                    : Paperclip;
                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-dj-bordure bg-dj-surface px-4 py-3"
                    >
                      <a
                        href={f.url_publique}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 items-center gap-2 text-sm text-dj-accent-1 hover:text-dj-accent-2"
                      >
                        <Icone size={14} className="flex-shrink-0" />
                        <span className="truncate">{f.description || f.nom_fichier}</span>
                      </a>
                      <button
                        onClick={() => supprimer(f.id, f.description || f.nom_fichier)}
                        className="flex-shrink-0 text-xs text-dj-texte-muet transition-colors hover:text-[#F87171]"
                      >
                        Supprimer
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {onglet === "memoire" && <MaMemoire />}

        {onglet === "applis" && <ApplisConnectees />}
      </main>
    </>
  );
}

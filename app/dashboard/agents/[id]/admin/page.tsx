"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { appelerApi, appelerApiFichier, ajouterFichierBibliotheque } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { messageErreur } from "@/lib/erreurs";

// Page "espace admin" simplifiée (2026-08-04, demande de Bourama : "une
// autre qui cache la complexité"). Volontairement réduite à 3 champs --
// comportement, base de connaissance, bibliothèque -- contrairement à
// /dashboard/agents/[id]/modifier qui expose tout (vitrine publique,
// classification, droits, proactivité, modèles premium, profil
// utilisateur, mises à jour...). Mêmes endpoints backend, réutilisés tels
// quels : GET/PATCH /api/agents/{id}/edition (on ne lit/écrit que
// system_prompt), /documents (PDF -> RAG) et /bibliotheque. Pas de lien
// Notion ici : fait partie de la complexité volontairement cachée --
// toujours possible via /modifier pour qui en a besoin.

type AgentEditable = {
  nom: string;
  system_prompt: string;
  texte_libre: string;
};

type DocumentIndexe = { nom_stockage: string; nom_affiche: string; url: string };
type FichierBiblio = {
  id: string;
  nom_fichier: string;
  description: string | null;
  url_publique: string;
};

export default function PageAdminAgent() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);

  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [messageComportement, setMessageComportement] = useState<string | null>(null);
  const [erreurComportement, setErreurComportement] = useState<string | null>(null);

  const [texteLibre, setTexteLibre] = useState("");
  const [enregistrementTexteLibre, setEnregistrementTexteLibre] = useState(false);
  const [messageTexteLibre, setMessageTexteLibre] = useState<string | null>(null);
  const [erreurTexteLibre, setErreurTexteLibre] = useState<string | null>(null);

  const [documents, setDocuments] = useState<DocumentIndexe[] | null>(null);
  const [nouveauPdf, setNouveauPdf] = useState<File | null>(null);
  const [envoiPdf, setEnvoiPdf] = useState(false);

  const [fichiersBiblio, setFichiersBiblio] = useState<FichierBiblio[] | null>(null);
  const [nouveauFichierBiblio, setNouveauFichierBiblio] = useState<File | null>(null);
  const [titreFichierBiblio, setTitreFichierBiblio] = useState("");
  const [descriptionFichierBiblio, setDescriptionFichierBiblio] = useState("");
  const [envoiBiblio, setEnvoiBiblio] = useState(false);

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
    if (!session || !agentId) return;

    appelerApi(`/api/agents/${agentId}/edition`)
      .then((r: AgentEditable) => {
        setNom(r.nom);
        setSystemPrompt(r.system_prompt || "");
        setTexteLibre(r.texte_libre || "");
      })
      .catch((e) => setErreurChargement(messageErreur(e)))
      .finally(() => setChargement(false));

    chargerDocuments();
    chargerBibliotheque();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, agentId]);

  function chargerDocuments() {
    appelerApi(`/api/agents/${agentId}/documents`)
      .then((r: DocumentIndexe[]) => setDocuments(r))
      .catch(() => setDocuments([]));
  }

  function chargerBibliotheque() {
    appelerApi(`/api/agents/${agentId}/bibliotheque`)
      .then((r: FichierBiblio[]) => setFichiersBiblio(r))
      .catch(() => setFichiersBiblio([]));
  }

  async function enregistrerComportement(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setMessageComportement(null);
    setErreurComportement(null);
    try {
      // PATCH partiel (voir ModifierAgentPayload côté backend) : seul
      // system_prompt est envoyé, tout le reste de l'agent est inchangé.
      await appelerApi(`/api/agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify({ system_prompt: systemPrompt }),
      });
      setMessageComportement("Comportement mis à jour.");
    } catch (e) {
      setErreurComportement(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  async function enregistrerTexteLibre(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrementTexteLibre(true);
    setMessageTexteLibre(null);
    setErreurTexteLibre(null);
    try {
      await appelerApi(`/api/agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify({ texte_libre: texteLibre }),
      });
      setMessageTexteLibre("Connaissance libre mise à jour.");
    } catch (e) {
      setErreurTexteLibre(messageErreur(e));
    } finally {
      setEnregistrementTexteLibre(false);
    }
  }

  async function ajouterPdf() {
    if (!nouveauPdf) return;
    setEnvoiPdf(true);
    try {
      await appelerApiFichier(`/api/agents/${agentId}/documents`, nouveauPdf);
      setNouveauPdf(null);
      chargerDocuments();
    } catch (e) {
      window.alert(messageErreur(e));
    } finally {
      setEnvoiPdf(false);
    }
  }

  async function supprimerPdf(nomStockage: string) {
    if (!window.confirm(`Supprimer « ${nomStockage.split("__").slice(1).join("__")} » ?`)) return;
    try {
      await appelerApi(`/api/agents/${agentId}/documents/${encodeURIComponent(nomStockage)}`, {
        method: "DELETE",
      });
      chargerDocuments();
    } catch (e) {
      window.alert(messageErreur(e));
    }
  }

  async function ajouterFichierBiblio() {
    if (!nouveauFichierBiblio || !descriptionFichierBiblio.trim()) return;
    setEnvoiBiblio(true);
    try {
      await ajouterFichierBibliotheque(
        agentId,
        nouveauFichierBiblio,
        descriptionFichierBiblio.trim(),
        titreFichierBiblio.trim()
      );
      setNouveauFichierBiblio(null);
      setTitreFichierBiblio("");
      setDescriptionFichierBiblio("");
      chargerBibliotheque();
    } catch (e) {
      window.alert(messageErreur(e));
    } finally {
      setEnvoiBiblio(false);
    }
  }

  async function supprimerFichierBiblio(id: string, nom: string) {
    if (!window.confirm(`Supprimer « ${nom} » de la bibliothèque ?`)) return;
    try {
      await appelerApi(`/api/agents/${agentId}/bibliotheque/${id}`, { method: "DELETE" });
      chargerBibliotheque();
    } catch (e) {
      window.alert(messageErreur(e));
    }
  }

  if (session === undefined || session === null) return null;
  if (chargement) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <p className="px-5 py-10 text-dj-texte-muet">Chargement...</p>
      </div>
    );
  }
  if (erreurChargement) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <p className="px-5 py-10 text-[#F87171]">{erreurChargement}</p>
      </div>
    );
  }

  const champClasse =
    "mt-1 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-dj-texte outline-none focus:border-dj-accent-1";
  const labelClasse = "block text-sm font-medium text-dj-texte-muet";

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto max-w-2xl px-5 py-10">
        <div className="mb-5 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <BoutonRetour />
            <BoutonAccueil />
          </div>
          <Link
            href={`/agent/${agentId}/chat`}
            className="rounded-full border border-dj-bordure px-4 py-2 text-xs font-medium text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:text-dj-texte"
          >
            Tester
          </Link>
        </div>
        <h1 className="font-display text-2xl font-bold text-dj-texte">Administrer {nom}</h1>

        {/* Comportement */}
        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
          <h2 className="font-display text-base font-bold text-dj-texte">Comportement</h2>
          <p className="text-xs text-dj-texte-muet">
            Ce que l&apos;IA sait faire et comment elle doit se comporter.
          </p>
          <form onSubmit={enregistrerComportement} className="flex flex-col gap-4">
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={10}
              className={`${champClasse} resize-y`}
            />
            {erreurComportement && <p className="text-sm text-[#F87171]">{erreurComportement}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={enregistrement}
                className="self-start rounded-full bg-dj-gradient px-6 py-2.5 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enregistrement ? "Enregistrement…" : "Enregistrer"}
              </button>
              {messageComportement && (
                <span className="text-sm text-dj-texte-muet">{messageComportement}</span>
              )}
            </div>
          </form>
        </section>

        {/* Base de connaissance */}
        <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
          <h2 className="font-display text-base font-bold text-dj-texte">Base de connaissance</h2>
          <p className="text-xs text-dj-texte-muet">
            Tout ce que l&apos;IA sait et utilise pour répondre : texte libre et/ou documents PDF.
          </p>

          <form onSubmit={enregistrerTexteLibre} className="flex flex-col gap-3">
            <label className={labelClasse}>Texte libre</label>
            <p className="-mt-2 text-xs text-dj-texte-muet">
              Connaissance étendue qui n&apos;existe pas en PDF, ou qui change souvent.
              Aucune limite de taille.
            </p>
            <textarea
              value={texteLibre}
              onChange={(e) => setTexteLibre(e.target.value)}
              rows={8}
              className={`${champClasse} resize-y`}
            />
            {erreurTexteLibre && <p className="text-sm text-[#F87171]">{erreurTexteLibre}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={enregistrementTexteLibre}
                className="self-start rounded-full border border-dj-bordure px-5 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enregistrementTexteLibre ? "Enregistrement…" : "Enregistrer"}
              </button>
              {messageTexteLibre && (
                <span className="text-sm text-dj-texte-muet">{messageTexteLibre}</span>
              )}
            </div>
          </form>

          <div className="flex flex-col gap-3 border-t border-dj-bordure pt-4">
            <label className={labelClasse}>Documents PDF</label>

          {documents && documents.length > 0 && (
            <div className="flex flex-col gap-2">
              {documents.map((d) => (
                <div
                  key={d.nom_stockage}
                  className="flex items-center justify-between rounded-xl border border-dj-bordure bg-dj-surface-haute px-4 py-3"
                >
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-dj-accent-1 hover:text-dj-accent-2"
                  >
                    {d.nom_affiche}
                  </a>
                  <button
                    onClick={() => supprimerPdf(d.nom_stockage)}
                    className="text-xs text-dj-texte-muet transition-colors hover:text-[#F87171]"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setNouveauPdf(e.target.files?.[0] ?? null)}
              className="text-sm text-dj-texte file:mr-3 file:rounded-full file:border file:border-dj-bordure file:bg-dj-surface-haute file:px-4 file:py-2 file:text-xs file:text-dj-texte hover:file:border-dj-bordure-forte"
            />
            <button
              type="button"
              onClick={ajouterPdf}
              disabled={!nouveauPdf || envoiPdf}
              className="rounded-full border border-dj-bordure px-4 py-2 text-xs text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-50"
            >
              {envoiPdf ? "Envoi…" : "Ajouter"}
            </button>
          </div>
          </div>
        </section>

        {/* Bibliothèque */}
        <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
          <h2 className="font-display text-base font-bold text-dj-texte">Bibliothèque</h2>
          <p className="text-xs text-dj-texte-muet">
            Fichiers que l&apos;IA peut proposer à l&apos;utilisateur (pas utilisés pour répondre,
            juste partagés).
          </p>

          {fichiersBiblio && fichiersBiblio.length > 0 && (
            <div className="flex flex-col gap-2">
              {fichiersBiblio.map((f) => (
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
                    onClick={() => supprimerFichierBiblio(f.id, f.description || f.nom_fichier)}
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
              placeholder="Description (obligatoire) : de quoi parle ce fichier, dans quel contexte l'IA doit le proposer ?"
              value={descriptionFichierBiblio}
              onChange={(e) => setDescriptionFichierBiblio(e.target.value)}
              rows={2}
              className="rounded-2xl border border-dj-bordure bg-dj-surface px-4 py-2 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Titre (optionnel)"
                value={titreFichierBiblio}
                onChange={(e) => setTitreFichierBiblio(e.target.value)}
                className="rounded-full border border-dj-bordure bg-dj-surface px-4 py-2 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte sm:w-1/3"
              />
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm,video/quicktime"
                onChange={(e) => setNouveauFichierBiblio(e.target.files?.[0] ?? null)}
                className="text-sm text-dj-texte file:mr-3 file:rounded-full file:border file:border-dj-bordure file:bg-dj-surface-haute file:px-4 file:py-2 file:text-xs file:text-dj-texte hover:file:border-dj-bordure-forte"
              />
              <button
                type="button"
                onClick={ajouterFichierBiblio}
                disabled={!nouveauFichierBiblio || !descriptionFichierBiblio.trim() || envoiBiblio}
                className="rounded-full border border-dj-bordure px-4 py-2 text-xs text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-50"
              >
                {envoiBiblio ? "Envoi…" : "Ajouter"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

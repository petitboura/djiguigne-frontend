"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { appelerApi, appelerApiFichier, ajouterFichierBibliotheque } from "@/lib/api";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { ChampImage } from "@/components/ChampImage";
import { PopupCategories, chargerCategories, type Categorie } from "@/components/PopupCategories";
import { DroitsAgent } from "@/components/DroitsAgent";
import { ProactiviteAgent } from "@/components/ProactiviteAgent";

// Étape "modifier un agent" (2026-07-12, demande de Bourama : "on ne peut
// pas modifier ces agents créés" — gros morceau manquant depuis le début
// du pivot social). Consomme GET/PATCH /api/agents/{id}/edition et
// /api/agents/{id} (voir api/agents.py, ajoutés à cette étape).
//
// Le formulaire édite le `system_prompt` BRUT (textarea), pas des champs
// séparés ton/posture/comportements comme à la création : ces champs ne
// sont jamais persistés individuellement en base (voir AgentEditable côté
// backend), seul le texte composé final survit. Même choix que
// faces/vues/mes_agents.py fait déjà côté Streamlit.

type AgentEditable = {
  id: string;
  nom: string;
  icone_page: string;
  system_prompt: string;
  notion_page_id: string | null;
  texte_libre: string;
  image_vitrine_url: string | null;
  description: string;
  sous_titre: string;
  placeholder_saisie: string;
  actif: boolean;
  categorie_id: string | null;
  profil_utilisateur_schema: { nom: string; description: string }[];
};

type DocumentIndexe = { nom_stockage: string; nom_affiche: string; url: string };
type FichierBiblio = {
  id: string;
  nom_fichier: string;
  type_mime: string;
  description: string | null;
  url_publique: string;
  created_at: string;
};

export default function PageModifierAgent() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);

  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [iconePage, setIconePage] = useState("🤖");
  const [imageVitrineUrl, setImageVitrineUrl] = useState("");
  const [description, setDescription] = useState("");
  // Ajouté le 2026-07-12 (Bourama : "le dashboard de modification aussi
  // changer") -- même correctif que le formulaire de création, distinct
  // de `description` (taille libre).
  const [sousTitre, setSousTitre] = useState("");
  const [placeholderSaisie, setPlaceholderSaisie] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [lienNotion, setLienNotion] = useState("");
  const [texteLibre, setTexteLibre] = useState("");
  // Même correctif que la page de création (2026-07-12, Bourama).
  const [pleinEcranTexteLibre, setPleinEcranTexteLibre] = useState(false);
  const [actif, setActif] = useState(true);
  const [categorie, setCategorie] = useState<Categorie | null>(null);
  const [popupCategorieOuvert, setPopupCategorieOuvert] = useState(false);

  // Même fonctionnalité que la page de création (2026-07-21), voir
  // ChampProfilUtilisateur côté api/agents.py.
  const [profilChamps, setProfilChamps] = useState<
    { nom: string; description: string }[]
  >([]);
  function ajouterChampProfil() {
    setProfilChamps((prev) => [...prev, { nom: "", description: "" }]);
  }
  function majChampProfil(i: number, champ: "nom" | "description", valeur: string) {
    setProfilChamps((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [champ]: valeur } : c))
    );
  }
  function supprimerChampProfil(i: number) {
    setProfilChamps((prev) => prev.filter((_, idx) => idx !== i));
  }

  const [documents, setDocuments] = useState<DocumentIndexe[] | null>(null);
  const [nouveauPdf, setNouveauPdf] = useState<File | null>(null);
  const [envoiPdf, setEnvoiPdf] = useState(false);

  const [fichiersBiblio, setFichiersBiblio] = useState<FichierBiblio[] | null>(null);
  const [nouveauFichierBiblio, setNouveauFichierBiblio] = useState<File | null>(null);
  const [titreFichierBiblio, setTitreFichierBiblio] = useState("");
  const [descriptionFichierBiblio, setDescriptionFichierBiblio] = useState("");
  const [envoiBiblio, setEnvoiBiblio] = useState(false);

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
    if (!session || !agentId) return;

    appelerApi(`/api/agents/${agentId}/edition`)
      .then((r: AgentEditable) => {
        setNom(r.nom);
        setIconePage(r.icone_page || "🤖");
        setImageVitrineUrl(r.image_vitrine_url || "");
        setDescription(r.description || "");
        setSousTitre(r.sous_titre || "");
        setPlaceholderSaisie(r.placeholder_saisie || "");
        setSystemPrompt(r.system_prompt || "");
        setLienNotion(r.notion_page_id || "");
        setTexteLibre(r.texte_libre || "");
        setActif(r.actif);
        setProfilChamps(r.profil_utilisateur_schema || []);
        if (r.categorie_id) {
          const idCategorie = r.categorie_id;
          chargerCategories()
            .then((toutes) => {
              const trouvee = toutes.find((cat) => cat.id === idCategorie);
              setCategorie(trouvee ?? { id: idCategorie, nom: idCategorie, mots_cles: [], parent_id: null });
            })
            .catch(() => setCategorie({ id: idCategorie, nom: idCategorie, mots_cles: [], parent_id: null }));
        }
      })
      .catch((e) => setErreurChargement(e instanceof Error ? e.message : "Erreur inconnue."))
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

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setMessage(null);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          nom,
          icone_page: iconePage,
          system_prompt: systemPrompt,
          lien_notion: lienNotion || null,
          texte_libre: texteLibre,
          image_vitrine_url: imageVitrineUrl || null,
          description,
          sous_titre: sousTitre,
          placeholder_saisie: placeholderSaisie,
          actif,
          categorie_id: categorie?.id,
          profil_utilisateur_schema: profilChamps
            .filter((c) => c.nom.trim())
            .map((c) => ({ nom: c.nom.trim(), description: c.description.trim() })),
        }),
      });
      setMessage("IA mise à jour.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setEnregistrement(false);
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
      window.alert(e instanceof Error ? e.message : "Échec de l'ajout du PDF.");
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
      window.alert(e instanceof Error ? e.message : "Échec de la suppression.");
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
      window.alert(e instanceof Error ? e.message : "Échec de l'ajout du fichier.");
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
      window.alert(e instanceof Error ? e.message : "Échec de la suppression.");
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
        <div className="mb-5 flex gap-2">
          <BoutonRetour />
          <BoutonAccueil />
        </div>
        <h1 className="font-display text-2xl font-bold text-dj-texte">Modifier {nom}</h1>

        <form onSubmit={enregistrer} className="mt-6 flex flex-col gap-8">
          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">Vitrine publique</h2>

            <div>
              <label className={labelClasse}>Nom de l&apos;IA</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} className={champClasse} />
            </div>

            <div>
              <label className={labelClasse}>Icône</label>
              <input
                value={iconePage}
                onChange={(e) => setIconePage(e.target.value)}
                maxLength={4}
                className={`${champClasse} w-20 text-center text-xl`}
              />
            </div>

            <ChampImage
              label="Image de vitrine"
              valeur={imageVitrineUrl}
              onChange={setImageVitrineUrl}
            />

            <div>
              <label className={labelClasse}>Description publique</label>
              <p className="mt-1 text-xs text-dj-texte-muet">
                Le texte de présentation de l&apos;agent (fiche, recherche) — aucune
                limite de taille.
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={champClasse}
              />
            </div>

            <div>
              <label className={labelClasse}>Catégorie</label>
              <p className="mt-1 text-xs text-dj-texte-muet">
                Ce qui permet aux visiteurs de trouver ton agent par thème.
              </p>
              <button
                type="button"
                onClick={() => setPopupCategorieOuvert(true)}
                className={`${champClasse} flex items-center justify-between text-left`}
              >
                <span className={categorie ? "text-dj-texte" : "text-dj-texte-muet"}>
                  {categorie ? categorie.nom : "Choisir une catégorie..."}
                </span>
                <span aria-hidden="true">▾</span>
              </button>
              <PopupCategories
                ouvert={popupCategorieOuvert}
                onFermer={() => setPopupCategorieOuvert(false)}
                categorieActuelleId={categorie?.id}
                onChoisir={setCategorie}
              />
            </div>

            <div>
              <label className={labelClasse}>Phrase d&apos;accueil</label>
              <p className="mt-1 text-xs text-dj-texte-muet">
                Une phrase courte, affichée sous le titre au tout premier écran du
                chat, avant le premier message — distincte de la description
                publique ci-dessus.
              </p>
              <input
                value={sousTitre}
                onChange={(e) => setSousTitre(e.target.value)}
                placeholder="Ex : Je t'aide à structurer ton entraînement de la semaine."
                className={champClasse}
              />
            </div>

            <div>
              <label className={labelClasse}>Texte de la barre de saisie</label>
              <p className="mt-1 text-xs text-dj-texte-muet">
                Le texte affiché en fond dans le champ où l&apos;utilisateur écrit son
                message (avant qu&apos;il commence à taper).
              </p>
              <input
                value={placeholderSaisie}
                onChange={(e) => setPlaceholderSaisie(e.target.value)}
                placeholder="Pose ta question..."
                className={champClasse}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-dj-texte">
              <input
                type="checkbox"
                checked={actif}
                onChange={(e) => setActif(e.target.checked)}
              />
              Agent actif (visible et utilisable publiquement)
            </label>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">Comportement</h2>
            <div>
              <label className={labelClasse}>System prompt</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={10}
                className={`${champClasse} font-mono text-sm`}
              />
              <p className="mt-1 text-xs text-dj-texte-muet">
                C&apos;est le texte complet qui pilote le comportement de l&apos;agent — le
                modifier ici remplace directement ce qui avait été généré à la création.
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">
              Base de connaissance
            </h2>

            <div>
              <label className={labelClasse}>Lien ou ID d&apos;une page Notion</label>
              <input
                value={lienNotion}
                onChange={(e) => setLienNotion(e.target.value)}
                placeholder="https://www.notion.so/..."
                className={champClasse}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className={labelClasse}>Connaissance libre</label>
                <button
                  type="button"
                  onClick={() => setPleinEcranTexteLibre(true)}
                  className="text-xs text-dj-accent-1 transition-colors hover:text-dj-accent-2"
                >
                  Plein écran ⤢
                </button>
              </div>
              <p className="mt-1 text-xs text-dj-texte-muet">
                Pour une connaissance étendue que l&apos;agent doit avoir, mais qui
                n&apos;existe pas en PDF ou qui change souvent. Aucune limite de
                taille.
              </p>
              <textarea
                value={texteLibre}
                onChange={(e) => setTexteLibre(e.target.value)}
                rows={8}
                className={`${champClasse} resize-y`}
              />
            </div>

            {pleinEcranTexteLibre && (
              <div className="fixed inset-0 z-50 flex flex-col bg-dj-fond p-5">
                <div className="flex items-center justify-between pb-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-dj-texte">
                      Connaissance libre
                    </h2>
                    <p className="text-xs text-dj-texte-muet">
                      Pour une connaissance étendue, pas en PDF, ou qui change
                      souvent. Aucune limite de taille.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPleinEcranTexteLibre(false)}
                    className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
                  >
                    Fermer
                  </button>
                </div>
                <textarea
                  value={texteLibre}
                  onChange={(e) => setTexteLibre(e.target.value)}
                  autoFocus
                  className={`${champClasse} flex-1 resize-none font-mono text-sm`}
                />
              </div>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">
              Profil utilisateur
            </h2>
            <p className="text-sm text-dj-texte-muet">
              Informations que ton IA retient automatiquement sur les personnes qui
              lui parlent (utilisateurs connectés). Vide = fonctionnalité désactivée.
            </p>

            {profilChamps.map((champ, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute p-4 sm:flex-row sm:items-start"
              >
                <div className="flex-1">
                  <label className="text-xs font-semibold text-dj-texte-muet">
                    Nom du champ
                  </label>
                  <input
                    value={champ.nom}
                    onChange={(e) => majChampProfil(i, "nom", e.target.value)}
                    placeholder="Ex: niveau_scolaire"
                    className={champClasse}
                  />
                </div>
                <div className="flex-[2]">
                  <label className="text-xs font-semibold text-dj-texte-muet">
                    Description (guide l&apos;IA sur quoi chercher)
                  </label>
                  <input
                    value={champ.description}
                    onChange={(e) => majChampProfil(i, "description", e.target.value)}
                    placeholder="Ex: Niveau étudié actuellement (collège, lycée, prépa...)"
                    className={champClasse}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => supprimerChampProfil(i)}
                  className="mt-1 self-start rounded-full border border-dj-bordure px-3 py-2 text-xs text-dj-texte-muet transition-colors hover:border-[#F87171] hover:text-[#F87171] sm:mt-6"
                >
                  Retirer
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={ajouterChampProfil}
              className="self-start rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
            >
              + Ajouter un champ
            </button>
          </section>

          {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={enregistrement}
              className="rounded-full bg-dj-gradient px-6 py-3 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {enregistrement ? "Enregistrement…" : "Enregistrer"}
            </button>
            {message && <span className="text-sm text-dj-texte-muet">{message}</span>}
          </div>
        </form>

        <section className="mt-10 border-t border-dj-bordure pt-8">
          <h2 className="text-lg font-bold mb-4">Droits de l&apos;agent</h2>
          <DroitsAgent agentId={agentId} />
        </section>

        <section className="mt-10 border-t border-dj-bordure pt-8">
          <h2 className="text-lg font-bold mb-4">Proactivité</h2>
          <ProactiviteAgent agentId={agentId} />
        </section>

        <section className="mt-10 flex flex-col gap-4">
          <h2 className="font-display text-lg font-bold text-dj-texte">Documents PDF indexés</h2>

          {documents === null && <p className="text-sm text-dj-texte-muet">Chargement...</p>}
          {documents?.length === 0 && (
            <p className="text-sm text-dj-texte-muet">Aucun PDF indexé pour cette IA.</p>
          )}
          {documents && documents.length > 0 && (
            <div className="flex flex-col gap-2">
              {documents.map((doc) => (
                <div
                  key={doc.nom_stockage}
                  className="flex items-center justify-between rounded-xl border border-dj-bordure bg-dj-surface px-4 py-3"
                >
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-dj-accent-1 hover:text-dj-accent-2"
                  >
                    {doc.nom_affiche}
                  </a>
                  <button
                    onClick={() => supprimerPdf(doc.nom_stockage)}
                    className="text-xs text-dj-texte-muet transition-colors hover:text-[#F87171]"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
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
        </section>

        <section className="mt-10 flex flex-col gap-4">
          <h2 className="font-display text-lg font-bold text-dj-texte">
            Bibliothèque (images, audio, vidéo, PDF...)
          </h2>
          <p className="text-sm text-dj-texte-muet">
            Un fichier ajouté ici que ton IA peut retrouver et donner pendant une
            conversation. Un PDF est en plus automatiquement analysé pour enrichir les
            réponses de l&apos;IA, comme ci-dessus.
          </p>

          {fichiersBiblio === null && <p className="text-sm text-dj-texte-muet">Chargement...</p>}
          {fichiersBiblio?.length === 0 && (
            <p className="text-sm text-dj-texte-muet">Aucun fichier dans la bibliothèque.</p>
          )}
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

        <SectionMiseAJour agentId={agentId} />
      </main>
    </div>
  );
}

function SectionMiseAJour({ agentId }: { agentId: string }) {
  // Champ "Mise à jour" (demande Bourama, 2026-07-15) : en dessous dans
  // "Modifier agent", pour dire ce qui vient d'être changé -- titre +
  // texte + bouton plein écran, même pattern exact que "Connaissance
  // libre" plus haut sur cette page (pleinEcranTexteLibre). Publier
  // ENVOIE tout de suite (POST /api/agents/{id}/updates) et vide les
  // champs pour la prochaine fois -- ce n'est pas un brouillon qui se
  // sauvegarde avec le reste du formulaire "Enregistrer".
  const champClasseLocal =
    "mt-1 w-full rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte placeholder:text-dj-inactif focus:border-dj-bordure-forte focus:outline-none";
  const labelClasseLocal = "text-xs font-medium text-dj-texte-muet";

  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [pleinEcran, setPleinEcran] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function publier(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim() || !contenu.trim()) return;

    setEnvoi(true);
    setMessage(null);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agentId}/updates`, {
        method: "POST",
        body: JSON.stringify({ titre, contenu }),
      });
      setTitre("");
      setContenu("");
      setPleinEcran(false);
      setMessage("Mise à jour publiée — les personnes ayant déjà utilisé cet agent sont notifiées.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="mt-10 flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
      <h2 className="font-display text-lg font-bold text-dj-texte">Mise à jour</h2>
      <p className="text-xs text-dj-texte-muet">
        Dis ce que tu viens de modifier sur cet agent — affiché avec la date sur sa page
        publique, avec notification aux personnes qui l&apos;ont déjà utilisé.
      </p>

      <form onSubmit={publier} className="flex flex-col gap-4">
        <div>
          <label className={labelClasseLocal}>Titre</label>
          <input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Ex : Nouvelle base de connaissance ajoutée"
            className={champClasseLocal}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className={labelClasseLocal}>Détail</label>
            <button
              type="button"
              onClick={() => setPleinEcran(true)}
              className="text-xs text-dj-accent-1 transition-colors hover:text-dj-accent-2"
            >
              Plein écran ⤢
            </button>
          </div>
          <textarea
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            rows={4}
            className={`${champClasseLocal} resize-y`}
          />
        </div>

        {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={envoi || !titre.trim() || !contenu.trim()}
            className="self-start rounded-full bg-dj-gradient px-6 py-2.5 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {envoi ? "Publication…" : "Publier la mise à jour"}
          </button>
          {message && <span className="text-sm text-dj-texte-muet">{message}</span>}
        </div>
      </form>

      {pleinEcran && (
        <div className="fixed inset-0 z-50 flex flex-col bg-dj-fond p-5">
          <div className="flex items-center justify-between pb-3">
            <h2 className="font-display text-lg font-bold text-dj-texte">Mise à jour — {titre || "Détail"}</h2>
            <button
              type="button"
              onClick={() => setPleinEcran(false)}
              className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
            >
              Fermer
            </button>
          </div>
          <textarea
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            autoFocus
            className={`${champClasseLocal} flex-1 resize-none`}
          />
        </div>
      )}
    </section>
  );
}

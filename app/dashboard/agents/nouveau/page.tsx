"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { appelerApi, appelerApiFichier } from "@/lib/api";
import { proposerNotificationsPushUneFois, useNotificationsPush } from "@/lib/useNotificationsPush";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { ChampImage } from "@/components/ChampImage";
import { BoutonPartager } from "@/components/BoutonPartager";
import { PopupCategories, type Categorie } from "@/components/PopupCategories";
import { DroitsAgentCreation } from "@/components/DroitsAgentCreation";

// Étape D.6 (pivot social) : formulaire de création d'agent, nouveau flow
// (nom → icône → image vitrine → description →
// config technique, ordre inchangé côté "config technique" par rapport à
// faces/vues/creer_agent.py). Payload construit pour matcher EXACTEMENT
// `CreerAgentPayload` (api/agents.py) — champ par champ, mêmes valeurs de
// `ton`/`type_connaissance` que le formulaire Streamlit (copiées depuis
// faces/vues/creer_agent.py, pas réinventées, pour rester compatible avec
// composer_system_prompt qui interprète ces chaînes exactes côté backend).
//
// VOLONTAIREMENT PAS INCLUS ICI :
// - Sélection d'outils (outils_choisis) : la Streamlit lit SERVEURS_MCP
//   dynamiquement (registre_outils.py), rien n'est exposé par l'API pour
//   lister les outils disponibles côté frontend. outils_choisis envoyé
//   vide ([]) — un agent créé depuis le Next.js n'a aucun outil activé
//   pour l'instant, à corriger avec un nouvel endpoint GET /api/outils
//   plus tard.
// - Upload de PDF : POST /api/agents lui-même ne le gère pas (voir
//   docstring d'api/agents.py, "SANS l'upload de PDF"), c'est
//   POST /api/agents/{id}/documents (Étape 2 de api/PLAN.md) — pas
//   construit côté frontend ici, agent créable sans PDF (Notion et texte
//   libre restent possibles).

const TON_OPTIONS = ["Tutoiement (tu)", "Vouvoiement (vous)"];

const NB_LIGNES_COMPORTEMENT = 4;

type LigneComportement = { type_requete: string; comportement: string };

export default function PageCreerAgent() {
  const router = useRouter();
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);

  const [nom, setNom] = useState("");
  const { activer: activerNotificationsPush } = useNotificationsPush();
  const [iconePage, setIconePage] = useState("🤖");
  // Point 5 (2026-07-14, Bourama : "il n'y a pas de section pour modifier
  // le texte qui s'affiche dans la barre de saisie") -- déjà lu par
  // faces/vues/chat.py (ui_config.placeholder_saisie), il manquait juste
  // ce champ côté formulaire Next.js.
  const [placeholderSaisie, setPlaceholderSaisie] = useState("");
  const [imageVitrineUrl, setImageVitrineUrl] = useState("");
  const [description, setDescription] = useState("");
  // Ajouté le 2026-07-12 (Bourama : "tu as mélangé deux choses, la
  // description publique et le sous-titre"). Distinct de `description` :
  // courte phrase affichée sous le titre au premier écran du chat
  // (équivalent du champ "Phrase d'accueil" du formulaire Streamlit).
  const [sousTitre, setSousTitre] = useState("");
  // Catégorie obligatoire (Bourama, 2026-07-15) : bouton "Créer" bloqué
  // tant que rien n'est choisi (voir validation dans gererSoumission).
  const [categorie, setCategorie] = useState<Categorie | null>(null);
  const [popupCategorieOuvert, setPopupCategorieOuvert] = useState(false);

  const [ton, setTon] = useState(TON_OPTIONS[0]);
  const [postureGenerale, setPostureGenerale] = useState("");
  const [limitesGlobales, setLimitesGlobales] = useState("");
  const [comportements, setComportements] = useState<LigneComportement[]>(
    Array.from({ length: NB_LIGNES_COMPORTEMENT }, () => ({
      type_requete: "",
      comportement: "",
    }))
  );

  // Champ "Nature de la connaissance" retiré du formulaire (2026-07-12,
  // remonté par Bourama : redondant/pas clair pour les créateurs).
  // type_connaissance est maintenant optionnel côté API
  // (composer_system_prompt, core/creation_agent.py) -- on ne l'envoie
  // simplement plus.
  const [descriptionConnaissance, setDescriptionConnaissance] = useState("");
  const [lienNotion, setLienNotion] = useState("");
  const [texteLibre, setTexteLibre] = useState("");
  // Vue plein écran du champ "texte de connaissance libre" (2026-07-12,
  // remonté par Bourama : ce champ sert à une CONNAISSANCE ÉTENDUE que
  // l'agent doit avoir -- pas un PDF, et pas figée (elle change souvent)
  // -- donc potentiellement longue, illisible dans une textarea de 4
  // lignes. Aucune limite de taille côté API (voir api/agents.py).
  const [pleinEcranTexteLibre, setPleinEcranTexteLibre] = useState(false);
  const [fichierPdf, setFichierPdf] = useState<File | null>(null);

  // Profil utilisateur dynamique par agent (2026-07-21) : le créateur
  // choisit lui-même quelles infos suivre chez les personnes qui parlent
  // à SON agent -- rien de prédéfini côté plateforme, voir
  // ChampProfilUtilisateur (api/agents.py). Vide par défaut = fonctionnalité
  // désactivée pour cet agent, aucun coût ajouté.
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

  // Droits de l'agent (Bourama, 2026-07-23 : "dans le formulaire de
  // création, comme tous les autres [champs]") -- collectés ici via
  // DroitsAgentCreation, envoyés dans le même POST /api/agents que le
  // reste, pas configurés après coup.
  const [droitsGeneration, setDroitsGeneration] = useState<string[]>([]);
  const [droitsServeurs, setDroitsServeurs] = useState<string[]>([]);

  const [envoi, setEnvoi] = useState(false);
  const [agentCree, setAgentCree] = useState<{ id: string; nom: string; icone: string } | null>(
    null
  );
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

  function majComportement(i: number, champ: keyof LigneComportement, valeur: string) {
    setComportements((prev) =>
      prev.map((ligne, idx) => (idx === i ? { ...ligne, [champ]: valeur } : ligne))
    );
  }

  async function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    // Demande de Bourama (2026-07-22) : proposer l'activation des
    // notifications push dès l'appui sur "créer son IA", même logique
    // et même garde-fou "une fois par appareil" que dans ChatIA.tsx.
    proposerNotificationsPushUneFois(activerNotificationsPush);

    if (!nom.trim()) {
      setErreur("Le nom de l'IA est obligatoire.");
      return;
    }
    if (!postureGenerale.trim() && !limitesGlobales.trim()) {
      setErreur("Remplis au moins la posture générale ou les limites globales.");
      return;
    }
    if (!categorie) {
      setErreur("Choisis une catégorie pour ton agent.");
      return;
    }

    setEnvoi(true);
    let idAgentCree: string | null = null;
    try {
      const reponse = await appelerApi("/api/agents", {
        method: "POST",
        body: JSON.stringify({
          nom,
          ton,
          posture_generale: postureGenerale,
          limites_globales: limitesGlobales,
          comportements: comportements.filter(
            (l) => l.type_requete.trim() || l.comportement.trim()
          ),
          outils_choisis: [],
          outils_generation_choisis: droitsGeneration,
          serveurs_choisis: droitsServeurs,
          description_connaissance: descriptionConnaissance,
          lien_notion: lienNotion || null,
          texte_libre: texteLibre,
          ui_config: { icone_page: iconePage || "🤖", placeholder_saisie: placeholderSaisie || "Pose ta question..." },
          image_vitrine_url: imageVitrineUrl || null,
          description,
          sous_titre: sousTitre,
          categorie_id: categorie?.id,
          profil_utilisateur_schema: profilChamps
            .filter((c) => c.nom.trim())
            .map((c) => ({ nom: c.nom.trim(), description: c.description.trim() })),
        }),
      });
      idAgentCree = reponse.id;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
      setEnvoi(false);
      return;
    }

    // Le PDF est indexé APRÈS coup (POST /api/agents/{id}/documents,
    // ajouté le 2026-07-12 — voir api/agents.py) : l'agent a besoin
    // d'exister d'abord. Best-effort, même logique que
    // faces/vues/creer_agent.py : un échec d'indexation n'annule pas la
    // création déjà actée, juste un avertissement avant de continuer.
    if (fichierPdf && idAgentCree) {
      try {
        await appelerApiFichier(`/api/agents/${idAgentCree}/documents`, fichierPdf);
      } catch (e) {
        window.alert(
          `L'IA est créée, mais le PDF n'a pas pu être indexé : ${
            e instanceof Error ? e.message : "erreur inconnue"
          }. Tu pourras réessayer depuis "Mes IA".`
        );
      }
    }

    // Fix du 2026-07-12 (Bourama : le bouton "Voir mon agent" doit être
    // visible juste après la création) : on ne redirige plus en
    // silence vers la page publique de l'agent — on affiche un écran de
    // confirmation avec le lien à partager et un bouton explicite, pour
    // que la création se sente confirmée plutôt que de disparaître d'un
    // coup vers une autre page.
    setEnvoi(false);
    setAgentCree({ id: idAgentCree!, nom, icone: iconePage || "🤖" });
  }

  if (session === undefined || session === null) return null;

  const champClasse =
    "mt-1 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-dj-texte outline-none focus:border-dj-accent-1";
  const labelClasse = "block text-sm font-medium text-dj-texte-muet";

  if (agentCree) {
    const lienPublic =
      typeof window !== "undefined"
        ? `${window.location.origin}/agent/${agentCree.id}`
        : `/agent/${agentCree.id}`;

    return (
      <div className="min-h-screen">
        <TopBar />
        <main className="mx-auto max-w-lg px-5 py-10 text-center">
          <p className="text-5xl">{agentCree.icone}</p>
          <h1 className="mt-3 font-display text-2xl font-bold text-dj-texte">
            {agentCree.nom} est en ligne !
          </h1>
          <p className="mt-2 text-sm text-dj-texte-muet">
            Ton agent est créé et prêt à discuter. Partage son lien ou va directement le voir.
          </p>

          <div className="mt-6 flex items-center gap-2 rounded-full border border-dj-bordure bg-dj-surface-haute px-4 py-2">
            <input
              readOnly
              value={lienPublic}
              className="flex-1 truncate bg-transparent text-sm text-dj-texte outline-none"
              onFocus={(e) => e.target.select()}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <BoutonPartager
              chemin={`/agent/${agentCree.id}`}
              titre={agentCree.nom}
              libelle="Partager avec ses amis"
            />
            <button
              type="button"
              onClick={() => router.push(`/agent/${agentCree.id}`)}
              className="rounded-full bg-dj-gradient px-6 py-3 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5"
            >
              Voir mon agent
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-full border border-dj-bordure px-6 py-3 text-sm text-dj-texte-muet transition-colors hover:border-dj-bordure-forte"
            >
              Retour au dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto max-w-2xl px-5 py-10">
        <div className="mb-5 flex gap-2">
          <BoutonRetour />
          <BoutonAccueil />
        </div>
        <h1 className="font-display text-2xl font-bold text-dj-texte">Créer une IA</h1>

        <form onSubmit={gererSoumission} className="mt-6 flex flex-col gap-8">
          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">Vitrine publique</h2>

            <div>
              <label className={labelClasse}>Nom de l&apos;IA</label>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className={champClasse}
              />
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
              <label className={labelClasse}>
                Catégorie <span className="text-dj-accent-1">*</span>
              </label>
              <p className="mt-1 text-xs text-dj-texte-muet">
                Obligatoire — c&apos;est ce qui permet aux visiteurs de trouver ton
                agent par thème.
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
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">
              1. Identité de base
            </h2>

            <div>
              <label className={labelClasse}>Ton</label>
              <select
                value={ton}
                onChange={(e) => setTon(e.target.value)}
                className={champClasse}
              >
                {TON_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClasse}>Posture générale</label>
              <input
                value={postureGenerale}
                onChange={(e) => setPostureGenerale(e.target.value)}
                placeholder="Ex: patient et pédagogue"
                className={champClasse}
              />
            </div>

            <div>
              <label className={labelClasse}>
                Limites globales — ce que l&apos;agent ne fait JAMAIS
              </label>
              <textarea
                value={limitesGlobales}
                onChange={(e) => setLimitesGlobales(e.target.value)}
                rows={3}
                className={champClasse}
              />
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">
              2. Comportement selon le type de requête
            </h2>
            <p className="text-sm text-dj-texte-muet">
              Optionnel — laisse vide ce que tu ne remplis pas.
            </p>

            {comportements.map((ligne, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <input
                  value={ligne.type_requete}
                  onChange={(e) => majComportement(i, "type_requete", e.target.value)}
                  placeholder="Ex: Exercice, Réclamation..."
                  className={champClasse}
                />
                <input
                  value={ligne.comportement}
                  onChange={(e) => majComportement(i, "comportement", e.target.value)}
                  placeholder="Comportement attendu"
                  className={champClasse}
                />
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">
              3. Base de connaissance
            </h2>

            <div>
              <label className={labelClasse}>
                En une phrase, quel type d&apos;information l&apos;agent doit-il connaître ?
              </label>
              <textarea
                value={descriptionConnaissance}
                onChange={(e) => setDescriptionConnaissance(e.target.value)}
                rows={2}
                className={champClasse}
              />
            </div>

            <div>
              <label className={labelClasse}>Lien ou ID d&apos;une page Notion (optionnel)</label>
              <input
                value={lienNotion}
                onChange={(e) => setLienNotion(e.target.value)}
                placeholder="https://www.notion.so/..."
                className={champClasse}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className={labelClasse}>Connaissance libre (optionnel)</label>
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
                n&apos;existe pas en PDF ou qui change souvent (contrairement à un
                document, ce texte se modifie en quelques secondes). Aucune
                limite de taille : colle tout ce dont l&apos;agent a besoin.
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

            <div>
              <label className={labelClasse}>Document PDF (optionnel)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFichierPdf(e.target.files?.[0] ?? null)}
                className="mt-1 w-full text-sm text-dj-texte file:mr-3 file:rounded-full file:border file:border-dj-bordure file:bg-dj-surface-haute file:px-4 file:py-2 file:text-xs file:text-dj-texte hover:file:border-dj-bordure-forte"
              />
              {fichierPdf && (
                <p className="mt-1 text-xs text-dj-texte-muet">{fichierPdf.name}</p>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
            <h2 className="font-display text-base font-bold text-dj-texte">
              4. Profil utilisateur (optionnel)
            </h2>
            <p className="text-sm text-dj-texte-muet">
              Choisis les informations que ton IA doit retenir sur les personnes qui
              lui parlent — elles se remplissent toutes seules au fil des
              conversations (pour les utilisateurs connectés) et sont réutilisées
              pour personnaliser les réponses. Optionnel : laisse vide si tu n&apos;en
              as pas besoin.
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

          <section className="mt-2 flex flex-col gap-3 rounded-2xl border border-dj-bordure bg-dj-surface-haute p-5">
            <div>
              <h2 className="font-display text-lg font-bold text-dj-texte">Droits de l&apos;agent</h2>
              <p className="text-xs text-dj-texte-muet">
                Aucune capacité n&apos;est activée par défaut. Choisis ce que ton IA a le droit de faire.
              </p>
            </div>
            <DroitsAgentCreation
              onChange={({ outilsGeneration, serveurs }) => {
                setDroitsGeneration(outilsGeneration);
                setDroitsServeurs(serveurs);
              }}
            />
          </section>

          {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}

          <button
            type="submit"
            disabled={envoi}
            className="self-start rounded-full bg-dj-gradient px-6 py-3 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {envoi ? "Création…" : "Créer l'IA"}
          </button>
        </form>
      </main>
    </div>
  );
}

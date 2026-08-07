"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronsLeft, ChevronsRight, ArrowLeft, Eye, Shuffle, LayoutGrid, MessageSquarePlus, History, Star, Share2, UserCircle, Contact, MoreHorizontal, GraduationCap, Pencil, Check, Send, Link2, FileUp, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  appelerApi,
  lireOutilsChatAgent,
  entrerCodeMatiere,
  lireMesRattachements,
  renommerRattachementMatiere,
  activerRattachementMatiere,
  lireMonRole,
  diffuserDocumentEtablissement,
  diffuserLien,
  listerMesDiffusions,
  type Rattachement,
  type MonRole,
  type ResultatDiffusion,
  type CibleDiffusion,
  type ElementDiffuse,
} from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { APPLIS_DISPONIBLES, OUTILS_DISPONIBLES } from "@/lib/outils";
import { NoteAgent } from "@/components/NoteAgent";
import { CommentairesAgent } from "@/components/CommentairesAgent";
import { BoutonInstaller } from "@/components/BoutonInstaller";
import { MonProfilAgent } from "@/components/MonProfilAgent";
import { MesComportements } from "@/components/MesComportements";

// Reproduit la sidebar de faces/vues/chat.py (Streamlit) dans le chat
// Next.js -- demande de Bourama (2026-07-16) : "comme si j'avais pas
// quitté Streamlit en termes de visuel".
//
// Regroupement du 06/08 (Bourama) : "Retour à l'agent" renommé "Voir
// l'IA" (ce n'est plus vraiment un retour), et avec Changer d'IA/
// Partager/Avis sur cet agent, déplacés en bas et réunis dans un seul
// bouton "Actions" qui les déplie au clic -- au lieu de 4 éléments
// séparés dispersés dans le rail. Seul le lien "Retour à la vitrine"
// (logo, tout en bas) reste en dehors de ce groupe.
//
// N'affecte jamais BarreDeSaisie.tsx ni l'espacement des bulles de
// message (BulleMessage.tsx) -- consigne explicite de Bourama.
//
// Rail permanent ajouté le 2026-07-27 (Bourama : "les boutons existants
// qui sont dans le sidebar, et qui apparaissent aussi"), puis fusionné
// avec le panneau le 2026-07-28 (Bourama : "le rail qui s'élargit et
// devien exactement le panneau") -- sur desktop, UN SEUL élément dont la
// largeur bascule entre 56px (icônes seules) et 288px (icônes +
// libellés + contenu des volets), pas un rail fixe + un second panneau
// séparé. Mobile inchangé depuis l'audit responsive du 27/07 : petit
// bouton flottant + panneau plein-largeur en overlay, séparés du
// rail/panneau fusionné desktop (md:hidden sur l'un, hidden md:flex sur
// l'autre).

type FilConversation = {
  conversation_id: string | null;
  titre: string;
  derniere_activite: string;
};

// Libellé texte d'une ligne du rail -- corrige le "saut" du 28/07 (voir
// note plus bas) : reste monté en permanence, seule sa max-width et son
// opacity s'animent (même durée que la largeur du conteneur parent),
// jamais un changement de forme instantané.
function LibelleRail({ ouverte, children }: { ouverte: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`overflow-hidden whitespace-nowrap text-sm transition-[max-width,opacity] duration-300 ease-out ${
        ouverte ? "max-w-[180px] opacity-100" : "max-w-0 opacity-0"
      }`}
    >
      {children}
    </span>
  );
}

// Liste "mes matières débloquées" (06/08/2026, demande Bourama : le
// déblocage est déjà permanent en base -- ce composant le rend enfin
// VISIBLE, sinon rien ne confirmait à l'étudiant que ça avait marché,
// et retaper un code déjà utilisé tombait sur un message d'erreur rouge
// (DEJA_RATTACHE_A_CE_CONTENU) sans qu'il ait pu vérifier autrement.
// Affiche automatiquement le nom de l'enseignant (déjà en base) + un
// surnom perso optionnel que l'étudiant tape lui-même pour s'y
// retrouver (utile si plusieurs enseignants couvrent la même matière).
function ListeMatieresDebloquees({
  rattachements,
  chargement,
  onActiver,
  onRenomme,
}: {
  rattachements: Rattachement[] | null;
  chargement: boolean;
  onActiver: (contenuId: string) => void;
  onRenomme: (contenuId: string, surnom: string) => void;
}) {
  const [editionId, setEditionId] = useState<string | null>(null);
  const [texteEdition, setTexteEdition] = useState("");

  function ouvrirEdition(r: Rattachement) {
    setEditionId(r.contenu_id);
    setTexteEdition(r.surnom || "");
  }

  function valider(contenuId: string) {
    onRenomme(contenuId, texteEdition.trim());
    setEditionId(null);
  }

  if (chargement) {
    return (
      <div className="flex flex-col gap-1.5 px-2 pt-1">
        {[0, 1].map((i) => (
          <div key={i} className="h-8 animate-pulse rounded-lg bg-dj-surface-haute" />
        ))}
      </div>
    );
  }

  if (!rattachements || rattachements.length === 0) return null;

  // Regroupe par matière pour ne montrer le bouton "changer" que quand
  // plusieurs enseignants couvrent la même matière pour cet étudiant.
  const parMatiere = new Map<string, Rattachement[]>();
  for (const r of rattachements) {
    parMatiere.set(r.matiere, [...(parMatiere.get(r.matiere) || []), r]);
  }

  return (
    <div className="flex animate-dj-fade-in-rapide flex-col gap-1.5 px-2 pt-1">
      {Array.from(parMatiere.entries()).map(([matiere, groupe]) =>
        groupe.map((r) => (
          <div
            key={r.contenu_id}
            className="flex flex-col gap-1 rounded-lg border border-dj-bordure/60 px-2 py-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-dj-texte">
                  {r.surnom || matiere}
                </p>
                <p className="truncate text-[11px] text-dj-texte-muet">
                  {r.surnom ? `${matiere} · ` : ""}
                  {r.enseignant_nom}
                  {!r.actif && groupe.length > 1 ? " · inactif" : ""}
                </p>
              </div>
              {editionId !== r.contenu_id && (
                <button
                  onClick={() => ouvrirEdition(r)}
                  title="Donner un nom"
                  className="flex-shrink-0 text-dj-texte-muet transition-colors hover:text-dj-texte"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>

            {editionId === r.contenu_id && (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={texteEdition}
                  onChange={(e) => setTexteEdition(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && valider(r.contenu_id)}
                  placeholder={matiere}
                  className="min-w-0 flex-1 rounded-md border border-dj-bordure bg-transparent px-1.5 py-1 text-xs text-dj-texte"
                />
                <button
                  onClick={() => valider(r.contenu_id)}
                  className="flex-shrink-0 text-dj-accent-1"
                  title="Valider le nom"
                >
                  <Check size={14} />
                </button>
              </div>
            )}

            {!r.actif && groupe.length > 1 && (
              <button
                onClick={() => onActiver(r.contenu_id)}
                className="self-start text-[11px] text-dj-accent-1 hover:underline"
              >
                Utiliser cet enseignant
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// Section "Envoyer à..." côté enseignant ET établissement (2026-08-06,
// demande Bourama) : nouvelle section dédiée dans le chat (sidebar) de
// l'IA fixe de la personne connectée (Stirux pour l'enseignant, Lirinus
// pour l'établissement), séparée de "Écrire une matière" (qui vit dans
// Mon espace, components/SectionMatieres.tsx) -- ici il s'agit
// d'ajouter un document ou un lien directement à la bibliothèque de
// TOUS les destinataires autorisés d'un coup (un niveau pour
// l'enseignant : ses étudiants ; deux niveaux pour l'établissement :
// ses enseignants + les étudiants de ces enseignants), pas d'écrire le
// contenu pédagogique lui-même. Réutilise diffuserDocumentEtablissement/
// diffuserLien (voir lib/api.ts) : même endpoint pour les deux rôles,
// _contacts_autorises limite déjà les cibles au bon périmètre côté
// backend selon le rôle réel de qui appelle.
function SectionEnvoyer({ role }: { role: "enseignant" | "etablissement" }) {
  const [mode, setMode] = useState<"fichier" | "lien">("fichier");
  const [cible, setCible] = useState<CibleDiffusion>("tous");
  const [fichier, setFichier] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<ResultatDiffusion | null>(null);
  const [dejaAjoutes, setDejaAjoutes] = useState<ElementDiffuse[] | null>(null);
  const [historiqueDeplie, setHistoriqueDeplie] = useState(false);

  function rafraichirHistorique() {
    listerMesDiffusions()
      .then(setDejaAjoutes)
      .catch(() => setDejaAjoutes([]));
  }

  useEffect(() => {
    rafraichirHistorique();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const texteAide =
    role === "etablissement"
      ? "Ajouté à la bibliothèque des destinataires choisis ci-dessous — pas un message, personne n'est notifié."
      : "Ajouté à la bibliothèque de tous tes étudiants — pas un message, personne n'est notifié.";
  const texteBouton =
    role !== "etablissement"
      ? "Ajouter à la bibliothèque de mes étudiants"
      : cible === "enseignant"
        ? "Ajouter à la bibliothèque de mes enseignants"
        : cible === "etudiant"
          ? "Ajouter à la bibliothèque des étudiants de mes enseignants"
          : "Ajouter à la bibliothèque de tous";

  const pretAEnvoyer =
    !enCours &&
    description.trim() !== "" &&
    (mode === "fichier" ? !!fichier : url.trim() !== "");

  async function envoyer() {
    if (!pretAEnvoyer) return;
    setEnCours(true);
    setErreur(null);
    setResultat(null);
    try {
      const r =
        mode === "fichier"
          ? await diffuserDocumentEtablissement(fichier as File, description.trim(), titre.trim(), cible)
          : await diffuserLien(url.trim(), description.trim(), titre.trim(), cible);
      setResultat(r);
      setFichier(null);
      setUrl("");
      setTitre("");
      setDescription("");
      rafraichirHistorique();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 px-3 pb-3">
      <p className="text-xs text-dj-texte-muet">{texteAide}</p>

      {role === "etablissement" && (
        <div className="flex gap-1.5 rounded-lg border border-dj-bordure p-0.5">
          {(
            [
              ["tous", "Tous"],
              ["enseignant", "Enseignants"],
              ["etudiant", "Étudiants"],
            ] as [CibleDiffusion, string][]
          ).map(([valeur, libelle]) => (
            <button
              key={valeur}
              onClick={() => setCible(valeur)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                cible === valeur ? "bg-dj-surface-haute text-dj-texte" : "text-dj-texte-muet"
              }`}
            >
              {libelle}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 rounded-lg border border-dj-bordure p-0.5">
        <button
          onClick={() => setMode("fichier")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
            mode === "fichier" ? "bg-dj-surface-haute text-dj-texte" : "text-dj-texte-muet"
          }`}
        >
          <FileUp size={13} />
          Fichier
        </button>
        <button
          onClick={() => setMode("lien")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
            mode === "lien" ? "bg-dj-surface-haute text-dj-texte" : "text-dj-texte-muet"
          }`}
        >
          <Link2 size={13} />
          Lien
        </button>
      </div>

      {mode === "fichier" ? (
        <input
          type="file"
          onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
          className="block w-full text-xs text-dj-texte-muet file:mr-2 file:rounded-full file:border-0 file:bg-dj-surface-haute file:px-2.5 file:py-1 file:text-xs file:text-dj-texte"
        />
      ) : (
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="rounded-lg border border-dj-bordure bg-transparent px-2.5 py-1.5 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
        />
      )}

      <input
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        placeholder="Titre (optionnel)"
        className="rounded-lg border border-dj-bordure bg-transparent px-2.5 py-1.5 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        placeholder="Description (pour que l'IA sache le retrouver)"
        className="rounded-lg border border-dj-bordure bg-transparent px-2.5 py-1.5 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
      />

      {erreur && <p className="animate-dj-fade-in-rapide text-xs text-red-500">{erreur}</p>}
      {resultat && (
        <p className="animate-dj-fade-in-rapide text-xs text-dj-accent-1">
          Ajouté à la bibliothèque de {resultat.diffuse_a}/{resultat.total_cibles} destinataire(s).
          {resultat.echecs.length > 0 && <> Échec pour : {resultat.echecs.join(", ")}.</>}
        </p>
      )}

      <button
        onClick={envoyer}
        disabled={!pretAEnvoyer}
        className="flex items-center justify-center gap-2 rounded-[10px] bg-dj-gradient px-4 py-2 text-sm font-bold text-[#1A0D02] transition-opacity disabled:opacity-50"
      >
        <Send size={14} />
        {enCours ? "Envoi…" : texteBouton}
      </button>

      {dejaAjoutes && dejaAjoutes.length > 0 && (
        <div className="mt-1 border-t border-dj-bordure pt-2">
          <button
            onClick={() => setHistoriqueDeplie((v) => !v)}
            className="text-xs text-dj-texte-muet underline decoration-dotted"
          >
            Déjà ajouté ({dejaAjoutes.length}) {historiqueDeplie ? "▲" : "▼"}
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              historiqueDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <ul className="mt-2 flex max-h-40 flex-col gap-1.5 overflow-y-auto pr-1">
                {dejaAjoutes.map((item) => (
                  <li key={item.id} className="rounded-lg bg-dj-surface-haute px-2 py-1.5 text-xs">
                    <p className="truncate text-dj-texte">{item.nom_fichier}</p>
                    <p className="text-[11px] text-dj-texte-muet">
                      {item.role_cible === "enseignant" ? "→ enseignants" : "→ étudiants"} ·{" "}
                      {new Date(item.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SidebarChat({
  agentId,
  retourExterne,
  retourIA,
  aDesMessages,
  conversationActiveId,
  onNouvelleConversation,
  onSelectionnerConversation,
  contenuDynamiqueParMatiere,
  sectionMesComportements,
}: {
  agentId: string;
  retourExterne?: string;
  // Retour vers l'IA qu'on utilisait avant de cliquer "Tester" depuis
  // "L'IA de mes élèves" (2026-08-06, demande Bourama : ce cas précis --
  // on est déjà dans l'app, pas venu de la vitrine -- doit être traité
  // différemment de retourExterne, qui lui déclenche aussi le mécanisme
  // "devient mon IA par défaut" côté ChatAgentClient). Chemin interne
  // relatif uniquement (/agent/{id}/chat), jamais une URL externe.
  retourIA?: string;
  aDesMessages: boolean;
  conversationActiveId: string | null;
  onNouvelleConversation: () => void;
  onSelectionnerConversation: (fil: FilConversation) => void;
  // Agent "Nitrux" / contenu dynamique par matière (06/08/2026, demande
  // Bourama). Le bloc "écrire une matière" (côté enseignant) vit ailleurs
  // -- ici on garde UNIQUEMENT "entrer un code -> matière débloquée"
  // (côté étudiant), volontairement simplifié le 06/08 (Bourama : "le
  // reste [...] et remplace-le par le mécanisme de je rentre le code et
  // la matière est débloquée" -- l'ancien lien vers une page /matieres à
  // deux blocs a été retiré).
  contenuDynamiqueParMatiere?: boolean;
  // Section "Mes comportements" (06/08/2026, demande Bourama) : pilotée
  // par agents.section_mes_comportements, indépendamment de
  // contenuDynamiqueParMatiere ci-dessus (Nitrux uniquement pour
  // l'instant). Voir components/MesComportements.tsx.
  sectionMesComportements?: boolean;
}) {
  const [ouverte, setOuverte] = useState(false);
  const [connecte, setConnecte] = useState<boolean | undefined>(undefined);
  const [fils, setFils] = useState<FilConversation[] | null>(null);
  const [historiqueDeplie, setHistoriqueDeplie] = useState(false);
  const [avisDeplie, setAvisDeplie] = useState(false);
  const [profilDeplie, setProfilDeplie] = useState(false);
  const [comportementsDeplie, setComportementsDeplie] = useState(false);
  const [codeDeplie, setCodeDeplie] = useState(false);
  const [code, setCode] = useState("");
  const [codeEnCours, setCodeEnCours] = useState(false);
  const [codeErreur, setCodeErreur] = useState<string | null>(null);
  const [codeSucces, setCodeSucces] = useState<string | null>(null);
  const [rattachements, setRattachements] = useState<Rattachement[] | null>(null);
  const [rattachementsChargement, setRattachementsChargement] = useState(false);
  const [actionsDeplie, setActionsDeplie] = useState(false);
  const [profilADesChamps, setProfilADesChamps] = useState(false);
  const [copie, setCopie] = useState(false);
  const [monRole, setMonRole] = useState<MonRole | null>(null);
  const [envoyerDeplie, setEnvoyerDeplie] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const boutonBasculeRef = useRef<HTMLButtonElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  // Bouton "Applications" du sidebar (2026-08-01, demande Bourama) : ne
  // doit s'afficher que si le créateur de l'agent a activé au moins une
  // appli, même logique que appliButtonVisible/appliSlotUnique dans
  // BarreDeSaisie.tsx (voir outilAutorisePourAgent là-bas). `null` tant
  // que pas encore chargé -> bouton caché (fail closed), pas de flash.
  const [applisActivesAgent, setApplisActivesAgent] = useState<string[] | null>(null);
  useEffect(() => {
    if (!agentId) {
      setApplisActivesAgent([]);
      return;
    }
    let annule = false;
    lireOutilsChatAgent(agentId)
      .then((reponse) => {
        if (annule) return;
        // Même logique que outilAutorisePourAgent + outilsPourAgent +
        // applisPourAgent dans BarreDeSaisie.tsx : un outil "ui_..." est
        // autorisé s'il est dans actions_locales, sinon s'il est dans
        // outils ; une appli est autorisée si au moins un de ses outils
        // (champ `.appli` sur OUTILS_DISPONIBLES) est autorisé.
        const outilsPourAgent = OUTILS_DISPONIBLES.filter((o) =>
          o.nom.startsWith("ui_")
            ? reponse.actions_locales.includes(o.nom)
            : reponse.outils.includes(o.nom)
        );
        const applisPourAgent = APPLIS_DISPONIBLES.filter((a) =>
          outilsPourAgent.some((o) => o.appli === a.nom)
        );
        setApplisActivesAgent(applisPourAgent.map((a) => a.nom));
      })
      .catch(() => {
        if (!annule) setApplisActivesAgent([]);
      });
    return () => {
      annule = true;
    };
  }, [agentId]);
  const boutonApplicationsVisible = (applisActivesAgent?.length ?? 0) > 0;

  // Clic en dehors du panneau -> fermeture (2026-07-20, bug trouvé par
  // Bourama en test réel). mousedown plutôt que click : se déclenche
  // avant le click du bouton bascule lui-même, donc on exclut ce bouton
  // explicitement (via boutonBasculeRef) pour éviter un double-toggle
  // (fermeture par ce handler puis réouverture immédiate par le onClick
  // du bouton, dans le même geste). Même raison pour railRef depuis le
  // 27/07 : le rail permanent contient son propre bouton bascule.
  useEffect(() => {
    if (!ouverte) return;
    function gererClicExterieur(e: MouseEvent) {
      const cible = e.target as Node;
      if (asideRef.current?.contains(cible)) return;
      if (boutonBasculeRef.current?.contains(cible)) return;
      if (railRef.current?.contains(cible)) return;
      setOuverte(false);
    }
    document.addEventListener("mousedown", gererClicExterieur);
    return () => document.removeEventListener("mousedown", gererClicExterieur);
  }, [ouverte]);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) setOuverte(true);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setConnecte(!!session);
    });
  }, []);

  useEffect(() => {
    if (!connecte) return;
    appelerApi(`/api/historique/${agentId}/conversations`)
      .then((r: FilConversation[]) => setFils(r))
      .catch(() => setFils([]));
  }, [connecte, agentId, aDesMessages]);

  // "Envoyer à..." (2026-08-06) : ne s'affiche que si la personne
  // connectée a un rôle enseignant OU établissement ET regarde bien le
  // chat de SA propre IA (agent_id renvoyé par /api/roles/moi) -- pas
  // l'IA de quelqu'un d'autre qu'elle testerait. `monRole` reste `null`
  // si l'appel échoue ou si la personne n'a pas de rôle hiérarchique.
  useEffect(() => {
    if (!connecte) return;
    lireMonRole()
      .then(setMonRole)
      .catch(() => setMonRole(null));
  }, [connecte]);
  const peutEnvoyer =
    (monRole?.role === "enseignant" || monRole?.role === "etablissement") &&
    monRole.agent_id === agentId;

  function rafraichirRattachements() {
    setRattachementsChargement(true);
    lireMesRattachements(agentId)
      .then(setRattachements)
      .catch(() => setRattachements([]))
      .finally(() => setRattachementsChargement(false));
  }

  useEffect(() => {
    if (!connecte || !contenuDynamiqueParMatiere) return;
    rafraichirRattachements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecte, contenuDynamiqueParMatiere, agentId]);

  async function activerEnseignant(contenuId: string) {
    try {
      await activerRattachementMatiere(agentId, contenuId);
      rafraichirRattachements();
    } catch (e) {
      setCodeErreur(messageErreur(e));
    }
  }

  async function renommerMatiere(contenuId: string, surnom: string) {
    // Optimiste : la liste se met à jour tout de suite, pas d'attente
    // réseau visible pour un simple renommage.
    setRattachements((precedent) =>
      (precedent || []).map((r) => (r.contenu_id === contenuId ? { ...r, surnom: surnom || null } : r))
    );
    try {
      await renommerRattachementMatiere(agentId, contenuId, surnom);
    } catch (e) {
      setCodeErreur(messageErreur(e));
      rafraichirRattachements();
    }
  }

  async function partager() {
    const url = `${window.location.origin}/agent/${agentId}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // Annulé par la personne -- flux normal du Web Share API.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      window.prompt("Copie ce lien :", url);
    }
  }

  function choisirFil(fil: FilConversation) {
    onSelectionnerConversation(fil);
    setHistoriqueDeplie(false);
  }

  // Bascule exclusive pour les 2 icônes du rail qui pilotent un volet
  // repliable (Historique/Mon profil) -- corrige deux bugs remontés
  // par Bourama le 28/07 : (1) un second clic sur la même icône ne
  // refermait jamais rien (les anciens onClick forçaient toujours
  // `true`) ; (2) cliquer une AUTRE icône ne changeait visiblement rien
  // tant que la section précédente restait ouverte en même temps, plus
  // bas dans un panneau déjà rempli -- un seul volet ouvert à la fois
  // rend le changement évident. Les boutons texte du panneau lui-même
  // (plus bas) gardent leur bascule indépendante d'origine, inchangée.
  // Avis sur cet agent vit depuis le 06/08 dans le bouton "Actions"
  // (basculerActions ci-dessous), avec son propre bascule indépendant
  // (setAvisDeplie), plus dans cette exclusivité.
  function basculerVoletRail(section: "historique" | "profil" | "code" | "comportements") {
    const dejaActif =
      (section === "historique" && historiqueDeplie) ||
      (section === "profil" && profilDeplie) ||
      (section === "code" && codeDeplie) ||
      (section === "comportements" && comportementsDeplie);
    setHistoriqueDeplie(section === "historique" ? !dejaActif : false);
    setProfilDeplie(section === "profil" ? !dejaActif : false);
    setCodeDeplie(section === "code" ? !dejaActif : false);
    setComportementsDeplie(section === "comportements" ? !dejaActif : false);
    setOuverte(true);
  }

  async function validerCode() {
    if (!code.trim()) return;
    setCodeEnCours(true);
    setCodeErreur(null);
    setCodeSucces(null);
    try {
      const rattachement = await entrerCodeMatiere(agentId, code.trim());
      setCode("");
      setCodeSucces(`${rattachement.matiere} débloquée.`);
      rafraichirRattachements();
    } catch (e) {
      setCodeErreur(messageErreur(e));
    } finally {
      setCodeEnCours(false);
    }
  }

  // Bouton "Actions" (2026-08-06, demande Bourama : "Retour à l'agent"
  // renommé "Voir l'IA" -- ce n'est plus vraiment un retour --, regroupé
  // avec Changer d'IA/Partager/Avis dans un seul bouton qui déplie ces 4
  // actions, déplacé en bas du rail. Seul le lien "Retour à la vitrine"
  // (logo) reste en dehors du groupe, tel quel.
  function basculerActions() {
    setActionsDeplie((v) => !v);
    setOuverte(true);
  }

  // Calcul unique du lien "Voir l'IA" / "Retour au site" / "Retour à mon
  // IA", réutilisé desktop + mobile. Priorité : retourIA (cas "Tester")
  // > retourExterne (venu de la vitrine) > "Voir l'IA" par défaut.
  const lienPrincipal = retourIA
    ? { href: retourIA, icone: <ArrowLeft size={16} />, texte: "Retour à mon IA" }
    : retourExterne
      ? { href: retourExterne, icone: <ArrowLeft size={16} />, texte: "Retour au site" }
      : { href: `/agent/${agentId}`, icone: <Eye size={16} />, texte: "Voir l'IA" };

  return (
    <>
      {/* Fond assombri : seulement sur mobile (< md), seulement quand le
          panneau est ouvert -- sur desktop il pousse le contenu comme
          avant, pas de fond nécessaire. Cliquer dessus ferme le panneau
          (redondant avec le clic-extérieur ci-dessus, gardé explicite
          pour l'accessibilité tactile). */}
      {ouverte && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOuverte(false)}
          aria-hidden="true"
        />
      )}

      {/* Bouton replier/déplier flottant -- MOBILE UNIQUEMENT depuis le
          27/07 (md:hidden) : sur desktop le même bouton vit maintenant
          dans le rail permanent ci-dessous. */}
      <button
        ref={boutonBasculeRef}
        onClick={() => setOuverte((v) => !v)}
        aria-label={ouverte ? "Replier le panneau" : "Déplier le panneau"}
        className="fixed left-2 top-2 z-40 flex h-8 w-8 items-center justify-center rounded-md bg-black/35 text-white hover:bg-black/50 md:hidden"
      >
        {ouverte ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
      </button>

      {/* Rail/panneau fusionnés -- desktop uniquement (Bourama, 28/07 :
          "le rail qui s'élargit et devien exactement le panneau", au
          lieu d'un second panneau séparé qui s'ouvrait à côté). UN SEUL
          élément dont la largeur bascule entre 56px (icônes seules) et
          288px (icônes + libellés + contenu des volets) -- pas de
          panneau distinct sur desktop. Le petit bouton flottant +
          l'ancien panneau plein-largeur plus bas restent utilisés sur
          MOBILE uniquement (md:hidden dessus), comportement inchangé
          depuis l'audit responsive du 27/07. */}
      {/* CORRIGÉ le 28/07/2026 (Bourama : "quand ça apparaît, on dirait
          que quelque chose de plus grand rétrécit... surtout le bouton
          retour") : la largeur du conteneur s'animait bien, mais le
          CONTENU à l'intérieur changeait de forme instantanément au clic
          ({ouverte && "texte"} + classes justify-center/px-0 <->
          justify-start/px-4 changées d'un coup) -- l'icône sautait de
          taille (16<->18) ET de position (centrée <-> alignée à gauche),
          ET le bouton Retour changeait de forme (pastille ronde <->
          pilule). Résultat : le contenu "sautait" à sa forme finale
          pendant que le conteneur était encore en train de s'élargir
          lentement autour de lui. Corrigé en gardant l'icône dans un
          emplacement fixe (toujours 40x40, jamais recentrée) et en
          animant seulement l'apparition du libellé (max-width + opacity,
          même durée que la largeur du conteneur) -- rien ne change de
          forme ou de taille au clic, seul le texte se révèle
          progressivement. */}
      <div
        ref={railRef}
        className={`hidden flex-shrink-0 flex-col overflow-hidden border-r border-dj-bordure bg-dj-fond px-2 py-3 transition-[width] duration-300 ease-out md:flex ${
          ouverte ? "md:w-72" : "md:w-14"
        }`}
      >
        <button
          onClick={() => setOuverte((v) => !v)}
          aria-label={ouverte ? "Replier le panneau" : "Déplier le panneau"}
          className="flex w-full items-center gap-2 rounded-xl text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
            {ouverte ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
          </span>
          <LibelleRail ouverte={ouverte}>Replier</LibelleRail>
        </button>

        <div className="my-2 h-px w-full bg-dj-bordure" />

        {/* Ajouté le 31/07 (Bourama : "ajoute le bouton mon espace dans le
            chat") -- même route que "Mon espace" dans la TopBar. Pointe
            vers /dashboard/espace depuis le 01/08 (nouvelle page, voir
            TopBar.tsx pour le détail). */}
        <Link
          href="/dashboard/espace"
          className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dj-bordure text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
            <UserCircle size={18} />
          </span>
          <LibelleRail ouverte={ouverte}>Mon espace</LibelleRail>
        </Link>

        {/* Ajouté le 31/07 (Bourama : distinct du bouton "Applications" de
            la barre de saisie -- celui-ci sert à CONNECTER une appli
            (voir app/dashboard/applications/page.tsx), l'autre à
            EXÉCUTER une action via une appli déjà connectée, voir
            BarreDeSaisie.tsx).
            Condition de visibilité ajoutée le 01/08 (Bourama : "qu'il ne
            s'affiche que quand le créateur de l'agent a activé au moins
            une appli") -- même logique que appliButtonVisible /
            appliSlotUnique dans BarreDeSaisie.tsx, calculée plus haut via
            applisActivesAgent. */}
        {boutonApplicationsVisible && (
          <Link
            href="/dashboard/applications"
            className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dj-bordure text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
              <LayoutGrid size={18} />
            </span>
            <LibelleRail ouverte={ouverte}>Applications</LibelleRail>
          </Link>
        )}

        {agentId === "stirux" && (
          <Link
            href={`/agent/${agentId}/enseigner`}
            className="mt-2 flex w-full items-center gap-2 rounded-xl text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
              <GraduationCap size={18} />
            </span>
            <LibelleRail ouverte={ouverte}>L&apos;IA de mes élèves</LibelleRail>
          </Link>
        )}

        {contenuDynamiqueParMatiere && (
          <div className="mt-2 rounded-xl border border-dj-bordure">
            <button
              onClick={() => basculerVoletRail("code")}
              title="Débloquer une matière"
              className={`flex w-full items-center gap-2 rounded-xl transition-colors ${
                codeDeplie ? "text-dj-accent-1" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
              }`}
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                <GraduationCap size={18} />
              </span>
              <LibelleRail ouverte={ouverte}>Débloquer une matière</LibelleRail>
            </button>
            {ouverte && (
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  codeDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col gap-2 px-2 pb-2">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && !codeEnCours && validerCode()}
                      placeholder="CODE"
                      className="rounded-lg border border-dj-bordure bg-transparent px-2 py-1.5 text-sm uppercase tracking-widest text-dj-texte"
                    />
                    <button
                      onClick={validerCode}
                      disabled={codeEnCours || !code.trim()}
                      className="rounded-lg bg-dj-accent-1 px-2 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                    >
                      {codeEnCours ? "Validation…" : "Valider"}
                    </button>
                    {codeErreur && <p className="text-xs text-red-500">{codeErreur}</p>}
                    {codeSucces && <p className="text-xs text-green-600">{codeSucces}</p>}
                  </div>
                  <ListeMatieresDebloquees
                    rattachements={rattachements}
                    chargement={rattachementsChargement}
                    onActiver={activerEnseignant}
                    onRenomme={renommerMatiere}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {connecte && aDesMessages && (
          <button
            onClick={onNouvelleConversation}
            className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dj-bordure text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
              <MessageSquarePlus size={18} />
            </span>
            <LibelleRail ouverte={ouverte}>Nouvelle conversation</LibelleRail>
          </button>
        )}

        {connecte && fils && fils.length > 0 && (
          <div className="mt-2 rounded-xl border border-dj-bordure">
            <button
              onClick={() => basculerVoletRail("historique")}
              title="Historique"
              className={`flex w-full items-center gap-2 rounded-xl transition-colors ${
                historiqueDeplie ? "text-dj-accent-1" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
              }`}
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                <History size={18} />
              </span>
              <LibelleRail ouverte={ouverte}>Historique</LibelleRail>
            </button>
            {ouverte && (
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  historiqueDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col px-1 pb-1">
                    {fils.map((fil) => {
                      const estActive = fil.conversation_id === conversationActiveId;
                      return (
                        <button
                          key={fil.conversation_id ?? "legacy"}
                          onClick={() => !estActive && choisirFil(fil)}
                          disabled={estActive}
                          className={`border-b border-white/[0.06] px-2 py-2 text-left text-sm last:border-b-0 ${
                            estActive ? "text-dj-accent-1" : "text-dj-texte hover:text-dj-accent-1"
                          }`}
                        >
                          {estActive ? "● " : ""}
                          {fil.titre}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {connecte && profilADesChamps && (
          <div className="mt-2 rounded-xl border border-dj-bordure">
            <button
              onClick={() => basculerVoletRail("profil")}
              title="Mon profil"
              className={`flex w-full items-center gap-2 rounded-xl transition-colors ${
                profilDeplie ? "text-dj-accent-1" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
              }`}
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                <Contact size={18} />
              </span>
              <LibelleRail ouverte={ouverte}>Mon profil</LibelleRail>
            </button>
            {ouverte && (
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  profilDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <MonProfilAgent agentId={agentId} onEtat={setProfilADesChamps} />
                </div>
              </div>
            )}
          </div>
        )}

        {connecte && sectionMesComportements && (
          <div className="mt-2 rounded-xl border border-dj-bordure">
            <button
              onClick={() => basculerVoletRail("comportements")}
              title="Mes comportements"
              className={`flex w-full items-center gap-2 rounded-xl transition-colors ${
                comportementsDeplie ? "text-dj-accent-1" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
              }`}
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                <Sparkles size={18} />
              </span>
              <LibelleRail ouverte={ouverte}>Mes comportements</LibelleRail>
            </button>
            {ouverte && (
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  comportementsDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <MesComportements agentId={agentId} />
                </div>
              </div>
            )}
          </div>
        )}

        {ouverte && (
          <div className="mt-auto flex justify-center pt-2">
            <BoutonInstaller />
          </div>
        )}

        <div className={`rounded-xl border border-dj-bordure ${ouverte ? "mt-2" : "mt-auto"}`}>
          <button
            onClick={basculerActions}
            title="Actions"
            className={`flex w-full items-center gap-2 rounded-xl transition-colors ${
              actionsDeplie ? "text-dj-accent-1" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
            }`}
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
              <MoreHorizontal size={18} />
            </span>
            <LibelleRail ouverte={ouverte}>Actions</LibelleRail>
          </button>
          {ouverte && (
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                actionsDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-2 px-2 pb-2">
                  <Link
                    href={lienPrincipal.href}
                    className="flex w-full items-center gap-2 rounded-lg bg-dj-gradient px-2 py-2 font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5"
                  >
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                      {lienPrincipal.icone}
                    </span>
                    <span className="text-sm">{lienPrincipal.texte}</span>
                  </Link>

                  <Link
                    href="/choisir-agent"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-dj-texte-muet transition-colors hover:bg-dj-surface hover:text-dj-texte"
                  >
                    <Shuffle size={16} className="flex-shrink-0" />
                    Changer d'IA
                  </Link>

                  <button
                    onClick={partager}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-dj-texte-muet transition-colors hover:bg-dj-surface hover:text-dj-texte"
                  >
                    <Share2 size={16} className="flex-shrink-0" />
                    {copie ? "Copié !" : "Partager"}
                  </button>

                  <div className="rounded-lg border border-dj-bordure">
                    <button
                      onClick={() => setAvisDeplie((v) => !v)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                        avisDeplie ? "text-dj-accent-1" : "text-dj-texte-muet hover:bg-dj-surface hover:text-dj-texte"
                      }`}
                    >
                      <Star size={16} className="flex-shrink-0" />
                      Avis sur cet agent
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                        avisDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="flex flex-col gap-4 px-2 pb-2">
                          <NoteAgent agentId={agentId} />
                          <CommentairesAgent agentId={agentId} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ajouté le 02/08 (Bourama : "piégée dans le chat, aucun moyen de
            sortir et revenir à la vitrine") -- distinct du bouton
            "Retour au site"/"Retour à l'agent" plus haut, qui dépend de
            retourExterne (présent seulement si on est arrivé depuis un
            lien de la vitrine avec ?retour=...). Celui-ci renvoie
            TOUJOURS vers djiguigne.com, peu importe l'agent ou la
            provenance du chat. */}
        <Link
          href="https://djiguigne-ai.vercel.app"
          title="Retour à la vitrine"
          className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dj-bordure text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
            <Image src="/logo.png" alt="" width={20} height={20} />
          </span>
          <LibelleRail ouverte={ouverte}>
            <span className="font-display font-bold tracking-tight">
              Djiguignè <span className="text-dj-accent-1">AI</span>
            </span>
          </LibelleRail>
        </Link>
      </div>

      {/* CORRIGÉ le 22/07/2026 (Bourama : "sursaute au lieu de glisser") :
          le panneau était monté/démonté d'un coup ({ouverte && ...}), donc
          aucune transition possible -- juste apparition/disparition
          instantanée. Maintenant toujours monté, seule la largeur du

          conteneur externe est animée (overflow-hidden pour clipper
          proprement), le contenu interne garde une largeur fixe pour ne
          jamais se tasser/reflow pendant l'animation. */}
      {/* AJUSTÉ le 22/07/2026 (Bourama : "la ligne droite efface au lieu
          que la barre glisse") : la largeur seule donne l'impression
          d'un balayage (le contenu reste immobile, juste dévoilé/masqué
          par le bord droit qui bouge). Le panneau interne se translate
          maintenant EN PLUS, dans le même sens et la même durée que le
          rétrécissement de largeur -- effet "tout le bloc part vers la
          gauche" plutôt qu'un simple dévoilement. */}
      {/* MOBILE UNIQUEMENT depuis le 28/07 (md:hidden ajouté) : ce
          panneau plein-largeur (overlay, avec le fond assombri
          ci-dessus) ne sert plus que sur petit écran -- desktop utilise
          désormais le rail/panneau fusionné ci-dessus à la place. */}
      <div
        className={`fixed inset-y-0 left-0 z-40 shrink-0 overflow-hidden transition-[width] duration-300 ease-out md:hidden ${
          ouverte ? "w-72" : "w-0"
        }`}
      >
        <aside
          ref={asideRef}
          className={`flex h-full w-72 flex-col gap-3 overflow-y-auto border-r border-dj-bordure bg-dj-fond px-3 pb-4 pt-14 transition-transform duration-300 ease-out ${
            ouverte ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Link
            href="/dashboard/espace"
            className="flex items-center justify-center gap-2 rounded-[10px] border border-dj-bordure bg-dj-surface-haute px-4 py-2.5 text-sm text-dj-texte transition-colors hover:bg-dj-surface"
          >
            <UserCircle size={16} />
            Mon espace
          </Link>

          {boutonApplicationsVisible && (
            <Link
              href="/dashboard/applications"
              className="flex items-center justify-center gap-2 rounded-[10px] border border-dj-bordure bg-dj-surface-haute px-4 py-2.5 text-sm text-dj-texte transition-colors hover:bg-dj-surface"
            >
              <LayoutGrid size={16} />
              Applications
            </Link>
          )}

          {agentId === "stirux" && (
            <Link
              href={`/agent/${agentId}/enseigner`}
              className="flex items-center justify-center gap-2 rounded-[10px] border border-dj-bordure bg-dj-surface-haute px-4 py-2.5 text-sm text-dj-texte transition-colors hover:bg-dj-surface"
            >
              <GraduationCap size={16} />
              L&apos;IA de mes élèves
            </Link>
          )}

          {contenuDynamiqueParMatiere && (
            <div className="rounded-xl border border-dj-bordure">
              <button
                onClick={() => setCodeDeplie((v) => !v)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-dj-texte"
              >
                <GraduationCap size={16} />
                Débloquer une matière
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  codeDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col gap-2 px-3 pb-3">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && !codeEnCours && validerCode()}
                      placeholder="CODE"
                      className="rounded-lg border border-dj-bordure bg-transparent px-2 py-1.5 text-sm uppercase tracking-widest text-dj-texte"
                    />
                    <button
                      onClick={validerCode}
                      disabled={codeEnCours || !code.trim()}
                      className="rounded-lg bg-dj-accent-1 px-2 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                    >
                      {codeEnCours ? "Validation…" : "Valider"}
                    </button>
                    {codeErreur && <p className="text-xs text-red-500">{codeErreur}</p>}
                    {codeSucces && <p className="text-xs text-green-600">{codeSucces}</p>}
                  </div>
                  <ListeMatieresDebloquees
                    rattachements={rattachements}
                    chargement={rattachementsChargement}
                    onActiver={activerEnseignant}
                    onRenomme={renommerMatiere}
                  />
                </div>
              </div>
            </div>
          )}

          {connecte && aDesMessages && (
            <button
              onClick={onNouvelleConversation}
              className="flex items-center justify-center gap-2 rounded-[10px] border border-dj-bordure bg-dj-surface-haute px-4 py-2.5 text-sm text-dj-texte transition-colors hover:bg-dj-surface"
            >
              <MessageSquarePlus size={16} />
              Nouvelle conversation
            </button>
          )}

          {connecte && fils && fils.length > 0 && (
            <div className="rounded-xl border border-dj-bordure">
              <button
                onClick={() => setHistoriqueDeplie((v) => !v)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-dj-texte"
              >
                <History size={16} />
                Historique
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  historiqueDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col px-1 pb-1">
                    {fils.map((fil) => {
                      const estActive = fil.conversation_id === conversationActiveId;
                      return (
                        <button
                          key={fil.conversation_id ?? "legacy"}
                          onClick={() => !estActive && choisirFil(fil)}
                          disabled={estActive}
                          className={`border-b border-white/[0.06] px-2 py-2 text-left text-sm last:border-b-0 ${
                            estActive ? "text-dj-accent-1" : "text-dj-texte hover:text-dj-accent-1"
                          }`}
                        >
                          {estActive ? "● " : ""}
                          {fil.titre}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {connecte && peutEnvoyer && (
            <div className="rounded-xl border border-dj-bordure">
              <button
                onClick={() => setEnvoyerDeplie((v) => !v)}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  envoyerDeplie ? "text-dj-accent-1" : "text-dj-texte"
                }`}
              >
                <Send size={16} />
                {monRole?.role === "etablissement"
                  ? "Ajouter à la bibliothèque de mes enseignants/étudiants"
                  : "Ajouter à la bibliothèque de mes étudiants"}
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  envoyerDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <SectionEnvoyer role={monRole!.role as "enseignant" | "etablissement"} />
                </div>
              </div>
            </div>
          )}

          {connecte && (
            <div className={`rounded-xl border border-dj-bordure ${profilADesChamps ? "" : "hidden"}`}>
              <button
                onClick={() => setProfilDeplie((v) => !v)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-dj-texte"
              >
                <Contact size={16} />
                Mon profil
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  profilDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <MonProfilAgent agentId={agentId} onEtat={setProfilADesChamps} />
                </div>
              </div>
            </div>
          )}

          {connecte && sectionMesComportements && (
            <div className="rounded-xl border border-dj-bordure">
              <button
                onClick={() => setComportementsDeplie((v) => !v)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-dj-texte"
              >
                <Sparkles size={16} />
                Mes comportements
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  comportementsDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <MesComportements agentId={agentId} />
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto flex justify-center">
            <BoutonInstaller />
          </div>

          <div className="rounded-xl border border-dj-bordure">
            <button
              onClick={() => setActionsDeplie((v) => !v)}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                actionsDeplie ? "text-dj-accent-1" : "text-dj-texte"
              }`}
            >
              <MoreHorizontal size={16} />
              Actions
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                actionsDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-2 px-2 pb-2">
                  <Link
                    href={lienPrincipal.href}
                    className="flex items-center justify-center gap-2 rounded-[10px] bg-dj-gradient px-4 py-2.5 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5"
                  >
                    {lienPrincipal.icone}
                    {lienPrincipal.texte}
                  </Link>

                  <Link
                    href="/choisir-agent"
                    className="flex items-center justify-center gap-2 rounded-[10px] border border-dj-bordure bg-dj-surface-haute px-4 py-2.5 text-sm text-dj-texte transition-colors hover:bg-dj-surface"
                  >
                    <Shuffle size={16} />
                    Changer d'IA
                  </Link>

                  <button
                    onClick={partager}
                    className="flex items-center justify-center gap-2 rounded-[10px] border border-dj-bordure bg-dj-surface-haute px-4 py-2.5 text-sm text-dj-texte transition-colors hover:bg-dj-surface"
                  >
                    <Share2 size={16} />
                    {copie ? "Copié !" : "Partager"}
                  </button>

                  <div className="rounded-[10px] border border-dj-bordure">
                    <button
                      onClick={() => setAvisDeplie((v) => !v)}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                        avisDeplie ? "text-dj-accent-1" : "text-dj-texte"
                      }`}
                    >
                      <Star size={16} />
                      Avis sur cet agent
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                        avisDeplie ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="flex flex-col gap-4 px-3 pb-3">
                          <NoteAgent agentId={agentId} />
                          <CommentairesAgent agentId={agentId} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ajouté le 02/08 (Bourama : "piégée dans le chat, aucun moyen
              de sortir et revenir à la vitrine") -- voir le commentaire
              équivalent dans le rail desktop ci-dessus. */}
          <Link
            href="https://djiguigne-ai.vercel.app"
            title="Retour à la vitrine"
            className="flex items-center justify-center gap-2 rounded-[10px] border border-dj-bordure px-4 py-2.5 text-sm transition-colors hover:bg-dj-surface"
          >
            <Image src="/logo.png" alt="" width={18} height={18} />
            <span className="font-display font-bold tracking-tight text-dj-texte">
              Djiguignè <span className="text-dj-accent-1">AI</span>
            </span>
          </Link>
        </aside>
      </div>
    </>
  );
}

export type { FilConversation };

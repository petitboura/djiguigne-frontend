"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { appelerApi, appelerApiFichier } from "@/lib/api";
import { RecadreurImage } from "@/components/RecadreurImage";
import { messageErreur } from "@/lib/erreurs";
import { IconeGenerique } from "@/components/icones/IconeGenerique";

// Réécrit le 2026-08-05 (demande Bourama : remplacer l'emoji ET la grande
// bannière d'image vitrine, partout, par une icône compacte -- dessinée à
// la main ou uploadée -- déjà le cas au coup par coup pour l'agent
// "math-matique" via IconeMatrix.tsx + AGENTS_SANS_IMAGE_VITRINE avant ce
// changement, généralisé ici à tous les agents. `icone_url` est
// maintenant la seule source de vérité visuelle : rempli -> photo/dessin
// uploadé ; vide -> IconeGenerique (jamais l'emoji ui_config.icone_page,
// qui reste en base pour d'autres usages internes mais n'est plus
// affiché nulle part).
//
// La bannière 16:9 (image_vitrine_url) est entièrement retirée de cette
// carte, y compris son flow d'édition en ligne (upload + recadrage 16:9,
// bouton "Ajouter une image vitrine") -- ce champ reste en base pour les
// agents créés avant ce changement, simplement plus affiché.

// Réutilisé par le feed (D.2), la recherche (D.2) et le portfolio créateur
// (D.4) — un seul endroit à faire évoluer si l'apparence d'une carte agent
// change. `icone_url` optionnel : GET /api/search ne renvoie que
// id/nom/icone_url minimal, contrairement à GET /api/feed.
export type AgentResume = {
  id: string;
  nom: string;
  icone_url?: string | null;
  description?: string;
  // Ajouté le 2026-07-13 (Bourama : bouton on/off pour (dés)activer un
  // agent publiquement). Optionnel + défaut True partout où lu (même
  // convention "absent/NULL = actif" que le backend) : GET /api/feed et
  // GET /api/search ne renvoient pas ce champ, seul GET /api/profiles/
  // {id} le fait (voir api/profiles.py, AgentDuCreateur).
  actif?: boolean;
};

// Édition en ligne ajoutée le 2026-07-12 (Bourama, capture d'écran "Mes
// agents" : "Pro Math" sans description ni image vitrine) : plutôt que de
// laisser ces champs vides sans rien dire, `editable` (utilisé UNIQUEMENT
// par le dashboard "Mes agents", jamais par le feed/recherche/portfolio
// public — voir app/dashboard/page.tsx) affiche des boutons "Écrire une
// description publique" / un petit crayon sur l'icône. Cliquer dessus
// édite DIRECTEMENT dans la carte (PATCH /api/agents/{id}), PAS de
// redirection vers la page de modification complète -- c'est le point
// explicite de la demande ("ces parties se modifient directement").
//
// En mode editable, la carte n'est plus un <Link> englobant tout (les
// zones d'édition doivent pouvoir être cliquées sans déclencher une
// navigation) : c'est un <div> avec un clic sur le fond qui navigue vers
// /agent/{id}, et chaque zone éditable stoppe la propagation de son
// propre clic. En mode lecture seule (par défaut), comportement
// inchangé : un <Link> classique.
export function AgentCard({
  agent,
  editable = false,
}: {
  agent: AgentResume;
  editable?: boolean;
}) {
  const router = useRouter();
  const [donnees, setDonnees] = useState(agent);
  const [edition, setEdition] = useState<"description" | null>(null);
  const [brouillonDescription, setBrouillonDescription] = useState(donnees.description ?? "");
  const [envoiDescription, setEnvoiDescription] = useState(false);
  const [envoiIcone, setEnvoiIcone] = useState(false);
  const [envoiActif, setEnvoiActif] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fichierIconeACadrer, setFichierIconeACadrer] = useState<File | null>(null);
  const inputIconeRef = useRef<HTMLInputElement>(null);

  const estActif = donnees.actif ?? true;

  function stopper(e: { preventDefault: () => void; stopPropagation: () => void }) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function basculerActif() {
    const nouveauActif = !estActif;
    setEnvoiActif(true);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ actif: nouveauActif }),
      });
      setDonnees((d) => ({ ...d, actif: nouveauActif }));
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoiActif(false);
    }
  }

  async function enregistrerDescription() {
    setEnvoiDescription(true);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ description: brouillonDescription }),
      });
      setDonnees((d) => ({ ...d, description: brouillonDescription }));
      setEdition(null);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoiDescription(false);
    }
  }

  async function envoyerIconeCadree(blob: Blob) {
    setFichierIconeACadrer(null);
    setEnvoiIcone(true);
    setErreur(null);
    try {
      const fichierCadre = new File([blob], "icone.jpg", { type: "image/jpeg" });
      const upload = await appelerApiFichier("/api/uploads/image", fichierCadre);
      await appelerApi(`/api/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ icone_url: upload.url }),
      });
      setDonnees((d) => ({ ...d, icone_url: upload.url }));
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoiIcone(false);
      if (inputIconeRef.current) inputIconeRef.current.value = "";
    }
  }

  const contenu = (
    <>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              if (!editable) return;
              stopper(e);
              inputIconeRef.current?.click();
            }}
            disabled={envoiIcone}
            title={editable ? "Changer l'icône" : undefined}
            className={
              editable
                ? "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dj-bordure bg-dj-surface-haute transition-colors hover:border-dj-bordure-forte disabled:opacity-50"
                : "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-dj-surface-haute"
            }
          >
            {donnees.icone_url ? (
              <Image src={donnees.icone_url} alt="" fill className="object-cover" sizes="36px" />
            ) : (
              <IconeGenerique className="h-5 w-5 text-dj-accent-1" />
            )}
            {editable && (
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute bottom-0 right-0 rounded-full bg-dj-fond/80 p-0.5 text-dj-texte-muet"
                aria-hidden="true"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            )}
          </button>
          {editable && (
            <input
              ref={inputIconeRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFichierIconeACadrer(f);
              }}
              className="hidden"
            />
          )}
          <h3 className="font-display text-base font-bold text-dj-texte">{donnees.nom}</h3>

          {editable && (
            <div className="ml-auto flex items-center gap-1.5">
              {/* "Tester" (2026-08-04, demande Bourama) : accès direct au chat
                  de l'IA depuis "Mon espace", sans repasser par la vitrine
                  /agent/{id}. */}
              <Link
                href={`/agent/${agent.id}/chat`}
                onClick={(e) => e.stopPropagation()}
                className="rounded-full border border-dj-bordure px-3 py-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte"
              >
                Tester
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  stopper(e);
                  basculerActif();
                }}
                disabled={envoiActif}
                title={estActif ? "IA publique : clique pour rendre privée" : "IA privée : clique pour rendre publique"}
                className={
                  estActif
                    ? "rounded-full bg-dj-gradient px-3 py-1 text-xs font-bold text-[#1A0D02] disabled:opacity-50"
                    : "rounded-full border border-dj-bordure px-3 py-1 text-xs text-dj-texte-muet disabled:opacity-50"
                }
              >
                {envoiActif ? "…" : estActif ? "Public" : "Privé"}
              </button>
            </div>
          )}
        </div>

        {donnees.description ? (
          <p
            className={
              editable
                ? "line-clamp-2 cursor-text text-sm text-dj-texte-muet transition-colors hover:text-dj-texte"
                : "line-clamp-2 text-sm text-dj-texte-muet"
            }
            onClick={
              editable
                ? (e) => {
                    stopper(e);
                    setBrouillonDescription(donnees.description ?? "");
                    setEdition("description");
                  }
                : undefined
            }
          >
            {donnees.description}
          </p>
        ) : editable ? (
          <button
            type="button"
            onClick={(e) => {
              stopper(e);
              setBrouillonDescription("");
              setEdition("description");
            }}
            className="flex items-center gap-1.5 self-start text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Écrire une description publique
          </button>
        ) : null}

        {erreur && <p className="text-xs text-[#F87171]">{erreur}</p>}
      </div>
    </>
  );

  return (
    <>
      {editable ? (
        <div
          onClick={(e) => {
            // Correction du bug "cliquer sur une IA ne fait rien" (Bourama,
            // 2026-07-15) : l'ancienne garde `e.target === e.currentTarget`
            // exigeait que le clic tombe EXACTEMENT sur le fond de la
            // carte -- chaque zone réellement interactive (icône,
            // description, boutons) appelle déjà stopper() avant sa propre
            // action (voir plus haut), donc la propagation ne remonte
            // JAMAIS jusqu'ici depuis ces zones -- pas besoin de la garde
            // en plus, elle ne faisait que casser le cas normal.
            router.push(`/agent/${agent.id}`);
          }}
          className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface transition-colors hover:border-dj-bordure-forte"
        >
          {contenu}
        </div>
      ) : (
        <Link
          href={`/agent/${agent.id}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface transition-colors hover:border-dj-bordure-forte"
        >
          {contenu}
        </Link>
      )}

      {fichierIconeACadrer && (
        <RecadreurImage
          source={fichierIconeACadrer}
          aspect={1}
          onValider={envoyerIconeCadree}
          onAnnuler={() => {
            setFichierIconeACadrer(null);
            if (inputIconeRef.current) inputIconeRef.current.value = "";
          }}
        />
      )}

      {editable && edition === "description" && (
        // Popup, pas une zone de texte cramée dans la carte (Bourama,
        // 2026-07-13 : "un pop up un peu plus grand, sinon pas cool à
        // éditer tel quel") -- même style de modal que RecadreurImage,
        // pour rester cohérent visuellement.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => {
            stopper(e);
            setEdition(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border border-dj-bordure bg-dj-surface p-4"
            onClick={stopper}
          >
            <p className="mb-3 text-sm font-medium text-dj-texte">
              Description publique de {donnees.nom}
            </p>
            <textarea
              autoFocus
              value={brouillonDescription}
              onChange={(e) => setBrouillonDescription(e.target.value)}
              rows={6}
              placeholder="En une ou deux phrases, ce que fait cette IA..."
              className="w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
            />
            {erreur && <p className="mt-2 text-xs text-[#F87171]">{erreur}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={(e) => {
                  stopper(e);
                  setEdition(null);
                }}
                className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte-muet transition-colors hover:border-dj-bordure-forte"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={(e) => {
                  stopper(e);
                  enregistrerDescription();
                }}
                disabled={envoiDescription}
                className="rounded-full bg-dj-gradient px-4 py-2 text-sm font-bold text-[#1A0D02] disabled:opacity-50"
              >
                {envoiDescription ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

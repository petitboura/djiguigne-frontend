"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { appelerApi, appelerApiFichier } from "@/lib/api";
import { RecadreurImage } from "@/components/RecadreurImage";
import { messageErreur } from "@/lib/erreurs";
import { IconeMathMatique } from "@/components/icones/IconeMathMatique";

// Cas particulier demandé par Bourama (02/08) : l'agent "math-matique" n'a
// pas de section image vitrine -- ni photo, ni emoji -- mais une icône
// dessinée à la main (compas, lignes fines, couleur du thème). Volontairement
// codé en dur pour CET agent précis, pas une règle générale par matière.
const AGENTS_SANS_IMAGE_VITRINE = new Set(["math-matique"]);

// Réutilisé par le feed (D.2), la recherche (D.2) et le portfolio créateur
// (D.4) — un seul endroit à faire évoluer si l'apparence d'une carte agent
// change. Les champs optionnels (image_vitrine_url, description) viennent
// de GET /api/feed ; GET /api/search ne renvoie que id/nom/icone_page,
// d'où leur caractère optionnel ici plutôt que requis.
export type AgentResume = {
  id: string;
  nom: string;
  icone_page?: string;
  image_vitrine_url?: string | null;
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
// description publique" / "Ajouter une image vitrine" pour pousser le
// créateur à les remplir, et un petit crayon sur l'icône. Cliquer dessus
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
  const [edition, setEdition] = useState<"description" | "icone" | null>(null);
  const [brouillonDescription, setBrouillonDescription] = useState(donnees.description ?? "");
  const [brouillonIcone, setBrouillonIcone] = useState(donnees.icone_page ?? "🤖");
  const [envoiDescription, setEnvoiDescription] = useState(false);
  const [envoiIcone, setEnvoiIcone] = useState(false);
  const [envoiImage, setEnvoiImage] = useState(false);
  const [envoiActif, setEnvoiActif] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fichierACadrer, setFichierACadrer] = useState<File | null>(null);
  const inputImageRef = useRef<HTMLInputElement>(null);

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

  async function enregistrerIcone() {
    const nouvelleIcone = brouillonIcone.trim() || "🤖";
    setEnvoiIcone(true);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ icone_page: nouvelleIcone }),
      });
      setDonnees((d) => ({ ...d, icone_page: nouvelleIcone }));
      setEdition(null);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoiIcone(false);
    }
  }

  async function envoyerImageCadree(blob: Blob) {
    setFichierACadrer(null);
    setEnvoiImage(true);
    setErreur(null);
    try {
      const fichierCadre = new File([blob], "vitrine.jpg", { type: "image/jpeg" });
      const upload = await appelerApiFichier("/api/uploads/image", fichierCadre);
      await appelerApi(`/api/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ image_vitrine_url: upload.url }),
      });
      setDonnees((d) => ({ ...d, image_vitrine_url: upload.url }));
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoiImage(false);
      if (inputImageRef.current) inputImageRef.current.value = "";
    }
  }

  // Uniquement côté public (pas en mode `editable`/dashboard) : le bloc
  // contient aussi le bouton Public/Privé, qui doit rester accessible au
  // créateur même sans image vitrine.
  const sansImageVitrine = !editable && AGENTS_SANS_IMAGE_VITRINE.has(agent.id);

  const contenu = (
    <>
      {!sansImageVitrine && (
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-dj-surface-haute">
        {donnees.image_vitrine_url ? (
          <>
            <Image
              src={donnees.image_vitrine_url}
              alt={donnees.nom}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(min-width: 768px) 33vw, 100vw"
            />
            {editable && (
              <button
                type="button"
                onClick={(e) => {
                  stopper(e);
                  inputImageRef.current?.click();
                }}
                disabled={envoiImage}
                className="absolute bottom-2 left-2 z-10 rounded-full border border-dj-bordure bg-dj-fond/80 px-3 py-1 text-xs text-dj-texte transition-colors hover:border-dj-bordure-forte disabled:opacity-50"
              >
                {envoiImage ? "Envoi…" : "Changer l'image"}
              </button>
            )}
          </>
        ) : editable ? (
          <button
            type="button"
            onClick={(e) => {
              stopper(e);
              inputImageRef.current?.click();
            }}
            disabled={envoiImage}
            className="flex flex-col items-center gap-1.5 text-xs text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-50"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            {envoiImage ? "Envoi…" : "Ajouter une image vitrine"}
          </button>
        ) : (
          <span className="text-4xl">{donnees.icone_page ?? "🤖"}</span>
        )}

        {editable && (
          <input
            ref={inputImageRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFichierACadrer(f);
            }}
            className="hidden"
          />
        )}

        {editable && (
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
                ? "absolute right-2 top-2 z-10 rounded-full bg-dj-gradient px-3 py-1 text-xs font-bold text-[#1A0D02] disabled:opacity-50"
                : "absolute right-2 top-2 z-10 rounded-full border border-dj-bordure bg-dj-fond/80 px-3 py-1 text-xs text-dj-texte-muet disabled:opacity-50"
            }
          >
            {envoiActif ? "…" : estActif ? "Public" : "Privé"}
          </button>
        )}
      </div>
      )}

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center gap-2">
          {editable && edition === "icone" ? (
            <form
              onSubmit={(e) => {
                stopper(e);
                enregistrerIcone();
              }}
              onClick={stopper}
              className="flex items-center gap-1"
            >
              <input
                autoFocus
                value={brouillonIcone}
                onChange={(e) => setBrouillonIcone(e.target.value)}
                maxLength={4}
                className="w-12 rounded-lg border border-dj-bordure bg-dj-surface-haute px-2 py-1 text-center text-lg outline-none focus:border-dj-accent-1"
              />
              <button type="submit" disabled={envoiIcone} className="text-xs text-dj-accent-1">
                {envoiIcone ? "…" : "OK"}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  stopper(e);
                  setEdition(null);
                }}
                className="text-xs text-dj-texte-muet"
              >
                Annuler
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                if (!editable) return;
                stopper(e);
                setBrouillonIcone(donnees.icone_page ?? "🤖");
                setEdition("icone");
              }}
              className={
                editable
                  ? "flex items-center gap-1 rounded px-1 -mx-1 transition-colors hover:bg-dj-surface-haute"
                  : "flex items-center gap-1"
              }
            >
              {sansImageVitrine ? (
                <IconeMathMatique className="h-9 w-9 shrink-0 text-dj-accent-1" />
              ) : (
                <span className="text-lg leading-none">{donnees.icone_page ?? "🤖"}</span>
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
                  className="text-dj-texte-muet"
                  aria-hidden="true"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              )}
            </button>
          )}
          <h3 className="font-display text-base font-bold text-dj-texte">{donnees.nom}</h3>
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
            // carte, or l'image et le bloc nom/description recouvrent
            // presque toute sa surface -- en pratique quasi aucun clic ne
            // pouvait jamais naviguer. Chaque zone réellement interactive
            // (image, icône, description, bouton actif) appelle déjà
            // stopper() avant sa propre action (voir plus haut), donc la
            // propagation ne remonte JAMAIS jusqu'ici depuis ces zones --
            // pas besoin de la garde en plus, elle ne faisait que casser
            // le cas normal.
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

      {fichierACadrer && (
        <RecadreurImage
          source={fichierACadrer}
          aspect={16 / 9}
          onValider={envoyerImageCadree}
          onAnnuler={() => {
            setFichierACadrer(null);
            if (inputImageRef.current) inputImageRef.current.value = "";
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

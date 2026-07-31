"use client";

import { useState } from "react";
import { appelerApi } from "@/lib/api";
import { ChampImage } from "@/components/ChampImage";
import { messageErreur } from "@/lib/erreurs";

// Ajouté le 2026-07-15 (Bourama) : "Publier un article" (bouton déjà
// présent mais jamais branché, voir app/dashboard/page.tsx) + les deux
// nouveaux boutons Histoire/Réflexion -- un seul composant modale,
// adapté selon `type`, plutôt que 3 quasi-identiques (voir api/posts.py
// pour les règles exactes par type que ce formulaire respecte). Upload
// d'image géré par ChampImage (déjà existant, recadrage inclus), aucun
// nouveau composant d'upload créé.
//
// Règles par type (voir api/posts.py, définies avec Bourama) :
// - article   : titre obligatoire, texte long obligatoire, couverture
//               OPTIONNELLE.
// - reflexion : pas de titre, juste un court message, aucune image.
// - histoire  : titre obligatoire, couverture OBLIGATOIRE, jusqu'à 3
//               photos supplémentaires optionnelles, légende obligatoire.

type TypePost = "article" | "reflexion" | "histoire";

const TITRES_MODALE: Record<TypePost, string> = {
  article: "Publier un article",
  reflexion: "Partager une réflexion",
  histoire: "Publier une histoire",
};

export function ModalePublierPost({
  type,
  onClose,
  onPublie,
}: {
  type: TypePost;
  onClose: () => void;
  onPublie: () => void;
}) {
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [couverture, setCouverture] = useState("");
  const [photo2, setPhoto2] = useState("");
  const [photo3, setPhoto3] = useState("");
  const [photo4, setPhoto4] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const champClasse =
    "mt-1 w-full rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte placeholder:text-dj-inactif focus:border-dj-bordure-forte focus:outline-none";
  const labelClasse = "text-xs font-medium text-dj-texte-muet";

  const pretAPublier =
    type === "reflexion"
      ? contenu.trim().length > 0
      : type === "article"
      ? titre.trim().length > 0 && contenu.trim().length > 0
      : titre.trim().length > 0 && contenu.trim().length > 0 && couverture.length > 0;

  async function publier() {
    if (!pretAPublier) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await appelerApi("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          type,
          titre: type === "reflexion" ? undefined : titre,
          contenu,
          image_couverture_url:
            type === "article" ? couverture || undefined : type === "histoire" ? couverture : undefined,
          photos_supplementaires:
            type === "histoire" ? [photo2, photo3, photo4].filter((p) => p) : [],
        }),
      });
      onPublie();
      onClose();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-dj-bordure bg-dj-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold text-dj-texte">{TITRES_MODALE[type]}</h2>

        <div className="mt-4 flex flex-col gap-4">
          {type !== "reflexion" && (
            <div>
              <label className={labelClasse}>Titre</label>
              <input
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder={type === "article" ? "Titre de l'article" : "Titre de l'histoire"}
                className={champClasse}
              />
            </div>
          )}

          {type === "article" && (
            <ChampImage valeur={couverture} onChange={setCouverture} label="Image de couverture (optionnelle)" />
          )}

          {type === "histoire" && (
            <>
              <ChampImage valeur={couverture} onChange={setCouverture} label="Photo de couverture" />
              <ChampImage valeur={photo2} onChange={setPhoto2} label="Photo supplémentaire (optionnelle)" />
              <ChampImage valeur={photo3} onChange={setPhoto3} label="Photo supplémentaire (optionnelle)" />
              <ChampImage valeur={photo4} onChange={setPhoto4} label="Photo supplémentaire (optionnelle)" />
            </>
          )}

          <div>
            <label className={labelClasse}>
              {type === "reflexion" ? "Qu'est-ce que tu penses là, maintenant ?" : type === "histoire" ? "Légende" : "Contenu"}
            </label>
            <textarea
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              rows={type === "reflexion" ? 4 : type === "article" ? 10 : 3}
              placeholder={type === "reflexion" ? "Une pensée du moment, sans structure…" : undefined}
              className={`${champClasse} resize-y`}
            />
          </div>

          {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte-muet transition-colors hover:border-dj-bordure-forte"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={publier}
              disabled={!pretAPublier || envoi}
              className="rounded-full bg-dj-gradient px-4 py-2 text-sm font-bold text-[#1A0D02] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {envoi ? "Publication…" : "Publier"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

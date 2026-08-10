"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { appelerApi } from "@/lib/api";
import { PleinEcran } from "@/components/PleinEcran";
import { Skeleton } from "@/components/Skeleton";

export type Categorie = {
  id: string;
  nom: string;
  mots_cles: string[];
  // `parent_id` prépare l'arrivée des sous-catégories (Bourama,
  // 2026-07-15) : toujours `null` pour l'instant, aucune catégorie n'est
  // encore un enfant d'une autre. Ce composant ne s'en sert pas encore,
  // mais le champ existe déjà côté API pour ne pas avoir à retoucher ce
  // type plus tard.
  parent_id: string | null;
};

let categoriesEnCache: Categorie[] | null = null;
let categoriesUtiliseesEnCache: Categorie[] | null = null;

export async function chargerCategories(seulementUtilisees = false): Promise<Categorie[]> {
  if (seulementUtilisees) {
    if (categoriesUtiliseesEnCache) return categoriesUtiliseesEnCache;
    const data = (await appelerApi("/api/categories?seulement_utilisees=true")) as Categorie[];
    categoriesUtiliseesEnCache = data;
    return data;
  }
  if (categoriesEnCache) return categoriesEnCache;
  const data = (await appelerApi("/api/categories")) as Categorie[];
  categoriesEnCache = data;
  return data;
}

export function PopupCategories({
  ouvert,
  onFermer,
  onChoisir,
  categorieActuelleId,
  // Demande de Bourama (2026-07-15) : les catégories sans aucun agent ne
  // doivent PAS apparaître à l'accueil (pas de destination vide à
  // proposer aux visiteurs). Volontairement PAS activé par défaut : les
  // formulaires de création/modification, eux, doivent montrer la liste
  // complète -- un créateur doit pouvoir choisir une catégorie même s'il
  // en sera le premier agent.
  seulementUtilisees = false,
}: {
  ouvert: boolean;
  onFermer: () => void;
  onChoisir: (categorie: Categorie) => void;
  categorieActuelleId?: string | null;
  seulementUtilisees?: boolean;
}) {
  const [monte, setMonte] = useState(false);
  const [categories, setCategories] = useState<Categorie[] | null>(null);
  const [recherche, setRecherche] = useState("");
  const [pleinEcran, setPleinEcran] = useState(false);

  useEffect(() => setMonte(true), []);

  useEffect(() => {
    if (ouvert && !categories) {
      chargerCategories(seulementUtilisees)
        .then(setCategories)
        .catch(() => setCategories([]));
    }
  }, [ouvert, categories, seulementUtilisees]);

  useEffect(() => {
    if (!ouvert) {
      setRecherche("");
      setPleinEcran(false);
    }
  }, [ouvert]);

  // Groupé par première lettre, trié alphabétiquement (demande de
  // Bourama : "comme un répertoire" -- en-tête de lettre puis les
  // catégories qui commencent par elle, pas une simple liste à plat).
  const groupees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const filtrees = (categories ?? []).filter((c) => {
      if (!q) return true;
      // Recherche par MOT-CLÉ (pas juste le nom affiché) : voir
      // categories.mots_cles en base, un mot-clé peut faire remonter
      // une catégorie même si le mot tapé n'apparaît pas dans son nom.
      if (c.nom.toLowerCase().includes(q)) return true;
      return c.mots_cles.some((m) => m.toLowerCase().includes(q));
    });
    const triees = [...filtrees].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    const groupes = new Map<string, Categorie[]>();
    for (const c of triees) {
      const lettre = c.nom[0]?.toUpperCase() ?? "#";
      if (!groupes.has(lettre)) groupes.set(lettre, []);
      groupes.get(lettre)!.push(c);
    }
    return Array.from(groupes.entries());
  }, [categories, recherche]);

  if (!monte || !ouvert) return null;

  const contenuListe = (
    <>
      <div className="border-b border-dj-bordure p-3">
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par mot-clé..."
          autoFocus
          className="w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
        />
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        {categories === null && (
          <div className="space-y-1.5 px-3 py-3" aria-hidden>
            <Skeleton className="h-3 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" style={{ animationDelay: "120ms" }} />
            <Skeleton className="h-3 w-2/3 rounded" style={{ animationDelay: "240ms" }} />
          </div>
        )}
        {categories && groupees.length === 0 && (
          <p className="px-3 py-4 text-sm text-dj-texte-muet">Aucune catégorie ne correspond.</p>
        )}
        {groupees.map(([lettre, items]) => (
          <div key={lettre}>
            <div className="sticky top-0 bg-dj-surface px-3 py-1 text-xs font-bold text-dj-texte-muet">
              {lettre}
            </div>
            {items.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChoisir(c);
                  onFermer();
                }}
                className={`block w-full border-t border-dj-bordure px-3 py-2.5 text-left text-sm transition-colors hover:bg-dj-surface-haute ${
                  c.id === categorieActuelleId ? "text-dj-accent-1" : "text-dj-texte"
                }`}
              >
                {c.nom}
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );

  if (pleinEcran) {
    return (
      <PleinEcran ouvert titre="Catégories" onFermer={() => setPleinEcran(false)}>
        {contenuListe}
      </PleinEcran>
    );
  }

  // Portail direct (pas PleinEcran, format modal réduit ici) : même
  // raison que PleinEcran -- ce popup peut être ouvert depuis n'importe
  // où dans la page (formulaire, accueil), un portail vers document.body
  // l'affranchit de tout parent transformé/flouté.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onFermer}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-dj-bordure px-3 py-2">
          <span className="text-sm font-bold text-dj-texte">Catégories</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPleinEcran(true)}
              className="text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
            >
              Plein écran ⤢
            </button>
            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer"
              className="text-dj-texte-muet transition-colors hover:text-dj-texte"
            >
              ✕
            </button>
          </div>
        </div>
        {contenuListe}
      </div>
    </div>,
    document.body
  );
}

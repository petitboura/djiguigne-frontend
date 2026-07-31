"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { appelerApi } from "@/lib/api";
import { formaterDate } from "@/lib/formaterDate";
import { BoutonPartager } from "@/components/BoutonPartager";
import { messageErreur } from "@/lib/erreurs";

// Ajouté le 2026-07-15 (Bourama) : section "Mises à jour" sur la page
// publique d'un agent -- ce que le créateur a changé, avec date,
// like/commenter/partager. Contrat backend : api/agent_updates.py
// (GET public, POST/like/comments authentifiés). Même pattern
// like-toggle que NoteAgent.tsx et commentaires que
// CommentairesAgent.tsx, mais imbriqués par mise à jour plutôt que pour
// l'agent entier, donc pas de réutilisation directe possible -- second
// composant plutôt que de complexifier les deux existants avec un mode
// "scope=update".

type MiseAJour = {
  id: number;
  agent_id: string;
  titre: string;
  contenu: string;
  created_at?: string | null;
  total_likes: number;
  total_commentaires: number;
  jaime: boolean;
};

type CommentaireMaj = {
  id: number;
  update_id: number;
  user_id: string;
  nom_affiche: string | null;
  contenu: string;
  created_at?: string | null;
};

export function MisesAJourAgent({ agentId, nomAgent }: { agentId: string; nomAgent: string }) {
  const [maj, setMaj] = useState<MiseAJour[] | null>(null);
  const [connecte, setConnecte] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    appelerApi(`/api/agents/${agentId}/updates`)
      .then((r: MiseAJour[]) => setMaj(r))
      .catch(() => setMaj([]));
    supabase.auth.getSession().then(({ data: { session } }) => {
      setConnecte(!!session);
    });
  }, [agentId]);

  // Fix (Bourama, 2026-07-17 : "tu clique sur voir les mises à jour...
  // rien ou bug") : ce `id="mises-a-jour"` est la cible du lien
  // `/agent/{id}#mises-a-jour` (voir dashboard/page.tsx). Il DOIT être
  // présent dès le premier rendu, sinon le navigateur essaie de scroller
  // vers un élément qui n'existe pas encore (pendant le chargement) ou
  // qui n'existera jamais (agent sans mise à jour) -- d'où le "rien" :
  // aucune erreur, le lien fonctionne, juste aucune cible à atteindre.
  return (
    <div id="mises-a-jour" className="flex flex-col gap-4">
      {maj === null && <p className="text-sm text-dj-texte-muet">Chargement…</p>}
      {maj !== null && maj.length === 0 && (
        <p className="text-sm text-dj-texte-muet">Aucune mise à jour pour l&apos;instant.</p>
      )}
      {maj?.map((m) => (
        <ItemMiseAJour key={m.id} agentId={agentId} nomAgent={nomAgent} maj={m} connecte={connecte} />
      ))}
    </div>
  );
}

function ItemMiseAJour({
  agentId,
  nomAgent,
  maj,
  connecte,
}: {
  agentId: string;
  nomAgent: string;
  maj: MiseAJour;
  connecte: boolean | undefined;
}) {
  const [jaime, setJaime] = useState(maj.jaime);
  const [totalLikes, setTotalLikes] = useState(maj.total_likes);
  const [envoiLike, setEnvoiLike] = useState(false);

  const [commentairesOuverts, setCommentairesOuverts] = useState(false);
  const [commentaires, setCommentaires] = useState<CommentaireMaj[] | null>(null);
  const [brouillon, setBrouillon] = useState("");
  const [envoiCommentaire, setEnvoiCommentaire] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function chargerCommentaires() {
    appelerApi(`/api/agents/${agentId}/updates/${maj.id}/comments`)
      .then((r: CommentaireMaj[]) => setCommentaires(r))
      .catch(() => setCommentaires([]));
  }

  async function basculerLike() {
    if (!connecte) {
      setErreur("Connecte-toi pour aimer cette mise à jour.");
      return;
    }
    setEnvoiLike(true);
    setErreur(null);
    try {
      const r: { jaime: boolean; total_likes: number } = await appelerApi(
        `/api/agents/${agentId}/updates/${maj.id}/like`,
        { method: "POST" }
      );
      setJaime(r.jaime);
      setTotalLikes(r.total_likes);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoiLike(false);
    }
  }

  function ouvrirCommentaires() {
    const ouverture = !commentairesOuverts;
    setCommentairesOuverts(ouverture);
    if (ouverture && commentaires === null) chargerCommentaires();
  }

  async function envoyerCommentaire(e: React.FormEvent) {
    e.preventDefault();
    const contenu = brouillon.trim();
    if (!contenu) return;

    setEnvoiCommentaire(true);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agentId}/updates/${maj.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ contenu }),
      });
      setBrouillon("");
      chargerCommentaires();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoiCommentaire(false);
    }
  }

  return (
    <div id={`maj-${maj.id}`} className="rounded-2xl border border-dj-bordure bg-dj-surface p-5">
      <p className="text-xs text-dj-texte-muet">{formaterDate(maj.created_at)}</p>
      <h3 className="mt-1 font-display text-base font-bold text-dj-texte">{maj.titre}</h3>
      <p className="mt-1.5 whitespace-pre-wrap text-sm text-dj-texte-muet">{maj.contenu}</p>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={basculerLike}
          disabled={envoiLike}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
            jaime
              ? "border-dj-accent-1 text-dj-accent-1"
              : "border-dj-bordure text-dj-texte-muet hover:border-dj-bordure-forte"
          }`}
        >
          <span>{jaime ? "♥" : "♡"}</span>
          {totalLikes > 0 ? totalLikes : ""}
        </button>

        <button
          type="button"
          onClick={ouvrirCommentaires}
          className="rounded-full border border-dj-bordure px-3 py-1.5 text-sm text-dj-texte-muet transition-colors hover:border-dj-bordure-forte"
        >
          Commenter{maj.total_commentaires > 0 ? ` (${maj.total_commentaires})` : ""}
        </button>

        <BoutonPartager chemin={`/agent/${agentId}#maj-${maj.id}`} titre={`${nomAgent} — ${maj.titre}`} />
      </div>

      {erreur && <p className="mt-2 text-xs text-dj-accent-2">{erreur}</p>}

      {commentairesOuverts && (
        <div className="mt-4 flex flex-col gap-3 border-t border-dj-bordure pt-4">
          {connecte && (
            <form onSubmit={envoyerCommentaire} className="flex flex-col gap-2">
              <textarea
                value={brouillon}
                onChange={(e) => setBrouillon(e.target.value)}
                placeholder="Écrire un commentaire..."
                rows={2}
                className="rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte placeholder:text-dj-inactif focus:border-dj-bordure-forte focus:outline-none"
              />
              <button
                type="submit"
                disabled={envoiCommentaire || !brouillon.trim()}
                className="self-start rounded-full bg-dj-gradient px-4 py-2 text-xs font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Publier
              </button>
            </form>
          )}
          {connecte === false && (
            <p className="text-sm text-dj-texte-muet">Connecte-toi pour commenter.</p>
          )}

          {commentaires === null && <p className="text-sm text-dj-texte-muet">Chargement…</p>}
          {commentaires?.length === 0 && (
            <p className="text-sm text-dj-texte-muet">Aucun commentaire pour l'instant.</p>
          )}
          {commentaires?.map((c) => (
            <div key={c.id} className="rounded-xl border border-dj-bordure bg-dj-surface-haute px-4 py-3">
              <p className="text-xs text-dj-texte-muet">
                {c.nom_affiche || `Utilisateur ${c.user_id.slice(0, 8)}`}
              </p>
              <p className="mt-1 text-sm text-dj-texte">{c.contenu}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

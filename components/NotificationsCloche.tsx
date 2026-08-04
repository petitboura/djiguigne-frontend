"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { appelerApi } from "@/lib/api";
import { PleinEcran } from "@/components/PleinEcran";

// Demande de Bourama (2026-07-15) : "un icone notification juste à côté
// de mon espace et dès que tu clique, un pop up qui affiche les
// notifications puis un bouton plein écran". Consomme GET/PATCH
// /api/notifications (voir api/notifications.py) -- les lignes sont
// créées côté base par des triggers Postgres sur follows/agent_comments/
// agent_ratings, ce composant ne fait que lire et marquer comme lues.
// N'est rendu QUE si connecté (voir TopBar.tsx) : les notifications
// n'ont aucun sens pour un visiteur anonyme.

type NotificationItem = {
  id: number;
  type:
    | "follow"
    | "comment"
    | "rating"
    | "categorie_manquante"
    | "agent_update"
    | "feedback"
    | "message_direct"
    | "annonce_etablissement";
  lu: boolean;
  created_at: string | null;
  acteur_id: string;
  acteur_nom: string;
  acteur_avatar_url: string | null;
  agent_id: string | null;
  agent_nom: string | null;
  agent_icone: string | null;
  // Ajouté le 2026-07-21 : contenu réel du feedback (voir
  // api/notifications.py). acteur_nom reste volontairement vide pour ce
  // type -- jamais de nom d'utilisateur sur un retour.
  feedback_type: "positif" | "negatif" | null;
  feedback_commentaire: string | null;
  feedback_contexte: boolean;
  feedback_question: string | null;
  feedback_reponse: string | null;
  update_id: number | null;
  // Ajouté le 2026-08-04 pour "message_direct" (acteur_nom = expéditeur)
  // et "annonce_etablissement" (acteur_nom = établissement) -- voir
  // api/notifications.py.
  message_id: number | null;
  message_contenu: string | null;
  message_reponse_a: number | null;
  annonce_id: number | null;
  annonce_contenu: string | null;
};

type NotificationsReponse = {
  notifications: NotificationItem[];
  non_lues: number;
};

function tempsRelatif(iso: string | null) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  return `il y a ${jours} j`;
}

function IconeType({ type }: { type: NotificationItem["type"] }) {
  if (type === "follow") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="10" cy="8" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.5 20c1-3.7 3.7-5.5 7.5-5.5s6.5 1.8 7.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 8v6M16 11h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "comment") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          d="M4 5h16v11H8l-4 4V5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (type === "categorie_manquante") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h8l8 8-8 8-8-8V4Z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === "agent_update") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v10M12 3l4 4M12 3 8 7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "feedback") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm0 0 4-8a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.2l-1.2 7A2 2 0 0 1 17 20H7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "message_direct") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18v12H3V6Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m3 6 9 7 9-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "annonce_etablissement") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 10v4h3l5 4V6L6 10H3Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6-5.3-2.8L6.7 20.1l1-6L3.4 9.9l6-.9L12 3.5Z" />
    </svg>
  );
}

function texteNotification(n: NotificationItem) {
  const nom = n.acteur_nom || "Quelqu'un";
  if (n.type === "follow") return `${nom} te suit maintenant.`;
  if (n.type === "comment") return `${nom} a commenté ${n.agent_nom ?? "ton IA"}.`;
  if (n.type === "categorie_manquante")
    return `Choisis une catégorie pour ${n.agent_nom ?? "ton IA"}.`;
  if (n.type === "agent_update") return `${nom} a publié une mise à jour sur ${n.agent_nom ?? "une IA"}.`;
  if (n.type === "message_direct") return `${nom} t'a envoyé un message.`;
  if (n.type === "annonce_etablissement") return `${nom} a publié une annonce.`;
  if (n.type === "feedback") {
    // 6 variantes (2026-07-21, demande de Bourama) : jamais de nom
    // d'utilisateur ici, contrairement aux autres types de notification.
    const emoji = n.feedback_type === "negatif" ? "👎" : "👍";
    const libelle = n.feedback_type === "negatif" ? "Retour négatif" : "Retour positif";
    const agent = n.agent_nom ?? "ton IA";
    if (n.feedback_contexte) return `${emoji} ${libelle} avec contexte partagé sur ${agent}.`;
    if (n.feedback_commentaire) return `${emoji} ${libelle} avec commentaire sur ${agent}.`;
    return `${emoji} ${libelle} sur ${agent}.`;
  }
  return `${nom} a noté ${n.agent_nom ?? "ton IA"}.`;
}

function feedbackADesDetails(n: NotificationItem) {
  return n.type === "feedback" && Boolean(n.feedback_commentaire || n.feedback_contexte);
}

// message_direct/annonce_etablissement (2026-08-04) : toujours un détail
// à ouvrir -- le contenu ne tient pas dans la ligne de liste, et
// message_direct permet en plus une réponse rapide (voir PopupDetailMessage).
function messageADesDetails(n: NotificationItem) {
  return n.type === "message_direct";
}

function annonceADesDetails(n: NotificationItem) {
  return n.type === "annonce_etablissement";
}

function lienNotification(n: NotificationItem) {
  if (n.type === "follow") return `/u/${n.acteur_id}`;
  if (n.type === "categorie_manquante" && n.agent_id) return `/dashboard/agents/${n.agent_id}/modifier`;
  if (n.type === "agent_update" && n.agent_id) {
    return n.update_id ? `/agent/${n.agent_id}#maj-${n.update_id}` : `/agent/${n.agent_id}#mises-a-jour`;
  }
  // Feedback AVEC commentaire ou contexte : pas de lien direct, ouvre un
  // détail au clic à la place (voir onDetailFeedback dans LigneNotification).
  // Feedback SANS rien à montrer : comportement inchangé, mène sur la
  // page publique de l'IA comme avant.
  if (n.type === "feedback" && feedbackADesDetails(n)) return null;
  if (n.agent_id) return `/agent/${n.agent_id}`;
  return null;
}

function LigneNotification({
  n,
  onOuvrir,
  onDetailFeedback,
  onDetailMessage,
  onDetailAnnonce,
}: {
  n: NotificationItem;
  onOuvrir: (n: NotificationItem) => void;
  onDetailFeedback: (n: NotificationItem) => void;
  onDetailMessage: (n: NotificationItem) => void;
  onDetailAnnonce: (n: NotificationItem) => void;
}) {
  const lien = lienNotification(n);
  const contenu = (
    <div
      className={`flex items-start gap-3 px-3 py-3 transition-colors hover:bg-dj-surface-haute ${
        n.lu ? "" : "bg-dj-surface-haute/60"
      }`}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dj-bordure text-dj-texte-muet">
        <IconeType type={n.type} />
      </span>
      <div className="flex-1">
        <p className="text-sm text-dj-texte">{texteNotification(n)}</p>
        <p className="mt-0.5 text-xs text-dj-texte-muet">{tempsRelatif(n.created_at)}</p>
      </div>
      {!n.lu && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-dj-accent-1" />}
    </div>
  );

  if (lien) {
    return (
      <Link href={lien} onClick={() => onOuvrir(n)} className="block">
        {contenu}
      </Link>
    );
  }

  if (feedbackADesDetails(n)) {
    return (
      <button
        type="button"
        onClick={() => {
          onOuvrir(n);
          onDetailFeedback(n);
        }}
        className="block w-full text-left"
      >
        {contenu}
      </button>
    );
  }

  if (messageADesDetails(n)) {
    return (
      <button
        type="button"
        onClick={() => {
          onOuvrir(n);
          onDetailMessage(n);
        }}
        className="block w-full text-left"
      >
        {contenu}
      </button>
    );
  }

  if (annonceADesDetails(n)) {
    return (
      <button
        type="button"
        onClick={() => {
          onOuvrir(n);
          onDetailAnnonce(n);
        }}
        className="block w-full text-left"
      >
        {contenu}
      </button>
    );
  }

  return (
    <button type="button" onClick={() => onOuvrir(n)} className="block w-full text-left">
      {contenu}
    </button>
  );
}

export function NotificationsCloche() {
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null);
  const [nonLues, setNonLues] = useState(0);
  const [ouverte, setOuverte] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);
  // Détail d'un feedback (2026-07-21) : ouvert par LigneNotification quand
  // la notification a un commentaire et/ou un contexte à montrer.
  const [detailFeedback, setDetailFeedback] = useState<NotificationItem | null>(null);
  // Détail d'un message direct / d'une annonce établissement (2026-08-04,
  // tâche B) : même principe que detailFeedback ci-dessus.
  const [detailMessage, setDetailMessage] = useState<NotificationItem | null>(null);
  const [detailAnnonce, setDetailAnnonce] = useState<NotificationItem | null>(null);

  function charger() {
    appelerApi("/api/notifications?limite=20")
      .then((r: NotificationsReponse) => {
        setNotifications(r.notifications);
        setNonLues(r.non_lues);
      })
      .catch(() => setNotifications([]));
  }

  useEffect(() => {
    charger();
    // Rafraîchi toutes les 60s : suffisant pour un badge de compteur,
    // pas besoin de websocket/temps réel pour ce cas d'usage.
    const intervalle = setInterval(charger, 60000);
    return () => clearInterval(intervalle);
  }, []);

  async function marquerLue(n: NotificationItem) {
    if (n.lu) return;
    setNotifications((prev) =>
      (prev ?? []).map((x) => (x.id === n.id ? { ...x, lu: true } : x))
    );
    setNonLues((v) => Math.max(0, v - 1));
    try {
      await appelerApi(`/api/notifications/${n.id}`, { method: "PATCH" });
    } catch {
      // best-effort : le badge se resynchronisera au prochain rafraîchi
      // automatique (60s) même si ce PATCH échoue.
    }
  }

  async function toutMarquerLu() {
    setNotifications((prev) => (prev ?? []).map((x) => ({ ...x, lu: true })));
    setNonLues(0);
    try {
      await appelerApi("/api/notifications/tout-lire", { method: "POST" });
    } catch {
      // best-effort, même raisonnement que marquerLue.
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOuverte((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface text-dj-texte transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {nonLues > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-dj-accent-1 px-1 text-[10px] font-bold text-[#1A0D02]">
            {nonLues > 9 ? "9+" : nonLues}
          </span>
        )}
      </button>

      {ouverte && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOuverte(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-dj-bordure bg-dj-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-dj-bordure px-3 py-2">
              <span className="text-sm font-bold text-dj-texte">Notifications</span>
              {nonLues > 0 && (
                <button
                  type="button"
                  onClick={toutMarquerLu}
                  className="text-xs text-dj-accent-1 transition-colors hover:text-dj-accent-2"
                >
                  Tout marquer lu
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications === null && (
                <p className="px-3 py-4 text-sm text-dj-texte-muet">Chargement...</p>
              )}
              {notifications?.length === 0 && (
                <p className="px-3 py-4 text-sm text-dj-texte-muet">
                  Aucune notification pour l&apos;instant.
                </p>
              )}
              {notifications?.map((n, i) => (
                <div key={n.id} className={i > 0 ? "border-t border-dj-bordure" : ""}>
                  <LigneNotification n={n} onOuvrir={marquerLue} onDetailFeedback={setDetailFeedback} onDetailMessage={setDetailMessage} onDetailAnnonce={setDetailAnnonce} />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setPleinEcran(true);
                setOuverte(false);
              }}
              className="block w-full border-t border-dj-bordure px-3 py-2 text-center text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
            >
              Voir en plein écran ⤢
            </button>
          </div>
        </>
      )}

      <PleinEcran
        ouvert={pleinEcran}
        onFermer={() => setPleinEcran(false)}
        titre="Notifications"
        actions={
          nonLues > 0 ? (
            <button
              type="button"
              onClick={toutMarquerLu}
              className="text-xs text-dj-accent-1 transition-colors hover:text-dj-accent-2"
            >
              Tout marquer lu
            </button>
          ) : undefined
        }
      >
        {notifications?.length === 0 && (
          <p className="px-3 py-4 text-sm text-dj-texte-muet">
            Aucune notification pour l&apos;instant.
          </p>
        )}
        {notifications?.map((n, i) => (
          <div key={n.id} className={i > 0 ? "border-t border-dj-bordure" : ""}>
            <LigneNotification n={n} onOuvrir={marquerLue} onDetailFeedback={setDetailFeedback} onDetailMessage={setDetailMessage} onDetailAnnonce={setDetailAnnonce} />
          </div>
        ))}
      </PleinEcran>

      {detailFeedback && <PopupDetailFeedback n={detailFeedback} onFermer={() => setDetailFeedback(null)} />}
      {detailMessage && (
        <PopupDetailMessage
          n={detailMessage}
          onFermer={() => setDetailMessage(null)}
          onReponseEnvoyee={charger}
        />
      )}
      {detailAnnonce && <PopupDetailAnnonce n={detailAnnonce} onFermer={() => setDetailAnnonce(null)} />}
    </div>
  );
}

function PopupDetailFeedback({ n, onFermer }: { n: NotificationItem; onFermer: () => void }) {
  const negatif = n.feedback_type === "negatif";
  return (
    // Réutilise PleinEcran (portail vers document.body + z-[100]) au lieu
    // d'un modal maison -- corrige 2 bugs signalés le 2026-07-21 :
    // (1) sans portail, un `position: fixed` piégé dans un parent avec
    // transform/overflow-hidden s'affichait coupé en haut d'écran ;
    // (2) mon z-[60]/[70] précédent était SOUS le z-[100] de la vue
    // plein écran des notifications -- invisible quand ouvert par-dessus.
    <PleinEcran
      ouvert
      onFermer={onFermer}
      titre={`${negatif ? "👎 Retour négatif" : "👍 Retour positif"} sur ${n.agent_nom ?? "ton IA"}`}
      actions={
        n.agent_id ? (
          <>
            <Link
              href={`/dashboard/agents/${n.agent_id}/modifier`}
              onClick={onFermer}
              className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
            >
              Modifier {n.agent_nom ?? "l'IA"}
            </Link>
            <Link
              href={`/agent/${n.agent_id}/chat`}
              onClick={onFermer}
              className="rounded-full bg-dj-gradient px-4 py-2 text-sm font-semibold text-[#1A0D02]"
            >
              Ouvrir {n.agent_nom ?? "l'IA"}
            </Link>
          </>
        ) : undefined
      }
    >
      <div className="space-y-3 p-4">
        {n.feedback_commentaire && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-dj-texte-muet">Commentaire</p>
            <p className="rounded-lg bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte">
              {n.feedback_commentaire}
            </p>
          </div>
        )}

        {/* Contexte partagé : jamais de nom d'utilisateur, uniquement le
            contenu de l'échange concerné -- voir feedback_question et
            feedback_reponse, remplis côté backend UNIQUEMENT quand
            l'étudiant a explicitement coché le partage. */}
        {n.feedback_question && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-dj-texte-muet">
              Question posée
            </p>
            <p className="rounded-lg bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte">
              {n.feedback_question}
            </p>
          </div>
        )}

        {n.feedback_reponse && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-dj-texte-muet">
              Réponse de l&apos;IA
            </p>
            <p className="rounded-lg bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte">
              {n.feedback_reponse}
            </p>
          </div>
        )}

        {!n.feedback_commentaire && !n.feedback_question && !n.feedback_reponse && (
          <p className="text-sm text-dj-texte-muet">Aucun détail supplémentaire pour ce retour.</p>
        )}
      </div>
    </PleinEcran>
  );
}

// message_direct (2026-08-04, tâche B) : contenu du message + réponse
// rapide -- POST /api/roles/messages avec reponse_a=n.message_id vers
// n.acteur_id (l'expéditeur original devient le destinataire de la
// réponse). onReponseEnvoyee recharge la liste pour refléter l'échange.
function PopupDetailMessage({
  n,
  onFermer,
  onReponseEnvoyee,
}: {
  n: NotificationItem;
  onFermer: () => void;
  onReponseEnvoyee: () => void;
}) {
  const [reponse, setReponse] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyerReponse() {
    if (!reponse.trim()) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      await appelerApi("/api/roles/messages", {
        method: "POST",
        body: JSON.stringify({
          destinataire_id: n.acteur_id,
          contenu: reponse.trim(),
          reponse_a: n.message_id,
        }),
      });
      setEnvoye(true);
      setReponse("");
      onReponseEnvoyee();
    } catch {
      setErreur("Impossible d'envoyer la réponse. Réessaie.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <PleinEcran ouvert onFermer={onFermer} titre={`Message de ${n.acteur_nom || "quelqu'un"}`}>
      <div className="space-y-3 p-4">
        <p className="rounded-lg bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte">
          {n.message_contenu}
        </p>

        <div>
          <textarea
            value={reponse}
            onChange={(e) => setReponse(e.target.value)}
            placeholder="Répondre..."
            rows={3}
            className="w-full rounded-lg border border-dj-bordure bg-dj-surface px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte"
          />
          {erreur && <p className="mt-1 text-xs text-red-500">{erreur}</p>}
          {envoye && <p className="mt-1 text-xs text-dj-texte-muet">Réponse envoyée.</p>}
          <button
            type="button"
            onClick={envoyerReponse}
            disabled={envoiEnCours || !reponse.trim()}
            className="mt-2 rounded-full bg-dj-gradient px-4 py-2 text-sm font-semibold text-[#1A0D02] disabled:opacity-50"
          >
            {envoiEnCours ? "Envoi..." : "Répondre"}
          </button>
        </div>
      </div>
    </PleinEcran>
  );
}

// annonce_etablissement (2026-08-04, tâche B) : lecture seule, diffusée
// par l'établissement à tous ses rattachés -- pas de réponse rapide ici
// (contrairement à message_direct), voir migration 2026_08_04.
function PopupDetailAnnonce({ n, onFermer }: { n: NotificationItem; onFermer: () => void }) {
  return (
    <PleinEcran ouvert onFermer={onFermer} titre={`Annonce de ${n.acteur_nom || "ton établissement"}`}>
      <div className="p-4">
        <p className="rounded-lg bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte">
          {n.annonce_contenu}
        </p>
      </div>
    </PleinEcran>
  );
}

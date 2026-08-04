"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { appelerApi } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";

/**
 * Page "Mon équipe" (2026-08-04, demande Bourama, hiérarchie de rôles).
 *
 * Volontairement PAS dans la nav (TopBar) : Bourama a précisé que cette
 * fonctionnalité reste sans mise en avant visuelle pour l'instant, juste
 * fonctionnelle et connectée dans l'app. Accès direct par l'URL.
 *
 * Réutilise tel quel l'existant plutôt que de dupliquer une UI de
 * gestion d'agent : "Modifier" et "Tester" pointent vers les pages
 * /dashboard/agents/[id]/modifier et /agent/[id]/chat déjà en place --
 * seuls les DROITS ont changé côté backend (api/permissions_hierarchie.py),
 * pas ces pages elles-mêmes.
 *
 * MISE À JOUR 2026-08-04 (tâche C) : la messagerie était câblée en dur sur
 * établissement<->enseignant (destinataireParDefaut) et la page était
 * fermée aux étudiants, alors que api/roles.py autorise déjà bien plus de
 * cas (enseignant<->étudiant, étudiant<->étudiant, étudiant<->
 * établissement -- voir _peut_echanger_messages côté backend). On utilise
 * maintenant /api/roles/mes-contacts (nouveau, tous rôles) à la place de
 * /api/roles/mon-equipe (qui restait 403 pour un étudiant et ne couvrait
 * pas les contacts "vers le haut"). Chaque contact a un bouton "Écrire"
 * qui ouvre la conversation avec cette personne (décision Bourama :
 * pas de sélecteur générique).
 */

type MonRole = {
  role: "etablissement" | "enseignant" | "etudiant" | null;
  etablissement_id: string | null;
  enseignant_id: string | null;
  agent_id: string | null;
};

type Contact = {
  user_id: string;
  nom_affiche: string;
  role: "etablissement" | "enseignant" | "etudiant";
  agent_id: string | null;
};

type MessageDirect = {
  id: number;
  expediteur_id: string;
  expediteur_nom: string;
  destinataire_id: string;
  contenu: string;
  reponse_a: number | null;
  lu: boolean;
  created_at: string;
};

const LIBELLE_ROLE: Record<Contact["role"], string> = {
  etablissement: "établissement",
  enseignant: "enseignant",
  etudiant: "étudiant",
};

// Une IA n'est gérable (Modifier/Tester) que dans le sens hiérarchique
// descendant -- établissement sur ses enseignants, enseignant sur ses
// étudiants (même règle que api/permissions_hierarchie.py côté backend).
// Les autres contacts (vers le haut, ou entre pairs) n'ont que "Écrire".
function peutGererIA(monRole: Contact["role"] | null | undefined, roleContact: Contact["role"]): boolean {
  if (monRole === "etablissement" && roleContact === "enseignant") return true;
  if (monRole === "enseignant" && roleContact === "etudiant") return true;
  return false;
}

export default function PageEquipe() {
  const [monRole, setMonRole] = useState<MonRole | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<MessageDirect[]>([]);
  const [contactActif, setContactActif] = useState<Contact | null>(null);
  const [nouveauMessage, setNouveauMessage] = useState("");
  const [annonce, setAnnonce] = useState("");
  const [chargement, setChargement] = useState(true);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    appelerApi("/api/roles/moi")
      .then(async (r: MonRole) => {
        setMonRole(r);
        if (r.role) {
          const [cs, msgs] = await Promise.all([
            appelerApi("/api/roles/mes-contacts"),
            appelerApi("/api/roles/messages"),
          ]);
          setContacts(cs ?? []);
          setMessages(msgs ?? []);
        }
      })
      .catch((e) => setErreur(messageErreur(e)))
      .finally(() => setChargement(false));
  }, []);

  async function envoyerMessage() {
    if (!contactActif || !nouveauMessage.trim() || envoiEnCours) return;
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      const cree = await appelerApi("/api/roles/messages", {
        method: "POST",
        body: JSON.stringify({ destinataire_id: contactActif.user_id, contenu: nouveauMessage.trim() }),
      });
      setMessages((m) => [cree, ...m]);
      setNouveauMessage("");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function envoyerAnnonce() {
    if (!annonce.trim()) return;
    setErreur(null);
    setConfirmation(null);
    try {
      await appelerApi("/api/roles/annonce", {
        method: "POST",
        body: JSON.stringify({ contenu: annonce.trim() }),
      });
      setAnnonce("");
      setConfirmation("Annonce envoyée à toute ton équipe.");
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  // Conversation avec `contactActif` : les deux sens confondus, du plus
  // ancien au plus récent (les autres messages restent chargés en mémoire
  // pour un changement de contact instantané, sans refaire d'appel réseau).
  const messagesConversation = contactActif
    ? messages
        .filter(
          (m) => m.expediteur_id === contactActif.user_id || m.destinataire_id === contactActif.user_id
        )
        .slice()
        .reverse()
    : [];

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="mb-5 flex gap-2">
          <BoutonRetour />
          <BoutonAccueil />
        </div>
        <h1 className="font-display text-xl font-bold text-dj-texte">Mon équipe</h1>

        {chargement && (
          <div className="mt-6 space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg border border-dj-bordure bg-dj-surface-haute"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        )}

        {!chargement && (!monRole || !monRole.role) && (
          <p className="mt-4 animate-dj-fade-in-rapide text-sm text-dj-texte-muet">
            Cette page est réservée aux comptes reliés à une hiérarchie (établissement, enseignant, étudiant).
          </p>
        )}

        {erreur && <p className="mt-4 animate-dj-fade-in-rapide text-sm text-[#F87171]">{erreur}</p>}

        {!chargement && monRole?.role && (
          <div className="animate-dj-fade-in-rapide">
            {!contactActif && (
              <>
                <section className="mt-6 rounded-2xl border border-dj-bordure bg-dj-surface p-5">
                  <h2 className="font-display text-base font-semibold text-dj-texte">Mes contacts</h2>
                  {contacts.length === 0 && (
                    <p className="mt-2 text-sm text-dj-texte-muet">Aucun contact pour l'instant.</p>
                  )}
                  <ul className="mt-3 space-y-2">
                    {contacts.map((c) => (
                      <li
                        key={c.user_id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-dj-texte">{c.nom_affiche}</span>
                          <span className="text-xs text-dj-texte-muet">{LIBELLE_ROLE[c.role]}</span>
                        </span>
                        <span className="flex shrink-0 gap-2">
                          <button
                            onClick={() => setContactActif(c)}
                            className="rounded-full border border-dj-bordure px-3 py-1 text-xs font-medium text-dj-texte-muet transition-colors hover:text-dj-texte"
                          >
                            Écrire
                          </button>
                          {peutGererIA(monRole?.role, c.role) && c.agent_id && (
                            <>
                              <Link
                                href={`/agent/${c.agent_id}/chat`}
                                className="rounded-full border border-dj-bordure px-3 py-1 text-xs font-medium text-dj-texte-muet transition-colors hover:text-dj-texte"
                              >
                                Tester
                              </Link>
                              <Link
                                href={`/dashboard/agents/${c.agent_id}/modifier`}
                                className="rounded-full bg-dj-gradient px-3 py-1 text-xs font-bold text-[#1A0D02]"
                              >
                                Modifier
                              </Link>
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                {monRole?.role === "etablissement" && (
                  <section className="mt-4 rounded-2xl border border-dj-bordure bg-dj-surface p-5">
                    <h2 className="font-display text-base font-semibold text-dj-texte">
                      Annonce à toute l'équipe
                    </h2>
                    <p className="mt-1 text-xs text-dj-texte-muet">
                      Reçue par tes enseignants et leurs étudiants.
                    </p>
                    <textarea
                      value={annonce}
                      onChange={(e) => setAnnonce(e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
                      placeholder="Écrire une annonce..."
                    />
                    {confirmation && (
                      <p className="mt-2 animate-dj-fade-in-rapide text-sm text-dj-accent-1">{confirmation}</p>
                    )}
                    <button
                      onClick={envoyerAnnonce}
                      disabled={!annonce.trim()}
                      className="mt-2 rounded-full bg-dj-gradient px-4 py-1.5 text-sm font-bold text-[#1A0D02] transition-opacity disabled:opacity-50"
                    >
                      Envoyer l'annonce
                    </button>
                  </section>
                )}
              </>
            )}

            {contactActif && (
              <section className="mt-6 animate-dj-fade-in-rapide rounded-2xl border border-dj-bordure bg-dj-surface p-5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setContactActif(null)}
                    className="rounded-full border border-dj-bordure px-3 py-1 text-xs font-medium text-dj-texte-muet transition-colors hover:text-dj-texte"
                  >
                    ← Retour
                  </button>
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-base font-semibold text-dj-texte">
                      {contactActif.nom_affiche}
                    </h2>
                    <p className="text-xs text-dj-texte-muet">{LIBELLE_ROLE[contactActif.role]}</p>
                  </div>
                </div>

                <ul className="mt-4 space-y-2">
                  {messagesConversation.map((m) => {
                    const envoyeParMoi = m.expediteur_id !== contactActif.user_id;
                    return (
                      <li
                        key={m.id}
                        className={
                          "max-w-[85%] rounded-lg border border-dj-bordure px-3 py-2 " +
                          (envoyeParMoi ? "ml-auto bg-dj-gradient text-[#1A0D02]" : "bg-dj-surface-haute text-dj-texte")
                        }
                      >
                        <p className="text-sm">{m.contenu}</p>
                      </li>
                    );
                  })}
                  {messagesConversation.length === 0 && (
                    <p className="text-sm text-dj-texte-muet">Aucun message avec {contactActif.nom_affiche} pour l'instant.</p>
                  )}
                </ul>

                <div className="mt-4 flex gap-2">
                  <input
                    value={nouveauMessage}
                    onChange={(e) => setNouveauMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && envoyerMessage()}
                    placeholder="Écrire un message..."
                    className="flex-1 rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
                  />
                  <button
                    onClick={envoyerMessage}
                    disabled={!nouveauMessage.trim() || envoiEnCours}
                    className="rounded-full bg-dj-gradient px-4 py-1.5 text-sm font-bold text-[#1A0D02] transition-opacity disabled:opacity-50"
                  >
                    Envoyer
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </>
  );
}

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
 */

type MonRole = {
  role: "etablissement" | "enseignant" | "etudiant" | null;
  etablissement_id: string | null;
  enseignant_id: string | null;
  agent_id: string | null;
};

type MembreEquipe = { user_id: string; nom_affiche: string; agent_id: string | null };

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

export default function PageEquipe() {
  const [monRole, setMonRole] = useState<MonRole | null>(null);
  const [equipe, setEquipe] = useState<MembreEquipe[]>([]);
  const [messages, setMessages] = useState<MessageDirect[]>([]);
  const [nouveauMessage, setNouveauMessage] = useState("");
  const [annonce, setAnnonce] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    appelerApi("/api/roles/moi")
      .then(async (r: MonRole) => {
        setMonRole(r);
        if (r.role === "enseignant" || r.role === "etablissement") {
          const [eq, msgs] = await Promise.all([
            appelerApi("/api/roles/mon-equipe"),
            appelerApi("/api/roles/messages"),
          ]);
          setEquipe(eq ?? []);
          setMessages(msgs ?? []);
        }
      })
      .catch((e) => setErreur(messageErreur(e)))
      .finally(() => setChargement(false));
  }, []);

  // Établissement <-> enseignant uniquement (décision Bourama : notification
  // avec réponse simple, pas un vrai chat) : le destinataire, c'est
  // l'établissement pour un enseignant, ou -- pour un établissement -- le
  // dernier expéditeur qui lui a écrit (pas de sélecteur de destinataire,
  // pensé pour "répondre" plutôt qu'"initier vers n'importe qui").
  function destinataireParDefaut(): string | null {
    if (monRole?.role === "enseignant") return monRole.etablissement_id;
    if (monRole?.role === "etablissement") return messages[0]?.expediteur_id ?? null;
    return null;
  }

  async function envoyerMessage() {
    const destinataire_id = destinataireParDefaut();
    if (!destinataire_id || !nouveauMessage.trim()) return;
    setErreur(null);
    try {
      const cree = await appelerApi("/api/roles/messages", {
        method: "POST",
        body: JSON.stringify({ destinataire_id, contenu: nouveauMessage.trim() }),
      });
      setMessages((m) => [cree, ...m]);
      setNouveauMessage("");
    } catch (e) {
      setErreur(messageErreur(e));
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

  const libelleEquipe = monRole?.role === "enseignant" ? "Mes étudiants" : "Mes enseignants";

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="mb-5 flex gap-2">
          <BoutonRetour />
          <BoutonAccueil />
        </div>
        <h1 className="font-display text-xl font-bold text-dj-texte">Mon équipe</h1>

        {chargement && <p className="mt-4 text-sm text-dj-texte-muet">Chargement…</p>}

        {!chargement && (!monRole || !monRole.role) && (
          <p className="mt-4 text-sm text-dj-texte-muet">
            Cette page est réservée aux comptes établissement ou enseignant.
          </p>
        )}

        {!chargement && monRole?.role === "etudiant" && (
          <p className="mt-4 text-sm text-dj-texte-muet">
            Cette page est réservée aux comptes établissement ou enseignant.
          </p>
        )}

        {erreur && <p className="mt-4 text-sm text-[#F87171]">{erreur}</p>}

        {(monRole?.role === "enseignant" || monRole?.role === "etablissement") && (
          <>
            <section className="mt-6 rounded-2xl border border-dj-bordure bg-dj-surface p-5">
              <h2 className="font-display text-base font-semibold text-dj-texte">
                {libelleEquipe}
              </h2>
              {equipe.length === 0 && (
                <p className="mt-2 text-sm text-dj-texte-muet">Personne rattaché pour l'instant.</p>
              )}
              <ul className="mt-3 space-y-2">
                {equipe.map((m) => (
                  <li
                    key={m.user_id}
                    className="flex items-center justify-between rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2"
                  >
                    <span className="text-sm text-dj-texte">{m.nom_affiche}</span>
                    {m.agent_id ? (
                      <span className="flex gap-2">
                        <Link
                          href={`/agent/${m.agent_id}/chat`}
                          className="rounded-full border border-dj-bordure px-3 py-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte"
                        >
                          Tester
                        </Link>
                        <Link
                          href={`/dashboard/agents/${m.agent_id}/modifier`}
                          className="rounded-full bg-dj-gradient px-3 py-1 text-xs font-bold text-[#1A0D02]"
                        >
                          Modifier
                        </Link>
                      </span>
                    ) : (
                      <span className="text-xs text-dj-texte-muet">Pas encore d'IA</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {monRole.role === "etablissement" && (
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
                {confirmation && <p className="mt-2 text-sm text-dj-accent-1">{confirmation}</p>}
                <button
                  onClick={envoyerAnnonce}
                  disabled={!annonce.trim()}
                  className="mt-2 rounded-full bg-dj-gradient px-4 py-1.5 text-sm font-bold text-[#1A0D02] disabled:opacity-50"
                >
                  Envoyer l'annonce
                </button>
              </section>
            )}

            <section className="mt-4 rounded-2xl border border-dj-bordure bg-dj-surface p-5">
              <h2 className="font-display text-base font-semibold text-dj-texte">
                Messages {monRole.role === "enseignant" ? "avec l'établissement" : ""}
              </h2>
              <div className="mt-2 flex gap-2">
                <input
                  value={nouveauMessage}
                  onChange={(e) => setNouveauMessage(e.target.value)}
                  placeholder="Écrire un message..."
                  className="flex-1 rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
                />
                <button
                  onClick={envoyerMessage}
                  disabled={!nouveauMessage.trim() || !destinataireParDefaut()}
                  className="rounded-full bg-dj-gradient px-4 py-1.5 text-sm font-bold text-[#1A0D02] disabled:opacity-50"
                >
                  Envoyer
                </button>
              </div>

              <ul className="mt-4 space-y-2">
                {messages.map((m) => (
                  <li key={m.id} className="rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2">
                    <p className="text-xs text-dj-texte-muet">{m.expediteur_nom}</p>
                    <p className="text-sm text-dj-texte">{m.contenu}</p>
                  </li>
                ))}
                {messages.length === 0 && (
                  <p className="text-sm text-dj-texte-muet">Aucun message pour l'instant.</p>
                )}
              </ul>
            </section>
          </>
        )}
      </main>
    </>
  );
}

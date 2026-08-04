"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { appelerApi, diffuserDocumentEtablissement } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";

/**
 * Espace par rôle (2026-08-05, tâche F) -- atterrissage dédié pour un
 * établissement/enseignant/étudiant après connexion/inscription, à la
 * place du portfolio créateur (/dashboard). Remplace /dashboard/equipe
 * (renommée) : même contenu, désormais sous deux onglets au lieu d'un
 * mur unique, et reliée depuis TopBar.tsx ("Mon espace" devient sensible
 * au rôle) plutôt qu'accessible seulement par URL directe.
 *
 * Onglet "Mon IA" (nouveau) : accès direct au chat de sa propre IA
 * (agent_id vient de /api/roles/moi, déjà attribué à la création du
 * compte -- voir _creer_agent_minimal côté backend).
 *
 * Onglet "Contacts" : contenu de l'ex-page équipe tel quel (tâche C --
 * messagerie fusionnée avec /api/roles/mes-contacts, tous rôles --
 * + tâche D pour un établissement -- annonce + diffusion de documents
 * en masse). "Modifier"/"Tester" pointent vers les pages
 * /dashboard/agents/[id]/modifier et /agent/[id]/chat déjà en place --
 * seuls les DROITS ont changé côté backend (api/permissions_hierarchie.py).
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

export default function PageEspaceRole() {
  const [onglet, setOnglet] = useState<"ia" | "contacts">("ia");
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

  // Diffusion de documents (2026-08-05, partie D) : établissement -> tous
  // ses enseignants + tous les étudiants de ces enseignants, en un seul
  // envoi (voir POST /api/roles/documents/diffuser côté backend).
  const [fichierDiffusion, setFichierDiffusion] = useState<File | null>(null);
  const [descriptionDiffusion, setDescriptionDiffusion] = useState("");
  const [diffusionEnCours, setDiffusionEnCours] = useState(false);
  const [resultatDiffusion, setResultatDiffusion] = useState<{
    diffuse_a: number;
    total_cibles: number;
    echecs: string[];
  } | null>(null);

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

  async function diffuserDocument() {
    if (!fichierDiffusion || !descriptionDiffusion.trim()) return;
    setErreur(null);
    setResultatDiffusion(null);
    setDiffusionEnCours(true);
    try {
      const resultat = await diffuserDocumentEtablissement(fichierDiffusion, descriptionDiffusion.trim());
      setResultatDiffusion(resultat);
      setFichierDiffusion(null);
      setDescriptionDiffusion("");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setDiffusionEnCours(false);
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
        <h1 className="font-display text-xl font-bold text-dj-texte">Mon espace</h1>

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
            <div className="mt-6 grid grid-cols-2 gap-2 rounded-full border border-dj-bordure bg-dj-surface-haute p-1">
              <button
                type="button"
                onClick={() => setOnglet("ia")}
                className={`rounded-full py-1.5 text-sm font-medium transition-colors ${
                  onglet === "ia" ? "bg-dj-gradient text-[#1A0D02]" : "text-dj-texte-muet hover:text-dj-texte"
                }`}
              >
                Mon IA
              </button>
              <button
                type="button"
                onClick={() => setOnglet("contacts")}
                className={`rounded-full py-1.5 text-sm font-medium transition-colors ${
                  onglet === "contacts" ? "bg-dj-gradient text-[#1A0D02]" : "text-dj-texte-muet hover:text-dj-texte"
                }`}
              >
                Contacts
              </button>
            </div>

            {onglet === "ia" && (
              <section className="mt-4 animate-dj-fade-in-rapide rounded-2xl border border-dj-bordure bg-dj-surface p-5 text-center">
                <h2 className="font-display text-base font-semibold text-dj-texte">Mon IA</h2>
                {monRole.agent_id ? (
                  <Link
                    href={`/agent/${monRole.agent_id}/chat`}
                    className="mt-4 inline-block rounded-full bg-dj-gradient px-5 py-2.5 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5"
                  >
                    Discuter avec mon IA
                  </Link>
                ) : (
                  <p className="mt-2 text-sm text-dj-texte-muet">Pas encore d'IA associée à ce compte.</p>
                )}
              </section>
            )}

            {onglet === "contacts" && !contactActif && (
              <>
                <section className="mt-4 rounded-2xl border border-dj-bordure bg-dj-surface p-5">
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

                {monRole?.role === "etablissement" && (
                  <section className="mt-4 rounded-2xl border border-dj-bordure bg-dj-surface p-5">
                    <h2 className="font-display text-base font-semibold text-dj-texte">
                      Diffuser un document
                    </h2>
                    <p className="mt-1 text-xs text-dj-texte-muet">
                      Ajouté d'un coup à la bibliothèque de tes enseignants et de leurs étudiants.
                    </p>
                    <input
                      type="file"
                      onChange={(e) => setFichierDiffusion(e.target.files?.[0] ?? null)}
                      className="mt-2 block w-full text-sm text-dj-texte-muet file:mr-3 file:rounded-full file:border-0 file:bg-dj-surface-haute file:px-3 file:py-1.5 file:text-xs file:text-dj-texte"
                    />
                    <input
                      value={descriptionDiffusion}
                      onChange={(e) => setDescriptionDiffusion(e.target.value)}
                      placeholder="Description (pour que l'IA sache le retrouver)"
                      className="mt-2 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
                    />
                    {resultatDiffusion && (
                      <p className="mt-2 animate-dj-fade-in-rapide text-sm text-dj-accent-1">
                        Diffusé à {resultatDiffusion.diffuse_a}/{resultatDiffusion.total_cibles} personnes.
                        {resultatDiffusion.echecs.length > 0 && (
                          <> Échec pour : {resultatDiffusion.echecs.join(", ")}.</>
                        )}
                      </p>
                    )}
                    <button
                      onClick={diffuserDocument}
                      disabled={!fichierDiffusion || !descriptionDiffusion.trim() || diffusionEnCours}
                      className="mt-2 rounded-full bg-dj-gradient px-4 py-1.5 text-sm font-bold text-[#1A0D02] transition-opacity disabled:opacity-50"
                    >
                      {diffusionEnCours ? "Diffusion…" : "Diffuser à tout le monde"}
                    </button>
                  </section>
                )}
              </>
            )}

            {onglet === "contacts" && contactActif && (
              <section className="mt-4 animate-dj-fade-in-rapide rounded-2xl border border-dj-bordure bg-dj-surface p-5">
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

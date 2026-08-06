"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TopBar } from "@/components/TopBar";
import { BoutonRetour } from "@/components/BoutonRetour";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { MATIERES } from "@/lib/matieres";
import {
  lireMesContenusMatiere,
  ecrireContenuMatiere,
  lireMesRattachements,
  entrerCodeMatiere,
  activerRattachementMatiere,
  type ContenuMatiere,
  type Rattachement,
} from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";

// Page "Matières" de l'agent "Nitrux" (06/08/2026, demande Bourama) :
// n'importe quel compte connecté peut, sur cet agent précis, écrire du
// contenu pour une matière (= "enseignant" pour cette matière, obtient
// un code à partager) ET/OU entrer un code reçu (= "étudiant" pour la
// matière correspondante). Les deux blocs sont donc toujours visibles
// ensemble, pas de choix de rôle à faire à l'avance.

export default function PageMatieresAgent() {
  const params = useParams<{ id: string }>();
  const agentId = params.id;
  const router = useRouter();

  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined
  >(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push(`/connexion?retour=/agent/${agentId}/matieres`);
        return;
      }
      setSession(session);
    });
  }, [router, agentId]);

  const [mesContenus, setMesContenus] = useState<ContenuMatiere[] | null>(null);
  const [rattachements, setRattachements] = useState<Rattachement[] | null>(null);

  function rafraichir() {
    lireMesContenusMatiere(agentId)
      .then(setMesContenus)
      .catch(() => setMesContenus([]));
    lireMesRattachements(agentId)
      .then(setRattachements)
      .catch(() => setRattachements([]));
  }

  useEffect(() => {
    if (!session) return;
    rafraichir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, agentId]);

  // --- Bloc enseignant ---
  const [matiereChoisie, setMatiereChoisie] = useState<string>(MATIERES[0]);
  const [texteContenu, setTexteContenu] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurEnseignant, setErreurEnseignant] = useState<string | null>(null);

  function chargerPourEdition(c: ContenuMatiere) {
    setMatiereChoisie(c.matiere);
    setTexteContenu(c.system_prompt);
  }

  async function enregistrerContenu() {
    if (!texteContenu.trim()) return;
    setEnregistrement(true);
    setErreurEnseignant(null);
    try {
      await ecrireContenuMatiere(agentId, matiereChoisie, texteContenu.trim());
      rafraichir();
    } catch (e) {
      setErreurEnseignant(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  // --- Bloc étudiant ---
  const [code, setCode] = useState("");
  const [validationCode, setValidationCode] = useState(false);
  const [erreurCode, setErreurCode] = useState<string | null>(null);
  const [messageCode, setMessageCode] = useState<string | null>(null);
  const [bascule, setBascule] = useState<string | null>(null);

  async function validerCode() {
    if (!code.trim()) return;
    setValidationCode(true);
    setErreurCode(null);
    setMessageCode(null);
    try {
      const rattachement = await entrerCodeMatiere(agentId, code.trim());
      setCode("");
      setMessageCode(`${rattachement.matiere} débloquée avec ${rattachement.enseignant_nom}.`);
      rafraichir();
    } catch (e) {
      setErreurCode(messageErreur(e));
    } finally {
      setValidationCode(false);
    }
  }

  async function activer(contenuId: string) {
    setBascule(contenuId);
    try {
      await activerRattachementMatiere(agentId, contenuId);
      rafraichir();
    } catch (e) {
      setErreurCode(messageErreur(e));
    } finally {
      setBascule(null);
    }
  }

  if (session === undefined) {
    return (
      <>
        <TopBar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-dj-texte-muet">Chargement…</p>
        </div>
      </>
    );
  }

  // Matières avec plusieurs rattachements (donc plusieurs enseignants) :
  // seules celles-là ont besoin du bouton de bascule.
  const matieresParGroupe = new Map<string, Rattachement[]>();
  for (const r of rattachements || []) {
    matieresParGroupe.set(r.matiere, [...(matieresParGroupe.get(r.matiere) || []), r]);
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-10">
        <div className="flex items-center gap-3">
          <BoutonRetour />
          <BoutonAccueil />
        </div>

        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold text-dj-texte">
            <GraduationCap size={22} className="text-dj-accent-1" />
            Matières
          </h1>
          <p className="mt-2 text-sm text-dj-texte-muet">
            Écris du contenu pour une matière et partage le code généré à tes étudiants, ou entre
            un code que tu as reçu pour débloquer une matière.
          </p>
        </div>

        {/* Bloc enseignant */}
        <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure p-5">
          <h2 className="font-semibold text-dj-texte">Écrire une matière</h2>

          {mesContenus && mesContenus.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mesContenus.map((c) => (
                <button
                  key={c.id}
                  onClick={() => chargerPourEdition(c)}
                  className="rounded-full border border-dj-bordure px-3 py-1 text-xs text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
                >
                  {c.matiere} · code {c.code}
                </button>
              ))}
            </div>
          )}

          <select
            value={matiereChoisie}
            onChange={(e) => {
              setMatiereChoisie(e.target.value);
              const existant = (mesContenus || []).find((c) => c.matiere === e.target.value);
              setTexteContenu(existant?.system_prompt || "");
            }}
            className="rounded-xl border border-dj-bordure bg-transparent px-3 py-2 text-sm text-dj-texte"
          >
            {MATIERES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <textarea
            value={texteContenu}
            onChange={(e) => setTexteContenu(e.target.value)}
            placeholder="Ce que l'IA doit savoir et comment elle doit enseigner cette matière…"
            rows={8}
            className="rounded-xl border border-dj-bordure bg-transparent px-3 py-2 text-sm text-dj-texte"
          />

          {erreurEnseignant && <p className="text-sm text-red-500">{erreurEnseignant}</p>}

          <button
            onClick={enregistrerContenu}
            disabled={enregistrement || !texteContenu.trim()}
            className="self-start rounded-xl bg-dj-accent-1 px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          >
            {enregistrement ? "Enregistrement…" : "Enregistrer et générer le code"}
          </button>
        </section>

        {/* Bloc étudiant */}
        <section className="flex flex-col gap-4 rounded-2xl border border-dj-bordure p-5">
          <h2 className="font-semibold text-dj-texte">Entrer un code</h2>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && !validationCode && validerCode()}
              placeholder="CODE"
              className="flex-1 rounded-xl border border-dj-bordure bg-transparent px-3 py-2 text-sm uppercase tracking-widest text-dj-texte"
            />
            <button
              onClick={validerCode}
              disabled={validationCode || !code.trim()}
              className="rounded-xl border border-dj-bordure px-4 py-2 text-sm font-medium text-dj-texte transition-opacity disabled:opacity-50"
            >
              {validationCode ? "Validation…" : "Valider"}
            </button>
          </div>

          {erreurCode && <p className="text-sm text-red-500">{erreurCode}</p>}
          {messageCode && <p className="text-sm text-green-600">{messageCode}</p>}

          {matieresParGroupe.size > 0 && (
            <div className="flex flex-col gap-3">
              {[...matieresParGroupe.entries()].map(([matiere, groupe]) => (
                <div key={matiere} className="rounded-xl border border-dj-bordure p-3">
                  <p className="mb-2 text-sm font-medium text-dj-texte">{matiere}</p>
                  <ul className="flex flex-col gap-1">
                    {groupe.map((r) => (
                      <li key={r.contenu_id} className="flex items-center justify-between gap-2 text-sm">
                        <span className={r.actif ? "text-dj-texte" : "text-dj-texte-muet"}>
                          {r.enseignant_nom} {r.actif && "· actif"}
                        </span>
                        {!r.actif && (
                          <button
                            onClick={() => activer(r.contenu_id)}
                            disabled={bascule === r.contenu_id}
                            className="text-xs text-dj-accent-1 underline disabled:opacity-50"
                          >
                            {bascule === r.contenu_id ? "…" : "Utiliser celui-ci"}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

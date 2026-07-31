"use client";

import { useEffect, useState } from "react";
import { lireDroitsAgent, modifierDroitsAgent } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";

// Formulaire des droits d'un agent -- categories 1 (generation, par
// outil), 2 et 3 (serveur externe, par serveur entier). Voir
// api/droits_agent.py cote backend et migration_droits_agents.sql pour
// le schema. Categories 4/5 (connexion OAuth du createur / de la
// plateforme) pas couvertes ici, a construire separement sur le meme
// pattern que connexions/notion.py.
//
// Principe important : les cases proposees viennent TOUJOURS de
// registre_outils_plateforme en direct (jamais une liste figee ici) --
// un outil retire cote plateforme disparait automatiquement du
// formulaire au prochain chargement, sans rien a changer dans ce
// fichier.

type OutilPlateforme = {
  nom_outil: string;
  categorie: number;
  nom_serveur: string;
  disponible: boolean;
  coche: boolean;
};

type DroitsAgentReponse = {
  generation: OutilPlateforme[];
  serveurs: OutilPlateforme[];
  actions_locales: OutilPlateforme[];
};

// Voir même dict dans DroitsAgentCreation.tsx -- pas d'outil LLM, juste
// des boutons UI dans la barre de saisie du chat.
const LIBELLES_ACTIONS_LOCALES: Record<string, string> = {
  ui_localisation: "Joindre la position de l'utilisateur",
  ui_formule: "Clavier formule / LaTeX",
  ui_recherche: "Bouton \"forcer une recherche web\"",
  ui_dessin: "Dessin (géométrie, graphe, croquis)",
  ui_mode_vocal: "Mode vocal",
};

export function DroitsAgent({ agentId }: { agentId: string }) {
  const [droits, setDroits] = useState<DroitsAgentReponse | null>(null);
  const [genererCoches, setGenererCoches] = useState<Set<string>>(new Set());
  const [serveursCoches, setServeursCoches] = useState<Set<string>>(new Set());
  const [actionsLocalesCoches, setActionsLocalesCoches] = useState<Set<string>>(new Set());
  const [informerUtilisateurs, setInformerUtilisateurs] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [messageSucces, setMessageSucces] = useState<string | null>(null);

  useEffect(() => {
    lireDroitsAgent(agentId)
      .then((reponse: DroitsAgentReponse) => {
        setDroits(reponse);
        setGenererCoches(new Set(reponse.generation.filter((o) => o.coche).map((o) => o.nom_outil)));
        setServeursCoches(new Set(reponse.serveurs.filter((o) => o.coche).map((o) => o.nom_serveur)));
        setActionsLocalesCoches(new Set(reponse.actions_locales.filter((o) => o.coche).map((o) => o.nom_outil)));
      })
      .catch((e) => setErreur(messageErreur(e)));
  }, [agentId]);

  function basculerGeneration(nomOutil: string) {
    setGenererCoches((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(nomOutil)) suivant.delete(nomOutil);
      else suivant.add(nomOutil);
      return suivant;
    });
  }

  function basculerServeur(nomServeur: string) {
    setServeursCoches((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(nomServeur)) suivant.delete(nomServeur);
      else suivant.add(nomServeur);
      return suivant;
    });
  }

  function basculerActionLocale(nomAction: string) {
    setActionsLocalesCoches((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(nomAction)) suivant.delete(nomAction);
      else suivant.add(nomAction);
      return suivant;
    });
  }

  async function enregistrer() {
    setEnregistrement(true);
    setErreur(null);
    setMessageSucces(null);
    try {
      const resultat = await modifierDroitsAgent(agentId, {
        outils_generation: Array.from(genererCoches),
        serveurs: Array.from(serveursCoches),
        actions_locales: Array.from(actionsLocalesCoches),
        informer_utilisateurs: informerUtilisateurs,
      });
      setMessageSucces(
        resultat?.a_change
          ? "Droits enregistrés. Tes utilisateurs ont été informés du changement."
          : "Droits enregistrés (aucun changement détecté)."
      );
    } catch (e: any) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  if (erreur && !droits) {
    return <p className="text-sm text-red-500">{erreur}</p>;
  }
  if (!droits) {
    return <p className="text-sm text-neutral-500">Chargement des droits…</p>;
  }

  // Regroupe la categorie 2/3 par serveur (une seule ligne registre par
  // serveur aujourd'hui, mais le regroupement protege si un jour un
  // serveur a plusieurs lignes).
  const serveursParNom = new Map<string, OutilPlateforme>();
  for (const s of droits.serveurs) serveursParNom.set(s.nom_serveur, s);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-semibold mb-2">Génération (documents, images, audio, vidéo…)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {droits.generation.map((outil) => (
            <label
              key={outil.nom_outil}
              className={`flex items-center gap-2 text-sm ${!outil.disponible ? "opacity-40" : ""}`}
            >
              <input
                type="checkbox"
                disabled={!outil.disponible}
                checked={genererCoches.has(outil.nom_outil)}
                onChange={() => basculerGeneration(outil.nom_outil)}
              />
              {outil.nom_outil}
              {!outil.disponible && <span className="text-xs text-neutral-400">(indisponible)</span>}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Outils externes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Array.from(serveursParNom.values()).map((serveur) => (
            <label
              key={serveur.nom_serveur}
              className={`flex items-center gap-2 text-sm ${!serveur.disponible ? "opacity-40" : ""}`}
            >
              <input
                type="checkbox"
                disabled={!serveur.disponible}
                checked={serveursCoches.has(serveur.nom_serveur)}
                onChange={() => basculerServeur(serveur.nom_serveur)}
              />
              {serveur.nom_serveur}
              {serveur.categorie === 3 && (
                <span className="text-xs text-neutral-400">(compte utilisateur requis)</span>
              )}
              {!serveur.disponible && <span className="text-xs text-neutral-400">(indisponible)</span>}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Actions locales (chat)</h3>
        <p className="mb-2 text-xs text-neutral-500">
          Ne sont pas envoyées au LLM, uniquement des boutons affichés dans la barre de saisie du chat.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {droits.actions_locales.map((action) => (
            <label
              key={action.nom_outil}
              className={`flex items-center gap-2 text-sm ${!action.disponible ? "opacity-40" : ""}`}
            >
              <input
                type="checkbox"
                disabled={!action.disponible}
                checked={actionsLocalesCoches.has(action.nom_outil)}
                onChange={() => basculerActionLocale(action.nom_outil)}
              />
              {LIBELLES_ACTIONS_LOCALES[action.nom_outil] || action.nom_outil}
              {!action.disponible && <span className="text-xs text-neutral-400">(indisponible)</span>}
            </label>
          ))}
        </div>
      </section>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={informerUtilisateurs}
          onChange={(e) => setInformerUtilisateurs(e.target.checked)}
        />
        Informer mes utilisateurs de ce changement
      </label>

      <button
        type="button"
        onClick={enregistrer}
        disabled={enregistrement}
        className="px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-50"
      >
        {enregistrement ? "Enregistrement…" : "Enregistrer les droits"}
      </button>

      {erreur && <p className="text-sm text-red-500">{erreur}</p>}
      {messageSucces && <p className="text-sm text-green-600">{messageSucces}</p>}
    </div>
  );
}

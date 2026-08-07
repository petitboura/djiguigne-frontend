"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Correctif du 07/08/2026 (bug remonté par Bourama : "je me connecte
// depuis la vitrine, je suis envoyé dans l'app, ma connexion n'est pas
// transférée"). Cause : djiguigne-ai (vitrine) et djiguigne-frontend
// (app) sont deux domaines Vercel distincts -- le localStorage où
// supabase-js stocke la session est isolé par domaine, donc une simple
// redirection HTTP entre les deux ne transporte aucune session.
//
// Émission côté vitrine : djiguigne-ai/lib/lienApp.ts attache la session
// active dans le HASH de l'URL cible (#access_token=...&refresh_token=...)
// avant toute redirection vers l'app -- jamais en query, pour que les
// jetons ne soient jamais envoyés au serveur (logs, Referer).
//
// Réception ici : au tout premier rendu de l'app, si ce hash est présent,
// on restaure la session Supabase à partir de ces jetons, puis on nettoie
// l'URL pour ne pas laisser les jetons traîner dans l'historique du
// navigateur. Monté une seule fois dans app/layout.tsx (racine), donc
// actif quelle que soit la page d'entrée depuis la vitrine.
export function SessionSyncVitrine() {
  useEffect(() => {
    if (!window.location.hash) return;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;

    // ancre (07/08/2026) : certains liens de la vitrine (notifications
    // "mise à jour") portent une ancre native en plus des jetons -- voir
    // djiguigne-ai/lib/lienApp.ts pour l'émission. Une fois les jetons
    // consommés, on la restaure pour que le navigateur défile jusqu'à la
    // bonne section au lieu de la perdre.
    const ancre = params.get("ancre");

    supabase.auth.setSession({ access_token, refresh_token }).finally(() => {
      const url = new URL(window.location.href);
      url.hash = ancre || "";
      window.history.replaceState({}, "", url.toString());
      if (ancre) {
        document.getElementById(ancre)?.scrollIntoView({ behavior: "smooth" });
      }
    });
  }, []);

  return null;
}
